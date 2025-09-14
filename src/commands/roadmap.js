// commands/roadmap.js
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import RoadmapTracker from '../lib/roadmapTracker.js';

const roadmapTracker = new RoadmapTracker();

export default {
    data: new SlashCommandBuilder()
        .setName('roadmap')
        .setDescription('Display the development roadmap and progress')
        .addSubcommand(subcommand =>
            subcommand
                .setName('show')
                .setDescription('Display the current roadmap status')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('phase')
                .setDescription('Get detailed information about a specific phase')
                .addStringOption(option =>
                    option
                        .setName('phase_id')
                        .setDescription('Phase ID (e.g., phase-1)')
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
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('Show roadmap statistics and recent updates')
        ),

    async execute(interaction) {
        await roadmapTracker.init();
        
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'show') {
            await handleShowRoadmap(interaction);
        } else if (subcommand === 'phase') {
            await handlePhaseDetails(interaction);
        } else if (subcommand === 'stats') {
            await handleRoadmapStats(interaction);
        }
    },
};

async function handleShowRoadmap(interaction) {
    try {
        await interaction.deferReply();

        const embed = await roadmapTracker.generateRoadmapEmbed();
        
        // Add navigation buttons
        const components = [{
            type: 1, // Action Row
            components: [
                {
                    type: 2, // Button
                    style: 1, // Primary
                    label: 'View Full Roadmap',
                    emoji: '🗺️',
                    custom_id: 'roadmap_full'
                },
                {
                    type: 2, // Button
                    style: 2, // Secondary
                    label: 'Phase Details',
                    emoji: '📋',
                    custom_id: 'roadmap_phases'
                },
                {
                    type: 2, // Button
                    style: 3, // Success
                    label: 'Recent Updates',
                    emoji: '📈',
                    custom_id: 'roadmap_updates'
                }
            ]
        }];

        await interaction.editReply({ 
            embeds: [embed],
            components 
        });
    } catch (error) {
        console.error('Error displaying roadmap:', error);
        await interaction.editReply({
            content: '❌ Failed to load roadmap. Please try again later.',
            ephemeral: true
        });
    }
}

async function handlePhaseDetails(interaction) {
    try {
        await interaction.deferReply();

        const phaseId = interaction.options.getString('phase_id');
        const phase = await roadmapTracker.getPhase(phaseId);

        if (!phase) {
            await interaction.editReply({
                content: '❌ Phase not found.',
                ephemeral: true
            });
            return;
        }

        const progress = await roadmapTracker.calculatePhaseProgress(phaseId);
        const statusEmoji = roadmapTracker.getStatusEmoji(phase.status);
        const progressBar = roadmapTracker.generateProgressBar(progress);

        const embed = {
            title: `${statusEmoji} ${phase.title}`,
            description: phase.description,
            color: getPhaseColor(phase.status),
            fields: [
                {
                    name: '📊 Progress',
                    value: `\`${progressBar}\` ${progress}%`,
                    inline: true
                },
                {
                    name: '🎯 Priority',
                    value: phase.priority.charAt(0).toUpperCase() + phase.priority.slice(1),
                    inline: true
                },
                {
                    name: '📅 Timeline',
                    value: getTimelineText(phase),
                    inline: true
                },
                {
                    name: '🎯 Objectives',
                    value: phase.objectives.map(obj => `• ${obj}`).join('\n'),
                    inline: false
                }
            ],
            footer: {
                text: `Phase ${phaseId.replace('phase-', '')} • Last updated`,
                icon_url: interaction.client.user.displayAvatarURL()
            },
            timestamp: phase.updatedAt || new Date()
        };

        if (phase.dependencies && phase.dependencies.length > 0) {
            embed.fields.push({
                name: '🔗 Dependencies',
                value: phase.dependencies.map(dep => `• ${dep.replace('phase-', 'Phase ')}`).join('\n'),
                inline: false
            });
        }

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error displaying phase details:', error);
        await interaction.editReply({
            content: '❌ Failed to load phase details. Please try again later.',
            ephemeral: true
        });
    }
}

async function handleRoadmapStats(interaction) {
    try {
        await interaction.deferReply();

        const stats = await roadmapTracker.getRoadmapStats();
        const recentUpdates = await roadmapTracker.getRecentUpdates(5);

        const embed = {
            title: '📊 Roadmap Statistics',
            color: 0x3498db,
            fields: [
                {
                    name: '🎯 Overall Progress',
                    value: `${stats.overallProgress}% Complete\n\`${roadmapTracker.generateProgressBar(stats.overallProgress)}\``,
                    inline: false
                },
                {
                    name: '✅ Completed',
                    value: stats.completedPhases.toString(),
                    inline: true
                },
                {
                    name: '🚧 In Progress',
                    value: stats.inProgressPhases.toString(),
                    inline: true
                },
                {
                    name: '📅 Planned',
                    value: stats.plannedPhases.toString(),
                    inline: true
                }
            ],
            timestamp: new Date()
        };

        if (recentUpdates.length > 0) {
            embed.fields.push({
                name: '📈 Recent Updates',
                value: recentUpdates.map(update => {
                    const timeAgo = getTimeAgo(update.timestamp);
                    return `• ${update.message} *(${timeAgo})*`;
                }).join('\n'),
                inline: false
            });
        }

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Error displaying roadmap stats:', error);
        await interaction.editReply({
            content: '❌ Failed to load roadmap statistics. Please try again later.',
            ephemeral: true
        });
    }
}

function getPhaseColor(status) {
    const colors = {
        'completed': 0x00ff00,
        'in-progress': 0xffa500,
        'in-planning': 0x3498db,
        'planned': 0x95a5a6,
        'on-hold': 0xf39c12,
        'cancelled': 0xe74c3c
    };
    return colors[status] || 0x95a5a6;
}

function getTimelineText(phase) {
    if (phase.status === 'completed') {
        return `Completed: ${phase.completedDate?.toLocaleDateString() || 'Unknown'}`;
    } else if (phase.status === 'in-progress') {
        return `Started: ${phase.startDate?.toLocaleDateString() || 'Unknown'}`;
    } else if (phase.targetDate) {
        return `Target: ${phase.targetDate.toLocaleDateString()}`;
    } else {
        return 'TBD';
    }
}

function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
        return 'Just now';
    }
}