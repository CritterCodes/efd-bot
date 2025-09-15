/**
 * GEMS Currency System Core Library
 * 
 * This module provides the core functionality for the GEMS (Growth • Engagement • Mentorship • Support)
 * currency system, including balance management, transaction logging, and anti-abuse mechanisms.
 * 
 * @module gems
 * @author GitHub Copilot
 * @version 1.0.0
 */

import { db } from './database.js';
import Constants from './constants.js';

/**
 * GEMS Core Class - Manages all GEMS currency operations
 */
export class GemsCore {
    constructor() {
        this.settingsCache = new Map();
        this.rateLimitCache = new Map();
    }

    /**
     * Get user's current GEMS balance and statistics
     * @param {string} discordId - User's Discord ID
     * @returns {Promise<Object>} User balance data or null if not found
     */
    async getUserBalance(discordId) {
        try {
            const balancesCollection = await db.gemsBalances();
            const balance = await balancesCollection.findOne({ discordId });
            
            if (!balance) {
                // Create initial balance for new user
                return await this.createUserBalance(discordId);
            }
            
            return {
                discordId: balance.discordId,
                balance: balance.balance,
                lifetimeEarned: balance.lifetimeEarned,
                lifetimeSpent: balance.lifetimeSpent,
                lastActivity: balance.lastActivity,
                createdAt: balance.createdAt,
                updatedAt: balance.updatedAt
            };
            
        } catch (error) {
            console.error(`Error getting balance for ${discordId}:`, error);
            throw new Error('Failed to retrieve user balance');
        }
    }

    /**
     * Create initial balance record for new user
     * @param {string} discordId - User's Discord ID
     * @returns {Promise<Object>} Created balance data
     * @private
     */
    async createUserBalance(discordId) {
        try {
            const balancesCollection = await db.gemsBalances();
            const now = new Date();
            
            const initialBalance = {
                discordId,
                balance: 0,
                lifetimeEarned: 0,
                lifetimeSpent: 0,
                lastActivity: now,
                createdAt: now,
                updatedAt: now
            };
            
            await balancesCollection.insertOne(initialBalance);
            
            // Log account creation
            await this.logTransaction(discordId, 'earned', 0, 'Account created', 'system', {
                accountCreation: true
            });
            
            return initialBalance;
            
        } catch (error) {
            if (error.code === 11000) {
                // Duplicate key error - user already exists, fetch existing
                return await this.getUserBalance(discordId);
            }
            throw error;
        }
    }

    /**
     * Add GEMS to user's balance
     * @param {string} discordId - User's Discord ID  
     * @param {number} amount - Amount to add (must be positive)
     * @param {string} reason - Reason for adding GEMS
     * @param {string} source - Source of the GEMS (message, verification, etc.)
     * @param {Object} metadata - Additional transaction metadata
     * @returns {Promise<Object>} Updated balance data
     */
    async addGems(discordId, amount, reason, source = 'admin', metadata = {}, bypassLimits = false) {
        if (!discordId || typeof discordId !== 'string') {
            throw new Error('Valid Discord ID is required');
        }
        
        if (!amount || amount <= 0 || !Number.isInteger(amount)) {
            throw new Error('Amount must be a positive integer');
        }
        
        if (!reason || typeof reason !== 'string') {
            throw new Error('Reason is required');
        }
        
        const validSources = ['message', 'spotlight', 'verification', 'social', 'tip', 'admin', 'bonus'];
        if (!validSources.includes(source)) {
            throw new Error(`Invalid source. Must be one of: ${validSources.join(', ')}`);
        }

        try {
            // Check daily earning limits (unless bypassed for special rewards like verification)
            if (!bypassLimits) {
                const canEarn = await this.checkDailyEarningLimit(discordId, amount);
                if (!canEarn.allowed) {
                    throw new Error(`Daily earning limit exceeded. ${canEarn.message}`);
                }
            }

            const balancesCollection = await db.gemsBalances();
            const now = new Date();
            
            // Ensure user balance exists
            await this.getUserBalance(discordId);
            
            // Update balance atomically
            const result = await balancesCollection.findOneAndUpdate(
                { discordId },
                { 
                    $inc: { 
                        balance: amount,
                        lifetimeEarned: amount
                    },
                    $set: { 
                        lastActivity: now,
                        updatedAt: now 
                    }
                },
                { returnDocument: 'after' }
            );
            
            if (!result) {
                throw new Error('Failed to update user balance');
            }
            
            // Log transaction
            await this.logTransaction(discordId, 'earned', amount, reason, source, metadata);
            
            return {
                discordId: result.discordId,
                balance: result.balance,
                lifetimeEarned: result.lifetimeEarned,
                lifetimeSpent: result.lifetimeSpent,
                lastActivity: result.lastActivity,
                updatedAt: result.updatedAt
            };
            
        } catch (error) {
            console.error(`Error adding GEMS to ${discordId}:`, error);
            throw error;
        }
    }

    /**
     * Subtract GEMS from user's balance
     * @param {string} discordId - User's Discord ID
     * @param {number} amount - Amount to subtract (must be positive)
     * @param {string} reason - Reason for subtracting GEMS
     * @param {string} source - Source of the spending
     * @param {Object} metadata - Additional transaction metadata
     * @returns {Promise<Object>} Updated balance data
     */
    async subtractGems(discordId, amount, reason, source = 'admin', metadata = {}) {
        if (!discordId || typeof discordId !== 'string') {
            throw new Error('Valid Discord ID is required');
        }
        
        if (!amount || amount <= 0 || !Number.isInteger(amount)) {
            throw new Error('Amount must be a positive integer');
        }
        
        if (!reason || typeof reason !== 'string') {
            throw new Error('Reason is required');
        }

        try {
            const balancesCollection = await db.gemsBalances();
            const now = new Date();
            
            // Get current balance
            const currentBalance = await this.getUserBalance(discordId);
            
            if (currentBalance.balance < amount) {
                throw new Error(`Insufficient balance. Current: ${currentBalance.balance}, Required: ${amount}`);
            }
            
            // Update balance atomically
            const result = await balancesCollection.findOneAndUpdate(
                { 
                    discordId,
                    balance: { $gte: amount } // Ensure sufficient balance
                },
                { 
                    $inc: { 
                        balance: -amount,
                        lifetimeSpent: amount
                    },
                    $set: { 
                        lastActivity: now,
                        updatedAt: now 
                    }
                },
                { returnDocument: 'after' }
            );
            
            if (!result) {
                throw new Error('Failed to update balance - insufficient funds or concurrent modification');
            }
            
            // Log transaction
            await this.logTransaction(discordId, 'spent', amount, reason, source, metadata);
            
            return {
                discordId: result.discordId,
                balance: result.balance,
                lifetimeEarned: result.lifetimeEarned,
                lifetimeSpent: result.lifetimeSpent,
                lastActivity: result.lastActivity,
                updatedAt: result.updatedAt
            };
            
        } catch (error) {
            console.error(`Error subtracting GEMS from ${discordId}:`, error);
            throw error;
        }
    }

    /**
     * Transfer GEMS between users
     * @param {string} fromId - Sender's Discord ID
     * @param {string} toId - Recipient's Discord ID  
     * @param {number} amount - Amount to transfer
     * @param {string} reason - Optional reason for transfer
     * @returns {Promise<Object>} Transfer result with both user balances
     */
    async transferGems(fromId, toId, amount, reason = 'GEMS transfer') {
        if (!fromId || !toId || fromId === toId) {
            throw new Error('Valid sender and recipient IDs required (must be different)');
        }
        
        if (!amount || amount <= 0 || !Number.isInteger(amount)) {
            throw new Error('Amount must be a positive integer');
        }

        try {
            // Check transfer limits
            const canTransfer = await this.checkTransferLimits(fromId, amount);
            if (!canTransfer.allowed) {
                throw new Error(`Transfer not allowed: ${canTransfer.message}`);
            }

            // Ensure both users exist
            await this.getUserBalance(fromId);
            await this.getUserBalance(toId);
            
            // Execute transfer as atomic operations
            const senderResult = await this.subtractGems(fromId, amount, reason, 'tip', {
                transferTo: toId,
                transferType: 'outgoing'
            });
            
            const recipientResult = await this.addGems(toId, amount, reason, 'tip', {
                transferFrom: fromId,
                transferType: 'incoming'  
            });
            
            return {
                success: true,
                transfer: {
                    from: fromId,
                    to: toId,
                    amount,
                    reason
                },
                senderBalance: senderResult,
                recipientBalance: recipientResult
            };
            
        } catch (error) {
            console.error(`Error transferring GEMS from ${fromId} to ${toId}:`, error);
            throw error;
        }
    }

    /**
     * Log a GEMS transaction
     * @param {string} discordId - User's Discord ID
     * @param {string} type - Transaction type (earned, spent, transferred, bonus, admin_add, admin_remove)
     * @param {number} amount - Transaction amount
     * @param {string} reason - Transaction reason
     * @param {string} source - Transaction source
     * @param {Object} metadata - Additional transaction data
     * @param {string} relatedUserId - Related user ID for transfers
     * @returns {Promise<Object>} Transaction record
     */
    async logTransaction(discordId, type, amount, reason, source, metadata = {}, relatedUserId = null) {
        try {
            const transactionsCollection = await db.gemsTransactions();
            
            const transaction = {
                discordId,
                type,
                amount,
                reason,
                source,
                metadata,
                relatedUserId,
                timestamp: new Date()
            };
            
            const result = await transactionsCollection.insertOne(transaction);
            transaction._id = result.insertedId;
            
            return transaction;
            
        } catch (error) {
            console.error(`Error logging transaction for ${discordId}:`, error);
            throw new Error('Failed to log transaction');
        }
    }

    /**
     * Get user's transaction history
     * @param {string} discordId - User's Discord ID
     * @param {number} limit - Maximum number of transactions to return
     * @param {number} offset - Number of transactions to skip
     * @param {string} type - Filter by transaction type (optional)
     * @returns {Promise<Array>} Array of transaction records
     */
    async getTransactionHistory(discordId, limit = 50, offset = 0, type = null) {
        try {
            const transactionsCollection = await db.gemsTransactions();
            
            const query = { discordId };
            if (type) {
                query.type = type;
            }
            
            const transactions = await transactionsCollection
                .find(query)
                .sort({ timestamp: -1 })
                .skip(offset)
                .limit(Math.min(limit, 100)) // Cap at 100 for performance
                .toArray();
                
            return transactions;
            
        } catch (error) {
            console.error(`Error getting transaction history for ${discordId}:`, error);
            throw new Error('Failed to retrieve transaction history');
        }
    }

    /**
     * Get GEMS leaderboard
     * @param {string} type - Leaderboard type ('balance', 'earned', 'spent')
     * @param {string} timeframe - Time filter ('all-time', 'monthly', 'weekly')
     * @param {number} limit - Number of users to return
     * @returns {Promise<Array>} Leaderboard data
     */
    async getLeaderboard(type = 'balance', timeframe = 'all-time', limit = 10) {
        try {
            const balancesCollection = await db.gemsBalances();
            
            let sortField;
            switch (type) {
                case 'balance':
                    sortField = { balance: -1 };
                    break;
                case 'earned':
                    sortField = { lifetimeEarned: -1 };
                    break;
                case 'spent':
                    sortField = { lifetimeSpent: -1 };
                    break;
                default:
                    throw new Error('Invalid leaderboard type. Use: balance, earned, or spent');
            }
            
            // For timeframe filtering, we'd need to calculate based on transactions
            // For now, implement all-time leaderboards
            if (timeframe !== 'all-time') {
                // TODO: Implement time-based leaderboards using transaction aggregation
                console.warn(`Timeframe '${timeframe}' not yet implemented, using all-time`);
            }
            
            const leaderboard = await balancesCollection
                .find({})
                .sort(sortField)
                .limit(Math.min(limit, 50)) // Cap at 50 for performance
                .toArray();
                
            return leaderboard.map((user, index) => ({
                rank: index + 1,
                discordId: user.discordId,
                balance: user.balance,
                lifetimeEarned: user.lifetimeEarned,
                lifetimeSpent: user.lifetimeSpent,
                lastActivity: user.lastActivity
            }));
            
        } catch (error) {
            console.error(`Error getting leaderboard:`, error);
            throw new Error('Failed to retrieve leaderboard');
        }
    }

    /**
     * Check if user can earn specified amount within daily limits
     * @param {string} discordId - User's Discord ID
     * @param {number} amount - Amount to check
     * @returns {Promise<Object>} Check result with allowed status and message
     */
    async checkDailyEarningLimit(discordId, amount) {
        try {
            const dailyMaxSetting = await this.getSetting('limits.earning.daily_max');
            const dailyMax = dailyMaxSetting?.value || 100;
            
            // Get today's earnings
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const transactionsCollection = await db.gemsTransactions();
            const todayEarnings = await transactionsCollection.aggregate([
                {
                    $match: {
                        discordId,
                        type: 'earned',
                        timestamp: { $gte: today, $lt: tomorrow }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' }
                    }
                }
            ]).toArray();
            
            const currentEarnings = todayEarnings[0]?.total || 0;
            const remaining = dailyMax - currentEarnings;
            
            if (currentEarnings + amount > dailyMax) {
                return {
                    allowed: false,
                    message: `Daily limit of ${dailyMax} GEMS exceeded. Already earned: ${currentEarnings}, Remaining: ${remaining}`
                };
            }
            
            return {
                allowed: true,
                currentEarnings,
                remaining: remaining - amount,
                dailyMax
            };
            
        } catch (error) {
            console.error(`Error checking daily earning limit for ${discordId}:`, error);
            return { allowed: false, message: 'Failed to check daily limits' };
        }
    }

    /**
     * Check transfer/tip limits for user
     * @param {string} discordId - User's Discord ID
     * @param {number} amount - Amount to transfer
     * @returns {Promise<Object>} Check result
     */
    async checkTransferLimits(discordId, amount) {
        try {
            const [minAmountSetting, maxAmountSetting, dailyMaxSetting] = await Promise.all([
                this.getSetting('limits.tip.min_amount'),
                this.getSetting('limits.tip.max_amount'),
                this.getSetting('limits.tip.daily_max')
            ]);
            
            const minAmount = minAmountSetting?.value || 1;
            const maxAmount = maxAmountSetting?.value || 50;
            const dailyMax = dailyMaxSetting?.value || 100;
            
            if (amount < minAmount) {
                return {
                    allowed: false,
                    message: `Minimum transfer amount is ${minAmount} GEMS`
                };
            }
            
            if (amount > maxAmount) {
                return {
                    allowed: false,
                    message: `Maximum transfer amount is ${maxAmount} GEMS`
                };
            }
            
            // Check daily transfer total
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const transactionsCollection = await db.gemsTransactions();
            const todayTransfers = await transactionsCollection.aggregate([
                {
                    $match: {
                        discordId,
                        type: 'spent',
                        source: 'tip',
                        timestamp: { $gte: today, $lt: tomorrow }
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$amount' }
                    }
                }
            ]).toArray();
            
            const currentTransfers = todayTransfers[0]?.total || 0;
            
            if (currentTransfers + amount > dailyMax) {
                return {
                    allowed: false,
                    message: `Daily transfer limit of ${dailyMax} GEMS exceeded. Already transferred: ${currentTransfers}`
                };
            }
            
            return { allowed: true };
            
        } catch (error) {
            console.error(`Error checking transfer limits for ${discordId}:`, error);
            return { allowed: false, message: 'Failed to check transfer limits' };
        }
    }

    /**
     * Get a GEMS setting value
     * @param {string} settingKey - Setting key
     * @returns {Promise<Object|null>} Setting object or null
     */
    async getSetting(settingKey) {
        try {
            // Check cache first
            if (this.settingsCache.has(settingKey)) {
                const cached = this.settingsCache.get(settingKey);
                // Cache for 5 minutes
                if (Date.now() - cached.timestamp < 300000) {
                    return cached.value;
                }
            }
            
            const settingsCollection = await db.gemsSettings();
            const setting = await settingsCollection.findOne({ settingKey });
            
            // Cache the result
            this.settingsCache.set(settingKey, {
                value: setting,
                timestamp: Date.now()
            });
            
            return setting;
            
        } catch (error) {
            console.error(`Error getting setting ${settingKey}:`, error);
            return null;
        }
    }

    /**
     * Update a GEMS setting
     * @param {string} settingKey - Setting key  
     * @param {any} value - New setting value
     * @param {string} updatedBy - Who updated the setting
     * @returns {Promise<Object>} Updated setting
     */
    async updateSetting(settingKey, value, updatedBy) {
        try {
            const settingsCollection = await db.gemsSettings();
            
            const result = await settingsCollection.findOneAndUpdate(
                { settingKey },
                { 
                    $set: { 
                        value, 
                        updatedBy, 
                        updatedAt: new Date() 
                    } 
                },
                { returnDocument: 'after' }
            );
            
            // Clear cache
            this.settingsCache.delete(settingKey);
            
            return result;
            
        } catch (error) {
            console.error(`Error updating setting ${settingKey}:`, error);
            throw new Error('Failed to update setting');
        }
    }

    /**
     * Get user's rank in leaderboard
     * @param {string} discordId - User's Discord ID
     * @param {string} type - Ranking type ('balance', 'earned', 'spent')
     * @returns {Promise<Object>} Rank information
     */
    async getUserRank(discordId, type = 'balance') {
        try {
            const balancesCollection = await db.gemsBalances();
            const userBalance = await this.getUserBalance(discordId);
            
            if (!userBalance) {
                return { rank: null, total: 0 };
            }
            
            let compareField;
            let userValue;
            
            switch (type) {
                case 'balance':
                    compareField = 'balance';
                    userValue = userBalance.balance;
                    break;
                case 'earned':
                    compareField = 'lifetimeEarned';
                    userValue = userBalance.lifetimeEarned;
                    break;
                case 'spent':
                    compareField = 'lifetimeSpent';
                    userValue = userBalance.lifetimeSpent;
                    break;
                default:
                    throw new Error('Invalid rank type');
            }
            
            // Count users with higher values
            const higherCount = await balancesCollection.countDocuments({
                [compareField]: { $gt: userValue }
            });
            
            const totalUsers = await balancesCollection.countDocuments();
            
            return {
                rank: higherCount + 1,
                total: totalUsers,
                percentile: Math.round(((totalUsers - higherCount) / totalUsers) * 100)
            };
            
        } catch (error) {
            console.error(`Error getting user rank for ${discordId}:`, error);
            return { rank: null, total: 0 };
        }
    }
}

// Export singleton instance
export const gems = new GemsCore();