// commands/roadmap-admin.js
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import RoadmapTracker from '../lib/roadmapTracker.js';

const roadmapTracker = new RoadmapTracker();

export default {
    data: new SlashCommandBuilder()
        .setName('roadmap-admin')
        .setDescription('Administrative commands for roadmap management')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('init')
                .setDescription('Initialize roadmap data from documentation')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('update-phase')
                .setDescription('Update a phase status')
                .addStringOption(option =>
                    option
                        .setName('phase_id')
                        .setDescription('Phase ID to update')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Phase 0: Foundation', value: 'phase-0' },
                            { name: 'Phase 1: GEMS Currency', value: 'phase-1' },
                            { name: 'Phase 2: Advanced Verification', value: 'phase-2' },
                            { name: 'Phase 3: Spotlight System', value: 'phase-3' },
                            { name: 'Phase 4: Role Progression', value: 'phase-4' },
                            { name: 'Phase 5: Social Media Integration', value: 'phase-5' },
                            { name: 'Phase 6: Marketplace & Advanced', value: 'phase-6' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('status')
                        .setDescription('New status for the phase')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Planned', value: 'planned' },
                            { name: 'In Planning', value: 'in-planning' },
                            { name: 'In Progress', value: 'in-progress' },
                            { name: 'Completed', value: 'completed' },
                            { name: 'On Hold', value: 'on-hold' },
                            { name: 'Cancelled', value: 'cancelled' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('notes')
                        .setDescription('Optional notes about the status change')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('post-roadmap')
                .setDescription('Post the roadmap to a specific channel')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to post the roadmap in')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('announce-completion')
                .setDescription('Announce phase completion')
                .addStringOption(option =>
                    option
                        .setName('phase_id')
                        .setDescription('Phase that was completed')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Phase 0: Foundation', value: 'phase-0' },
                            { name: 'Phase 1: GEMS Currency', value: 'phase-1' },
                            { name: 'Phase 2: Advanced Verification', value: 'phase-2' },
                            { name: 'Phase 3: Spotlight System', value: 'phase-3' },
                            { name: 'Phase 4: Role Progression', value: 'phase-4' },
                            { name: 'Phase 5: Social Media Integration', value: 'phase-5' },
                            { name: 'Phase 6: Marketplace & Advanced', value: 'phase-6' }
                        )
                )
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to post the announcement (default: announcements)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup-auto-updates')
                .setDescription('Set up automatic roadmap updates in a channel')
                .addChannelOption(option =>
                    option
                        .setName('roadmap_channel')
                        .setDescription('Channel for roadmap updates')
                        .setRequired(true)
                )
                .addChannelOption(option =>
                    option
                        .setName('announcements_channel')
                        .setDescription('Channel for phase completion announcements')
                        .setRequired(false)
                )
        ),

    async execute(interaction) {
        await roadmapTracker.init();
        
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'init':
                await handleInitRoadmap(interaction);
                break;
            case 'update-phase':
                await handleUpdatePhase(interaction);
                break;
            case 'post-roadmap':
                await handlePostRoadmap(interaction);
                break;
            case 'announce-completion':
                await handleAnnounceCompletion(interaction);
                break;
            case 'setup-auto-updates':
                await handleSetupAutoUpdates(interaction);
                break;
        }
    },
};

async function handleInitRoadmap(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });

        await roadmapTracker.initializeRoadmapData();

        const embed = {
            title: '✅ Roadmap Initialized',
            description: 'Roadmap data has been successfully initialized from documentation files.',
            color: 0x00ff00,
            fields: [
                {
                    name: '📋 What happened:',
                    value: '• Loaded all 7 phases into database\n• Set current status for each phase\n• Created tracking infrastructure',
                    inline: false
                },
                {
                    name: '🚀 Next steps:',
                    value: '• Use `/roadmap-admin post-roadmap` to display roadmap\n• Set up auto-updates with `/roadmap-admin setup-auto-updates`',
                    inline: false
                }
            ],
            timestamp: new Date()
        };

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error initializing roadmap:', error);
        await interaction.editReply({
            content: '❌ Failed to initialize roadmap data. Please check the console for errors.',
            ephemeral: true
        });
    }
}

async function handleUpdatePhase(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });

        const phaseId = interaction.options.getString('phase_id');
        const status = interaction.options.getString('status');
        const notes = interaction.options.getString('notes');

        const phase = await roadmapTracker.getPhase(phaseId);
        if (!phase) {
            await interaction.editReply({
                content: '❌ Phase not found.',
                ephemeral: true
            });
            return;
        }

        const oldStatus = phase.status;
        await roadmapTracker.updatePhaseStatus(phaseId, status);

        if (notes) {
            await roadmapTracker.logUpdate(phaseId, notes, 'manual_update');
        }

        // Trigger automation update
        if (interaction.client.roadmapAutomation) {
            interaction.client.emit('roadmapPhaseUpdate', {
                phaseId,
                oldStatus,
                newStatus: status,
                notes
            });
        }

        const statusEmoji = roadmapTracker.getStatusEmoji(status);
        
        const embed = {
            title: '✅ Phase Updated',
            description: `**${phase.title}** status has been updated.`,
            color: 0x00ff00,
            fields: [
                {
                    name: '📊 Status Change',
                    value: `${roadmapTracker.getStatusEmoji(oldStatus)} ${oldStatus} → ${statusEmoji} ${status}`,
                    inline: false
                }
            ],
            timestamp: new Date()
        };

        if (notes) {
            embed.fields.push({
                name: '📝 Notes',
                value: notes,
                inline: false
            });
        }

        await interaction.editReply({ embeds: [embed] });

        // If phase was completed, suggest announcing it
        if (status === 'completed') {
            const followUp = {
                content: '🎉 Phase marked as completed! Consider using `/roadmap-admin announce-completion` to notify the community.',
                ephemeral: true
            };
            
            setTimeout(() => {
                interaction.followUp(followUp).catch(console.error);
            }, 2000);
        }

    } catch (error) {
        console.error('Error updating phase:', error);
        await interaction.editReply({
            content: '❌ Failed to update phase. Please try again later.',
            ephemeral: true
        });
    }
}

async function handlePostRoadmap(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.options.getChannel('channel');
        const embed = await roadmapTracker.generateRoadmapEmbed();

        await channel.send({ embeds: [embed] });

        await interaction.editReply({
            content: `✅ Roadmap posted to ${channel.toString()}`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error posting roadmap:', error);
        await interaction.editReply({
            content: '❌ Failed to post roadmap. Please check channel permissions.',
            ephemeral: true
        });
    }
}

async function handleAnnounceCompletion(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });

        const phaseId = interaction.options.getString('phase_id');
        const channel = interaction.options.getChannel('channel') || 
                        interaction.guild.channels.cache.find(c => c.name.includes('announcement'));

        if (!channel) {
            await interaction.editReply({
                content: '❌ No announcements channel found. Please specify a channel.',
                ephemeral: true
            });
            return;
        }

        const embed = await roadmapTracker.generatePhaseCompletionEmbed(phaseId);
        if (!embed) {
            await interaction.editReply({
                content: '❌ Phase not found.',
                ephemeral: true
            });
            return;
        }

        await channel.send({ 
            content: '@everyone',
            embeds: [embed] 
        });

        await interaction.editReply({
            content: `🎉 Phase completion announced in ${channel.toString()}`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error announcing completion:', error);
        await interaction.editReply({
            content: '❌ Failed to post announcement. Please check channel permissions.',
            ephemeral: true
        });
    }
}

async function handleSetupAutoUpdates(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });

        const roadmapChannel = interaction.options.getChannel('roadmap_channel');
        const announcementsChannel = interaction.options.getChannel('announcements_channel');

        // Configure the automation system
        const roadmapAutomation = interaction.client.roadmapAutomation;
        if (!roadmapAutomation) {
            await interaction.editReply({
                content: '❌ Roadmap automation system not available. Please restart the bot.',
                ephemeral: true
            });
            return;
        }

        await roadmapAutomation.configure(
            roadmapChannel.id,
            announcementsChannel?.id
        );

        const embed = {
            title: '✅ Auto-Updates Configured',
            description: 'Automatic roadmap updates have been set up and the initial roadmap has been posted.',
            color: 0x00ff00,
            fields: [
                {
                    name: '🗺️ Roadmap Channel',
                    value: roadmapChannel.toString(),
                    inline: true
                }
            ],
            timestamp: new Date()
        };

        if (announcementsChannel) {
            embed.fields.push({
                name: '📢 Announcements Channel',
                value: announcementsChannel.toString(),
                inline: true
            });
        }

        embed.fields.push({
            name: '🔄 Auto-Updates Enabled',
            value: '• Roadmap updates automatically when phases change\n• Completion announcements posted automatically\n• Progress bars update in real-time\n• Pinned message maintained',
            inline: false
        });

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error setting up auto-updates:', error);
        await interaction.editReply({
            content: '❌ Failed to configure auto-updates. Please try again later.',
            ephemeral: true
        });
    }
}