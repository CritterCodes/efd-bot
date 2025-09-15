import GemsBalance from '../models/GemsBalance.js';
import Transaction from '../models/Transaction.js';
import { GemsCore } from '../lib/gems.js';

/**
 * GEMS Service
 * Handles core business operations and calculations for the GEMS system
 * Acts as a bridge between the MVC architecture and the existing GEMS core library
 */
export class GemsService {
    static gemsCore = new GemsCore();

    /**
     * Get or create user's GEMS balance
     * @param {string} discordId - Discord user ID
     * @returns {Promise<GemsBalance>} User's balance
     */
    static async getUserBalance(discordId) {
        try {
            const balanceData = await this.gemsCore.getUserBalance(discordId);
            return GemsBalance.fromDocument(balanceData);
        } catch (error) {
            console.error('Error getting user balance:', error);
            throw error;
        }
    }

    /**
     * Add GEMS to user's balance
     * @param {string} discordId - Discord user ID
     * @param {number} amount - Amount to add
     * @param {string} reason - Reason for the addition
     * @param {Object} [metadata={}] - Additional metadata
     * @param {boolean} [bypassLimits=false] - Whether to bypass daily earning limits
     * @returns {Promise<Object>} Result with new balance and transaction
     */
    static async addGems(discordId, amount, reason, metadata = {}, bypassLimits = false) {
        try {
            if (amount <= 0) {
                throw new Error('Amount must be positive');
            }

            const result = await this.gemsCore.addGems(
                discordId, 
                amount, 
                reason, 
                metadata.source || 'admin', 
                metadata,
                bypassLimits
            );
            
            return {
                success: true,
                newBalance: result.newBalance,
                amountAdded: amount,
                transaction: result
            };
        } catch (error) {
            console.error('Error adding GEMS:', error);
            throw error;
        }
    }

    /**
     * Subtract GEMS from user's balance
     * @param {string} discordId - Discord user ID
     * @param {number} amount - Amount to subtract
     * @param {string} reason - Reason for the subtraction
     * @param {Object} [metadata={}] - Additional metadata
     * @returns {Promise<Object>} Result with new balance and transaction
     */
    static async subtractGems(discordId, amount, reason, metadata = {}) {
        try {
            if (amount <= 0) {
                throw new Error('Amount must be positive');
            }

            const currentBalance = await this.getUserBalance(discordId);
            if (currentBalance.balance < amount) {
                throw new Error(`Insufficient balance. User has ${currentBalance.balance} GEMS but tried to spend ${amount} GEMS`);
            }

            const result = await this.gemsCore.subtractGems(discordId, amount, reason, metadata.source || 'admin', metadata);

            return {
                success: true,
                newBalance: result.newBalance,
                amountSubtracted: amount,
                transaction: result
            };
        } catch (error) {
            console.error('Error subtracting GEMS:', error);
            throw error;
        }
    }

    /**
     * Transfer GEMS between users
     * @param {string} fromDiscordId - Sender's Discord user ID
     * @param {string} toDiscordId - Recipient's Discord user ID
     * @param {number} amount - Amount to transfer
     * @param {string} reason - Reason for the transfer
     * @param {Object} [metadata={}] - Additional metadata
     * @returns {Promise<Object>} Result with updated balances and transactions
     */
    static async transferGems(fromDiscordId, toDiscordId, amount, reason, metadata = {}) {
        try {
            if (amount <= 0) {
                throw new Error('Amount must be positive');
            }

            if (fromDiscordId === toDiscordId) {
                throw new Error('Cannot transfer GEMS to yourself');
            }

            // Check minimum/maximum transfer limits from settings
            const minTransfer = await this.gemsCore.getGemsSetting('limits.tip.min_amount') || 1;
            const maxTransfer = await this.gemsCore.getGemsSetting('limits.tip.max_amount') || 50;

            if (amount < minTransfer) {
                throw new Error(`Minimum transfer amount is ${minTransfer} GEMS`);
            }

            if (amount > maxTransfer) {
                throw new Error(`Maximum transfer amount is ${maxTransfer} GEMS`);
            }

            const result = await this.gemsCore.transferGems(fromDiscordId, toDiscordId, amount, reason, metadata);

            return {
                success: true,
                fromBalance: result.fromBalance,
                toBalance: result.toBalance,
                amountTransferred: amount,
                fromTransaction: result,
                toTransaction: result
            };
        } catch (error) {
            console.error('Error transferring GEMS:', error);
            throw error;
        }
    }

    /**
     * Get leaderboard data
     * @param {number} [limit=10] - Number of top users to return
     * @returns {Promise<Object>} Leaderboard data with user rankings
     */
    static async getLeaderboard(limit = 10) {
        try {
            const leaderboardData = await this.gemsCore.getLeaderboard('balance', 'all-time', limit);
            
            const leaderboard = leaderboardData.map((entry, index) => ({
                position: index + 1,
                discordId: entry.discordId,
                balance: entry.balance,
                lifetimeEarned: entry.lifetimeEarned,
                lifetimeSpent: entry.lifetimeSpent
            }));

            return {
                leaderboard,
                totalUsers: leaderboard.length,
                lastUpdated: new Date()
            };
        } catch (error) {
            console.error('Error getting leaderboard:', error);
            throw error;
        }
    }

    /**
     * Get user's position on leaderboard
     * @param {string} discordId - Discord user ID
     * @returns {Promise<Object>} User's leaderboard position and stats
     */
    static async getUserLeaderboardPosition(discordId) {
        try {
            const position = await GemsBalance.getUserPosition(discordId);
            const balance = await this.getUserBalance(discordId);
            const totalUsers = await this.getTotalUsersCount();

            return {
                position,
                totalUsers,
                balance: balance.balance,
                lifetimeEarned: balance.lifetimeEarned,
                lifetimeSpent: balance.lifetimeSpent,
                percentile: totalUsers > 0 ? Math.round((1 - (position - 1) / totalUsers) * 100) : 0
            };
        } catch (error) {
            console.error('Error getting user leaderboard position:', error);
            throw error;
        }
    }

    /**
     * Get total number of users with GEMS balances
     * @returns {Promise<number>} Total user count
     */
    static async getTotalUsersCount() {
        try {
            // Use database directly since getEconomyStats doesn't exist in GemsCore
            const { db } = await import('../lib/database.js');
            await db.connect();
            const balancesCollection = await db.gemsBalances();
            const count = await balancesCollection.countDocuments();
            return count;
        } catch (error) {
            console.error('Error getting total users count:', error);
            throw error;
        }
    }

    /**
     * Get user's transaction history
     * @param {string} discordId - Discord user ID
     * @param {Object} [options={}] - Query options
     * @returns {Promise<Object>} Transaction history and statistics
     */
    static async getUserTransactionHistory(discordId, options = {}) {
        try {
            const {
                limit = 20,
                page = 1,
                type,
                startDate,
                endDate
            } = options;

            const skip = (page - 1) * limit;

            const transactions = await Transaction.findByDiscordId(discordId, {
                limit,
                skip,
                type,
                startDate,
                endDate
            });

            const stats = await Transaction.getUserStats(discordId, startDate, endDate);

            return {
                transactions,
                stats,
                pagination: {
                    currentPage: page,
                    limit,
                    hasMore: transactions.length === limit
                }
            };
        } catch (error) {
            console.error('Error getting user transaction history:', error);
            throw error;
        }
    }

    /**
     * Calculate GEMS economy statistics
     * @returns {Promise<Object>} Economy-wide statistics
     */
    static async getEconomyStats() {
        try {
            return await this.gemsCore.getEconomyStats();
        } catch (error) {
            console.error('Error getting economy stats:', error);
            throw error;
        }
    }
}

export default GemsService;