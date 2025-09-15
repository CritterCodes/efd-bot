import GemsService from '../services/GemsService.js';
import { EmbedBuilder } from 'discord.js';
import { validateAmount, validateUserId, validateReason, validateTransfer } from '../middleware/validation.js';
import { canManageGems } from '../middleware/permissions.js';

/**
 * GEMS Controller
 * Orchestrates business logic and coordinates between services and views
 */
export class GemsController {
    /**
     * Handle balance command
     * @param {import('discord.js').CommandInteraction} interaction - Discord interaction
     * @param {Object} [options={}] - Command options
     * @param {import('discord.js').User} [options.user] - Target user (for admin)
     * @returns {Promise<void>}
     */
    static async handleBalance(interaction, options = {}) {
        try {
            const targetUser = options.user || interaction.user;
            const isOwnBalance = targetUser.id === interaction.user.id;
            
            // Check permissions for viewing other users' balances
            if (!isOwnBalance && !canManageGems(interaction.member)) {
                await interaction.reply({
                    content: '❌ You can only view your own balance.',
                    ephemeral: true
                });
                return;
            }

            const balance = await GemsService.getUserBalance(targetUser.id);
            const position = await GemsService.getUserLeaderboardPosition(targetUser.id);

            const embed = this.createBalanceEmbed(targetUser, balance, position, isOwnBalance);

            await interaction.reply({
                embeds: [embed],
                ephemeral: !isOwnBalance
            });

        } catch (error) {
            console.error('Error handling balance command:', error);
            await interaction.reply({
                content: '❌ An error occurred while fetching the balance.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle leaderboard command
     * @param {import('discord.js').CommandInteraction} interaction - Discord interaction
     * @param {Object} [options={}] - Command options
     * @param {number} [options.page=1] - Page number
     * @returns {Promise<void>}
     */
    static async handleLeaderboard(interaction, options = {}) {
        try {
            const page = options.page || 1;
            const limit = 10;

            const leaderboardData = await GemsService.getLeaderboard(limit);
            const userPosition = await GemsService.getUserLeaderboardPosition(interaction.user.id);

            const embed = this.createLeaderboardEmbed(leaderboardData, userPosition, page);

            await interaction.reply({
                embeds: [embed]
            });

        } catch (error) {
            console.error('Error handling leaderboard command:', error);
            await interaction.reply({
                content: '❌ An error occurred while fetching the leaderboard.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle add GEMS admin command
     * @param {import('discord.js').CommandInteraction} interaction - Discord interaction
     * @param {Object} options - Command options
     * @param {import('discord.js').User} options.user - Target user
     * @param {number} options.amount - Amount to add
     * @param {string} options.reason - Reason for addition
     * @returns {Promise<void>}
     */
    static async handleAddGems(interaction, options) {
        try {
            const { user, amount, reason } = options;

            // Validate inputs
            const validations = [
                validateUserId(user.id),
                validateAmount(amount),
                validateReason(reason)
            ];

            for (const validation of validations) {
                if (!validation.isValid) {
                    await interaction.reply({
                        content: `❌ ${validation.error}`,
                        ephemeral: true
                    });
                    return;
                }
            }

            const result = await GemsService.addGems(user.id, amount, reason, {
                adminId: interaction.user.id,
                adminAction: true
            });

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('💎 GEMS Added')
                .setDescription(`Successfully added **${amount} GEMS** to ${user.displayName}`)
                .addFields(
                    { name: '💰 New Balance', value: `${result.newBalance} GEMS`, inline: true },
                    { name: '📝 Reason', value: reason, inline: true },
                    { name: '👤 Admin', value: interaction.user.displayName, inline: true }
                )
                .setTimestamp();

            await interaction.reply({
                embeds: [embed]
            });

        } catch (error) {
            console.error('Error handling add GEMS command:', error);
            await interaction.reply({
                content: `❌ Error adding GEMS: ${error.message}`,
                ephemeral: true
            });
        }
    }

    /**
     * Handle remove GEMS admin command
     * @param {import('discord.js').CommandInteraction} interaction - Discord interaction
     * @param {Object} options - Command options
     * @param {import('discord.js').User} options.user - Target user
     * @param {number} options.amount - Amount to remove
     * @param {string} options.reason - Reason for removal
     * @returns {Promise<void>}
     */
    static async handleRemoveGems(interaction, options) {
        try {
            const { user, amount, reason } = options;

            // Validate inputs
            const validations = [
                validateUserId(user.id),
                validateAmount(amount),
                validateReason(reason)
            ];

            for (const validation of validations) {
                if (!validation.isValid) {
                    await interaction.reply({
                        content: `❌ ${validation.error}`,
                        ephemeral: true
                    });
                    return;
                }
            }

            const result = await GemsService.subtractGems(user.id, amount, reason, {
                adminId: interaction.user.id,
                adminAction: true
            });

            const embed = new EmbedBuilder()
                .setColor('#ff6b6b')
                .setTitle('💎 GEMS Removed')
                .setDescription(`Successfully removed **${amount} GEMS** from ${user.displayName}`)
                .addFields(
                    { name: '💰 New Balance', value: `${result.newBalance} GEMS`, inline: true },
                    { name: '📝 Reason', value: reason, inline: true },
                    { name: '👤 Admin', value: interaction.user.displayName, inline: true }
                )
                .setTimestamp();

            await interaction.reply({
                embeds: [embed]
            });

        } catch (error) {
            console.error('Error handling remove GEMS command:', error);
            await interaction.reply({
                content: `❌ Error removing GEMS: ${error.message}`,
                ephemeral: true
            });
        }
    }

    /**
     * Handle transfer GEMS command
     * @param {import('discord.js').CommandInteraction} interaction - Discord interaction
     * @param {Object} options - Command options
     * @param {import('discord.js').User} options.user - Recipient user
     * @param {number} options.amount - Amount to transfer
     * @param {string} options.reason - Reason for transfer
     * @returns {Promise<void>}
     */
    static async handleTransfer(interaction, options) {
        try {
            const { user: recipient, amount, reason } = options;
            const sender = interaction.user;

            // Validate transfer
            const validation = validateTransfer(sender.id, recipient.id, amount, reason);
            if (!validation.isValid) {
                await interaction.reply({
                    content: `❌ ${validation.error}`,
                    ephemeral: true
                });
                return;
            }

            const result = await GemsService.transferGems(
                sender.id, 
                recipient.id, 
                amount, 
                validation.sanitizedReason
            );

            const embed = new EmbedBuilder()
                .setColor('#4facfe')
                .setTitle('💸 GEMS Transfer')
                .setDescription(`**${sender.displayName}** transferred **${amount} GEMS** to **${recipient.displayName}**`)
                .addFields(
                    { name: '💰 Sender Balance', value: `${result.fromBalance} GEMS`, inline: true },
                    { name: '💰 Recipient Balance', value: `${result.toBalance} GEMS`, inline: true },
                    { name: '📝 Reason', value: validation.sanitizedReason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({
                embeds: [embed]
            });

        } catch (error) {
            console.error('Error handling transfer command:', error);
            await interaction.reply({
                content: `❌ Transfer failed: ${error.message}`,
                ephemeral: true
            });
        }
    }

    /**
     * Handle economy stats admin command
     * @param {import('discord.js').CommandInteraction} interaction - Discord interaction
     * @returns {Promise<void>}
     */
    static async handleEconomyStats(interaction) {
        try {
            const stats = await GemsService.getEconomyStats();

            const embed = new EmbedBuilder()
                .setColor('#ffd700')
                .setTitle('📊 GEMS Economy Statistics')
                .addFields(
                    { name: '👥 Total Users', value: stats.totalUsers.toLocaleString(), inline: true },
                    { name: '💎 Total Circulation', value: `${stats.totalCirculation.toLocaleString()} GEMS`, inline: true },
                    { name: '📈 Total Earned', value: `${stats.totalEarned.toLocaleString()} GEMS`, inline: true },
                    { name: '📉 Total Spent', value: `${stats.totalSpent.toLocaleString()} GEMS`, inline: true },
                    { name: '📊 Average Balance', value: `${Math.round(stats.avgBalance).toLocaleString()} GEMS`, inline: true },
                    { name: '👑 Highest Balance', value: `${stats.maxBalance.toLocaleString()} GEMS`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Statistics updated in real-time' });

            await interaction.reply({
                embeds: [embed]
            });

        } catch (error) {
            console.error('Error handling economy stats command:', error);
            await interaction.reply({
                content: '❌ An error occurred while fetching economy statistics.',
                ephemeral: true
            });
        }
    }

    /**
     * Create balance embed
     * @param {import('discord.js').User} user - Target user
     * @param {GemsBalance} balance - User's balance data
     * @param {Object} position - User's leaderboard position
     * @param {boolean} isOwnBalance - Whether viewing own balance
     * @returns {EmbedBuilder} Balance embed
     */
    static createBalanceEmbed(user, balance, position, isOwnBalance) {
        const embed = new EmbedBuilder()
            .setColor('#4facfe')
            .setTitle(`💎 ${isOwnBalance ? 'Your' : `${user.displayName}'s`} GEMS Balance`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '💰 Current Balance', value: `${balance.balance.toLocaleString()} GEMS`, inline: true },
                { name: '📈 Lifetime Earned', value: `${balance.lifetimeEarned.toLocaleString()} GEMS`, inline: true },
                { name: '📉 Lifetime Spent', value: `${balance.lifetimeSpent.toLocaleString()} GEMS`, inline: true },
                { name: '🏆 Leaderboard Position', value: `#${position.position} of ${position.totalUsers}`, inline: true },
                { name: '📊 Percentile', value: `${position.percentile}%`, inline: true },
                { name: '📅 Last Activity', value: `<t:${Math.floor(balance.lastActivity.getTime() / 1000)}:R>`, inline: true }
            )
            .setTimestamp();

        return embed;
    }

    /**
     * Create leaderboard embed
     * @param {Object} leaderboardData - Leaderboard data
     * @param {Object} userPosition - User's position data
     * @param {number} page - Current page
     * @returns {EmbedBuilder} Leaderboard embed
     */
    static createLeaderboardEmbed(leaderboardData, userPosition, page) {
        const { leaderboard, totalUsers } = leaderboardData;

        const embed = new EmbedBuilder()
            .setColor('#ffd700')
            .setTitle('🏆 GEMS Leaderboard')
            .setDescription(`**Top ${leaderboard.length} users** • Total users: ${totalUsers}`)
            .setTimestamp();

        if (leaderboard.length === 0) {
            embed.setDescription('No users found in the leaderboard.');
            return embed;
        }

        const leaderboardText = leaderboard.map((entry, index) => {
            const medal = this.getPositionMedal(entry.position);
            return `${medal} **#${entry.position}** <@${entry.discordId}> - **${entry.balance.toLocaleString()}** GEMS`;
        }).join('\n');

        embed.addFields({ name: '📈 Top Users', value: leaderboardText, inline: false });

        // Add user's position if they're not in the top 10
        if (userPosition.position > 10) {
            embed.addFields({
                name: '📍 Your Position',
                value: `**#${userPosition.position}** - **${userPosition.balance.toLocaleString()}** GEMS (${userPosition.percentile}th percentile)`,
                inline: false
            });
        }

        return embed;
    }

    /**
     * Get medal emoji for leaderboard position
     * @param {number} position - Position number
     * @returns {string} Medal emoji
     */
    static getPositionMedal(position) {
        switch (position) {
            case 1: return '🥇';
            case 2: return '🥈';
            case 3: return '🥉';
            default: return '🏅';
        }
    }
}

export default GemsController;