// lib/roadmapTracker.js
import { db } from './database.js';
import Constants from './constants.js';

/**
 * Roadmap Tracker - Manages development phase and task tracking
 * Automatically updates Discord channels with progress
 */
class RoadmapTracker {
    constructor() {
        this.db = null;
    }

    /**
     * Initialize the roadmap tracker with database connection
     */
    async init() {
        this.db = await db.database();
    }

    /**
     * Initialize roadmap data from phase tracker files
     * This should be run once to populate the database from our documentation
     */
    async initializeRoadmapData() {
        const phases = [
            {
                phaseId: 'phase-0',
                title: 'Foundation',
                description: 'Core Infrastructure & Basic Functionality',
                status: 'completed',
                startDate: new Date('2025-08-01'),
                completedDate: new Date('2025-09-01'),
                priority: 'high',
                dependencies: [],
                objectives: [
                    'Discord bot setup with ES modules',
                    'MongoDB integration',
                    'Basic verification system',
                    'Shopify webhook integration',
                    'Production deployment with auto-deployment',
                    'SSL and security implementation'
                ]
            },
            {
                phaseId: 'phase-1',
                title: 'GEMS Currency System',
                description: 'Implement the core economy system',
                status: 'in-planning',
                startDate: new Date('2025-09-14'),
                targetDate: new Date('2025-10-01'),
                priority: 'high',
                dependencies: ['phase-0'],
                objectives: [
                    'GEMS database schema design',
                    'Basic earning mechanisms',
                    'Balance tracking and commands',
                    'Anti-abuse systems',
                    'Testing framework'
                ]
            },
            {
                phaseId: 'phase-2',
                title: 'Advanced Verification System',
                description: 'Photo-based jewelry verification',
                status: 'planned',
                priority: 'high',
                dependencies: ['phase-1'],
                objectives: [
                    'Upload system for jewelry photos',
                    'Moderator approval workflow',
                    'Advanced collector tiers',
                    'Integration with GEMS rewards'
                ]
            },
            {
                phaseId: 'phase-3',
                title: 'Spotlight System',
                description: 'Weekly member recognition',
                status: 'planned',
                priority: 'medium',
                dependencies: ['phase-1'],
                objectives: [
                    'Automated weekly spotlights',
                    'Random verified member selection',
                    'Rich embed generation',
                    'GEMS integration for spotlighted users'
                ]
            },
            {
                phaseId: 'phase-4',
                title: 'Role Progression System',
                description: 'Dynamic role advancement',
                status: 'planned',
                priority: 'medium',
                dependencies: ['phase-1'],
                objectives: [
                    'Message counting and activity tracking',
                    'Automated role assignments',
                    'Specialization role logic',
                    'Passive GEMS multipliers'
                ]
            },
            {
                phaseId: 'phase-5',
                title: 'Social Media Integration',
                description: 'Cross-platform engagement',
                status: 'planned',
                priority: 'medium',
                dependencies: ['phase-1'],
                objectives: [
                    'Instagram/TikTok API integration',
                    'Auto-sync to Discord channels',
                    'Engagement reward tracking',
                    'Social leaderboards'
                ]
            },
            {
                phaseId: 'phase-6',
                title: 'Marketplace & Advanced Features',
                description: 'Community marketplace and NFT integration',
                status: 'planned',
                priority: 'low',
                dependencies: ['phase-1', 'phase-2', 'phase-3'],
                objectives: [
                    'Collector marketplace',
                    'NFT wallet verification',
                    'Advanced event systems',
                    'Mentorship program'
                ]
            }
        ];

        // Insert phases into database
        for (const phase of phases) {
            await this.createOrUpdatePhase(phase);
        }

        console.log('✅ Roadmap data initialized successfully');
    }

    /**
     * Create or update a phase in the database
     */
    async createOrUpdatePhase(phaseData) {
        const collection = this.db.collection(Constants.ROADMAP_PHASES_COLLECTION);
        
        await collection.replaceOne(
            { phaseId: phaseData.phaseId },
            {
                ...phaseData,
                updatedAt: new Date(),
                createdAt: phaseData.createdAt || new Date()
            },
            { upsert: true }
        );
    }

    /**
     * Get all phases with their current status
     */
    async getAllPhases() {
        const collection = this.db.collection(Constants.ROADMAP_PHASES_COLLECTION);
        return await collection.find({}).sort({ phaseId: 1 }).toArray();
    }

    /**
     * Get a specific phase by ID
     */
    async getPhase(phaseId) {
        const collection = this.db.collection(Constants.ROADMAP_PHASES_COLLECTION);
        return await collection.findOne({ phaseId });
    }

    /**
     * Update phase status
     */
    async updatePhaseStatus(phaseId, status, additionalData = {}) {
        const collection = this.db.collection(Constants.ROADMAP_PHASES_COLLECTION);
        
        const updateData = {
            status,
            updatedAt: new Date(),
            ...additionalData
        };

        if (status === 'completed') {
            updateData.completedDate = new Date();
        } else if (status === 'in-progress') {
            updateData.startDate = updateData.startDate || new Date();
        }

        await collection.updateOne(
            { phaseId },
            { $set: updateData }
        );

        // Log the update
        await this.logUpdate(phaseId, `Phase status changed to: ${status}`);
    }

    /**
     * Log a roadmap update
     */
    async logUpdate(phaseId, message, type = 'status_change') {
        const collection = this.db.collection(Constants.ROADMAP_UPDATES_COLLECTION);
        
        await collection.insertOne({
            phaseId,
            type,
            message,
            timestamp: new Date()
        });
    }

    /**
     * Get recent roadmap updates
     */
    async getRecentUpdates(limit = 10) {
        const collection = this.db.collection(Constants.ROADMAP_UPDATES_COLLECTION);
        return await collection.find({})
            .sort({ timestamp: -1 })
            .limit(limit)
            .toArray();
    }

    /**
     * Calculate phase progress percentage
     */
    async calculatePhaseProgress(phaseId) {
        const tasksCollection = this.db.collection(Constants.ROADMAP_TASKS_COLLECTION);
        const totalTasks = await tasksCollection.countDocuments({ phaseId });
        const completedTasks = await tasksCollection.countDocuments({ 
            phaseId, 
            status: 'completed' 
        });

        if (totalTasks === 0) return 0;
        return Math.round((completedTasks / totalTasks) * 100);
    }

    /**
     * Get overall roadmap statistics
     */
    async getRoadmapStats() {
        const phases = await this.getAllPhases();
        
        const stats = {
            totalPhases: phases.length,
            completedPhases: phases.filter(p => p.status === 'completed').length,
            inProgressPhases: phases.filter(p => p.status === 'in-progress' || p.status === 'in-planning').length,
            plannedPhases: phases.filter(p => p.status === 'planned').length
        };

        stats.overallProgress = Math.round((stats.completedPhases / stats.totalPhases) * 100);

        return stats;
    }

    /**
     * Generate roadmap embed for Discord
     */
    async generateRoadmapEmbed() {
        const phases = await this.getAllPhases();
        const stats = await this.getRoadmapStats();

        const embed = {
            title: '🗺️ EFD Bot Development Roadmap',
            description: `**Overall Progress: ${stats.overallProgress}%**\n\`\`\`${this.generateProgressBar(stats.overallProgress)}\`\`\``,
            color: 0x3498db,
            thumbnail: {
                url: 'https://cdn.discordapp.com/emojis/1234567890123456789.png' // Replace with actual emoji/image
            },
            fields: [],
            footer: {
                text: `${stats.completedPhases}/${stats.totalPhases} phases completed • Last updated`,
                icon_url: 'https://cdn.discordapp.com/emojis/1234567890123456789.png'
            },
            timestamp: new Date().toISOString()
        };

        // Add phase fields
        for (const phase of phases) {
            const progress = await this.calculatePhaseProgress(phase.phaseId);
            const statusEmoji = this.getStatusEmoji(phase.status);
            const progressBar = this.generateProgressBar(progress, 15);

            embed.fields.push({
                name: `${statusEmoji} ${phase.title}`,
                value: `${phase.description}\n\`${progressBar}\` ${progress}%`,
                inline: false
            });
        }

        return embed;
    }

    /**
     * Generate progress bar string
     */
    generateProgressBar(percentage, length = 20) {
        const filled = Math.round((percentage / 100) * length);
        const empty = length - filled;
        return '█'.repeat(filled) + '░'.repeat(empty);
    }

    /**
     * Get status emoji for phase status
     */
    getStatusEmoji(status) {
        const emojis = {
            'completed': '✅',
            'in-progress': '🚧',
            'in-planning': '📋',
            'planned': '📅',
            'on-hold': '⏸️',
            'cancelled': '❌'
        };
        return emojis[status] || '❓';
    }

    /**
     * Generate announcement embed for completed phases
     */
    async generatePhaseCompletionEmbed(phaseId) {
        const phase = await this.getPhase(phaseId);
        if (!phase) return null;

        return {
            title: '🎉 Phase Completed!',
            description: `**${phase.title}** has been completed and is now live!`,
            color: 0x00ff00,
            fields: [
                {
                    name: '📋 What was delivered:',
                    value: phase.objectives.map(obj => `• ${obj}`).join('\n'),
                    inline: false
                },
                {
                    name: '🚀 What this means for you:',
                    value: 'New features are now available! Check the commands list and start exploring.',
                    inline: false
                }
            ],
            footer: {
                text: 'Thank you for your patience during development!'
            },
            timestamp: new Date().toISOString()
        };
    }
}

export default RoadmapTracker;