import { SlashCommandBuilder } from 'discord.js';
import GemsController from '../controllers/GemsController.js';
import { validateInteraction, validateAmount, validateUserId } from '../middleware/validation.js';
import { 
    requireVerified, 
    requireGemsManager, 
    gemsCommandRateLimit, 
    transferRateLimit,
    adminRateLimit 
} from '../middleware/permissions.js';

export default {
    data: new SlashCommandBuilder()
        .setName('gems')
        .setDescription('Manage your GEMS currency')
        .addSubcommand(subcommand =>
            subcommand
                .setName('balance')
                .setDescription('Check GEMS balance')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('User to check balance for (admin only)')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('View GEMS leaderboard')
                .addIntegerOption(option =>
                    option
                        .setName('page')
                        .setDescription('Page number to view')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(100)
                )
        )
        .addSubcommandGroup(group =>
            group
                .setName('admin')
                .setDescription('Admin commands for GEMS management')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('add')
                        .setDescription('Add GEMS to a user')
                        .addUserOption(option =>
                            option
                                .setName('user')
                                .setDescription('User to add GEMS to')
                                .setRequired(true)
                        )
                        .addIntegerOption(option =>
                            option
                                .setName('amount')
                                .setDescription('Amount of GEMS to add')
                                .setRequired(true)
                                .setMinValue(1)
                                .setMaxValue(1000000)
                        )
                        .addStringOption(option =>
                            option
                                .setName('reason')
                                .setDescription('Reason for adding GEMS')
                                .setRequired(true)
                                .setMaxLength(500)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('remove')
                        .setDescription('Remove GEMS from a user')
                        .addUserOption(option =>
                            option
                                .setName('user')
                                .setDescription('User to remove GEMS from')
                                .setRequired(true)
                        )
                        .addIntegerOption(option =>
                            option
                                .setName('amount')
                                .setDescription('Amount of GEMS to remove')
                                .setRequired(true)
                                .setMinValue(1)
                                .setMaxValue(1000000)
                        )
                        .addStringOption(option =>
                            option
                                .setName('reason')
                                .setDescription('Reason for removing GEMS')
                                .setRequired(true)
                                .setMaxLength(500)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('stats')
                        .setDescription('View economy statistics')
                )
        ),

    async execute(interaction) {
        try {
            // Basic interaction validation
            const interactionValidation = validateInteraction(interaction);
            if (!interactionValidation.isValid) {
                await interaction.reply({
                    content: `❌ ${interactionValidation.error}`,
                    ephemeral: true
                });
                return;
            }

            const subcommandGroup = interaction.options.getSubcommandGroup();
            const subcommand = interaction.options.getSubcommand();

            // Handle admin commands
            if (subcommandGroup === 'admin') {
                await this.handleAdminCommands(interaction, subcommand);
                return;
            }

            // Handle regular commands
            await this.handleRegularCommands(interaction, subcommand);

        } catch (error) {
            console.error('Error executing GEMS command:', error);
            
            const errorResponse = {
                content: '❌ An unexpected error occurred while processing your request.',
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorResponse);
            } else {
                await interaction.reply(errorResponse);
            }
        }
    },

    async handleRegularCommands(interaction, subcommand) {
        // Apply rate limiting for regular commands
        const rateLimitResult = await this.applyRateLimit(interaction, gemsCommandRateLimit);
        if (!rateLimitResult) return;

        // Apply verification requirement for all regular commands
        const verificationResult = await this.applyMiddleware(interaction, requireVerified);
        if (!verificationResult) return;

        switch (subcommand) {
            case 'balance':
                await this.handleBalanceCommand(interaction);
                break;
            
            case 'leaderboard':
                await this.handleLeaderboardCommand(interaction);
                break;
            
            default:
                await interaction.reply({
                    content: '❌ Unknown command.',
                    ephemeral: true
                });
        }
    },

    async handleAdminCommands(interaction, subcommand) {
        // Apply admin rate limiting
        const rateLimitResult = await this.applyRateLimit(interaction, adminRateLimit);
        if (!rateLimitResult) return;

        // Apply admin permission requirement
        const adminResult = await this.applyMiddleware(interaction, requireGemsManager);
        if (!adminResult) return;

        switch (subcommand) {
            case 'add':
                await this.handleAdminAddCommand(interaction);
                break;
            
            case 'remove':
                await this.handleAdminRemoveCommand(interaction);
                break;
            
            case 'stats':
                await this.handleAdminStatsCommand(interaction);
                break;
            
            default:
                await interaction.reply({
                    content: '❌ Unknown admin command.',
                    ephemeral: true
                });
        }
    },

    async handleBalanceCommand(interaction) {
        const targetUser = interaction.options.getUser('user');
        
        await GemsController.handleBalance(interaction, {
            user: targetUser
        });
    },

    async handleLeaderboardCommand(interaction) {
        const page = interaction.options.getInteger('page') || 1;
        
        await GemsController.handleLeaderboard(interaction, {
            page
        });
    },

    async handleAdminAddCommand(interaction) {
        const targetUser = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        const reason = interaction.options.getString('reason');

        await GemsController.handleAddGems(interaction, {
            user: targetUser,
            amount,
            reason
        });
    },

    async handleAdminRemoveCommand(interaction) {
        const targetUser = interaction.options.getUser('user');
        const amount = interaction.options.getInteger('amount');
        const reason = interaction.options.getString('reason');

        await GemsController.handleRemoveGems(interaction, {
            user: targetUser,
            amount,
            reason
        });
    },

    async handleAdminStatsCommand(interaction) {
        await GemsController.handleEconomyStats(interaction);
    },

    /**
     * Apply middleware function to interaction
     * @param {import('discord.js').CommandInteraction} interaction - Discord interaction
     * @param {Function} middleware - Middleware function
     * @returns {Promise<boolean>} Whether middleware passed
     */
    async applyMiddleware(interaction, middleware) {
        let middlewarePassed = false;
        
        try {
            await middleware(interaction, async () => {
                middlewarePassed = true;
            });
        } catch (error) {
            console.error('Middleware error:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred while checking permissions.',
                    ephemeral: true
                });
            }
            return false;
        }
        
        return middlewarePassed;
    },

    /**
     * Apply rate limiting middleware
     * @param {import('discord.js').CommandInteraction} interaction - Discord interaction
     * @param {Function} rateLimitMiddleware - Rate limit middleware function
     * @returns {Promise<boolean>} Whether rate limit passed
     */
    async applyRateLimit(interaction, rateLimitMiddleware) {
        return await this.applyMiddleware(interaction, rateLimitMiddleware);
    }
};