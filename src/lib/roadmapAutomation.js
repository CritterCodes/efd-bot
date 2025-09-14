// lib/roadmapAutomation.js
import RoadmapTracker from './roadmapTracker.js';
import { db } from './database.js';
import Constants from './constants.js';

/**
 * Roadmap Automation - Handles automatic updates and announcements
 */
class RoadmapAutomation {
    constructor(client) {
        this.client = client;
        this.roadmapTracker = new RoadmapTracker();
        this.settings = {
            roadmapChannelId: null,
            announcementsChannelId: null,
            autoUpdateEnabled: false
        };
    }

    /**
     * Initialize the automation system
     */
    async init() {
        await this.roadmapTracker.init();
        await this.loadSettings();
        this.setupEventListeners();
        console.log('✅ Roadmap automation initialized');
    }

    /**
     * Load automation settings from database
     */
    async loadSettings() {
        try {
            const database = await db.database();
            const settingsCollection = database.collection(Constants.ADMIN_SETTINGS_COLLECTION);
            
            const settings = await settingsCollection.findOne({ type: 'roadmap_automation' });
            if (settings) {
                this.settings = { ...this.settings, ...settings.config };
            }
        } catch (error) {
            console.warn('Could not load roadmap automation settings:', error.message);
        }
    }

    /**
     * Save automation settings to database
     */
    async saveSettings() {
        try {
            const database = await db.database();
            const settingsCollection = database.collection(Constants.ADMIN_SETTINGS_COLLECTION);
            
            await settingsCollection.replaceOne(
                { type: 'roadmap_automation' },
                {
                    type: 'roadmap_automation',
                    config: this.settings,
                    updatedAt: new Date()
                },
                { upsert: true }
            );
        } catch (error) {
            console.error('Error saving roadmap automation settings:', error);
        }
    }

    /**
     * Configure automation settings
     */
    async configure(roadmapChannelId, announcementsChannelId = null) {
        this.settings.roadmapChannelId = roadmapChannelId;
        this.settings.announcementsChannelId = announcementsChannelId;
        this.settings.autoUpdateEnabled = true;
        
        await this.saveSettings();
        
        // Post initial roadmap
        await this.updateRoadmapDisplay();
    }

    /**
     * Set up event listeners for automatic updates
     */
    setupEventListeners() {
        // Listen for phase status changes
        this.client.on('roadmapPhaseUpdate', async (data) => {
            await this.handlePhaseUpdate(data);
        });

        // Listen for task completions
        this.client.on('roadmapTaskComplete', async (data) => {
            await this.handleTaskCompletion(data);
        });
    }

    /**
     * Handle phase status updates
     */
    async handlePhaseUpdate(data) {
        const { phaseId, oldStatus, newStatus, notes } = data;
        
        // Update roadmap display
        await this.updateRoadmapDisplay();
        
        // If phase was completed, send announcement
        if (newStatus === 'completed' && this.settings.announcementsChannelId) {
            await this.announcePhaseCompletion(phaseId);
        }
        
        // Log the update
        await this.roadmapTracker.logUpdate(
            phaseId, 
            `Status changed from ${oldStatus} to ${newStatus}${notes ? `: ${notes}` : ''}`,
            'automated_update'
        );
    }

    /**
     * Handle individual task completions
     */
    async handleTaskCompletion(data) {
        const { phaseId, taskId, taskTitle } = data;
        
        // Update roadmap display with new progress
        await this.updateRoadmapDisplay();
        
        // Log the task completion
        await this.roadmapTracker.logUpdate(
            phaseId,
            `Task completed: ${taskTitle}`,
            'task_completion'
        );
        
        // Check if this task completion means the phase is done
        await this.checkPhaseCompletion(phaseId);
    }

    /**
     * Update the roadmap display in the designated channel
     */
    async updateRoadmapDisplay() {
        if (!this.settings.autoUpdateEnabled || !this.settings.roadmapChannelId) {
            return;
        }

        try {
            const channel = await this.client.channels.fetch(this.settings.roadmapChannelId);
            if (!channel) {
                console.warn('Roadmap channel not found');
                return;
            }

            // Get or create the roadmap message
            const roadmapMessage = await this.findOrCreateRoadmapMessage(channel);
            
            // Generate updated embed
            const embed = await this.roadmapTracker.generateRoadmapEmbed();
            
            // Add last updated timestamp
            embed.footer = {
                ...embed.footer,
                text: `${embed.footer.text} • Auto-updated`
            };

            // Update the message
            await roadmapMessage.edit({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error updating roadmap display:', error);
        }
    }

    /**
     * Find existing roadmap message or create a new one
     */
    async findOrCreateRoadmapMessage(channel) {
        // Look for existing roadmap message (pinned message with roadmap embed)
        const messages = await channel.messages.fetch({ limit: 50 });
        const existingMessage = messages.find(msg => 
            msg.author.id === this.client.user.id &&
            msg.embeds.length > 0 &&
            msg.embeds[0].title?.includes('Development Roadmap')
        );

        if (existingMessage) {
            return existingMessage;
        }

        // Create new roadmap message
        const embed = await this.roadmapTracker.generateRoadmapEmbed();
        const newMessage = await channel.send({ embeds: [embed] });
        
        // Pin the message
        try {
            await newMessage.pin();
        } catch (error) {
            console.warn('Could not pin roadmap message:', error.message);
        }

        return newMessage;
    }

    /**
     * Announce phase completion
     */
    async announcePhaseCompletion(phaseId) {
        if (!this.settings.announcementsChannelId) {
            return;
        }

        try {
            const channel = await this.client.channels.fetch(this.settings.announcementsChannelId);
            if (!channel) {
                console.warn('Announcements channel not found');
                return;
            }

            const embed = await this.roadmapTracker.generatePhaseCompletionEmbed(phaseId);
            if (!embed) {
                console.warn('Could not generate completion embed for phase:', phaseId);
                return;
            }

            await channel.send({
                content: '🎉 **New Features Available!** @everyone',
                embeds: [embed]
            });

        } catch (error) {
            console.error('Error announcing phase completion:', error);
        }
    }

    /**
     * Check if a phase should be marked as completed
     */
    async checkPhaseCompletion(phaseId) {
        const progress = await this.roadmapTracker.calculatePhaseProgress(phaseId);
        const phase = await this.roadmapTracker.getPhase(phaseId);
        
        // If progress is 100% and phase isn't already completed
        if (progress === 100 && phase.status !== 'completed') {
            // Emit event for phase completion
            this.client.emit('roadmapPhaseUpdate', {
                phaseId,
                oldStatus: phase.status,
                newStatus: 'completed',
                notes: 'Automatically completed - all tasks finished'
            });
        }
    }

    /**
     * Trigger a manual update of the roadmap display
     */
    async triggerUpdate() {
        await this.updateRoadmapDisplay();
    }

    /**
     * Get automation status
     */
    getStatus() {
        return {
            enabled: this.settings.autoUpdateEnabled,
            roadmapChannel: this.settings.roadmapChannelId,
            announcementsChannel: this.settings.announcementsChannelId
        };
    }
}

export default RoadmapAutomation;