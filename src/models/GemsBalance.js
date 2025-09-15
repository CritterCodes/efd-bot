import Constants from '../lib/constants.js';
import { db } from '../lib/database.js';

/**
 * GEMS Balance Model
 * Handles data structure and validation for user GEMS balances
 */
export class GemsBalance {
    /**
     * Create a new GemsBalance instance
     * @param {Object} data - Balance data
     * @param {string} data.discordId - Discord user ID
     * @param {number} data.balance - Current GEMS balance
     * @param {number} data.lifetimeEarned - Total GEMS earned all-time
     * @param {number} data.lifetimeSpent - Total GEMS spent all-time
     * @param {Date} data.lastActivity - Last activity timestamp
     * @param {Date} data.createdAt - Account creation timestamp
     * @param {Date} data.updatedAt - Last update timestamp
     */
    constructor(data) {
        this.discordId = data.discordId;
        this.balance = data.balance || 0;
        this.lifetimeEarned = data.lifetimeEarned || 0;
        this.lifetimeSpent = data.lifetimeSpent || 0;
        this.lastActivity = data.lastActivity || new Date();
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    /**
     * Validate balance data against schema
     * @returns {Object} Validation result
     */
    validate() {
        const errors = [];

        // Required fields
        if (!this.discordId) errors.push('discordId is required');
        
        // Type validation
        if (typeof this.discordId !== 'string') errors.push('discordId must be a string');
        if (typeof this.balance !== 'number') errors.push('balance must be a number');
        if (typeof this.lifetimeEarned !== 'number') errors.push('lifetimeEarned must be a number');
        if (typeof this.lifetimeSpent !== 'number') errors.push('lifetimeSpent must be a number');

        // Range validation
        if (this.balance < 0) errors.push('balance cannot be negative');
        if (this.lifetimeEarned < 0) errors.push('lifetimeEarned cannot be negative');
        if (this.lifetimeSpent < 0) errors.push('lifetimeSpent cannot be negative');

        // Date validation
        if (!(this.lastActivity instanceof Date)) errors.push('lastActivity must be a Date');
        if (!(this.createdAt instanceof Date)) errors.push('createdAt must be a Date');
        if (!(this.updatedAt instanceof Date)) errors.push('updatedAt must be a Date');

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Convert to database document format
     * @returns {Object} Database document
     */
    toDocument() {
        return {
            discordId: this.discordId,
            balance: this.balance,
            lifetimeEarned: this.lifetimeEarned,
            lifetimeSpent: this.lifetimeSpent,
            lastActivity: this.lastActivity,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /**
     * Create GemsBalance from database document
     * @param {Object} doc - Database document
     * @returns {GemsBalance} New instance
     */
    static fromDocument(doc) {
        return new GemsBalance(doc);
    }

    /**
     * Find balance by Discord ID
     * @param {string} discordId - Discord user ID
     * @returns {Promise<GemsBalance|null>} Balance instance or null
     */
    static async findByDiscordId(discordId) {
        try {
            const collection = await db.gemsBalances();
            const doc = await collection.findOne({ discordId });
            return doc ? GemsBalance.fromDocument(doc) : null;
        } catch (error) {
            console.error('Error finding balance by Discord ID:', error);
            throw error;
        }
    }

    /**
     * Save balance to database
     * @returns {Promise<boolean>} Success status
     */
    async save() {
        try {
            const validation = this.validate();
            if (!validation.isValid) {
                throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
            }

            this.updatedAt = new Date();
            
            const collection = await db.gemsBalances();
            const result = await collection.replaceOne(
                { discordId: this.discordId },
                this.toDocument(),
                { upsert: true }
            );

            return result.acknowledged;
        } catch (error) {
            console.error('Error saving balance:', error);
            throw error;
        }
    }

    /**
     * Delete balance from database
     * @returns {Promise<boolean>} Success status
     */
    async delete() {
        try {
            const collection = await db.gemsBalances();
            const result = await collection.deleteOne({ discordId: this.discordId });
            return result.deletedCount > 0;
        } catch (error) {
            console.error('Error deleting balance:', error);
            throw error;
        }
    }

    /**
     * Get top balances for leaderboard
     * @param {number} limit - Number of results to return
     * @returns {Promise<GemsBalance[]>} Array of top balances
     */
    static async getTopBalances(limit = 10) {
        try {
            const collection = await db.gemsBalances();
            const docs = await collection.find({})
                .sort({ balance: -1 })
                .limit(limit)
                .toArray();
            
            return docs.map(doc => GemsBalance.fromDocument(doc));
        } catch (error) {
            console.error('Error getting top balances:', error);
            throw error;
        }
    }

    /**
     * Get user's leaderboard position
     * @param {string} discordId - Discord user ID
     * @returns {Promise<number>} Position (1-based) or 0 if not found
     */
    static async getUserPosition(discordId) {
        try {
            const userBalance = await GemsBalance.findByDiscordId(discordId);
            if (!userBalance) return 0;

            const collection = await db.gemsBalances();
            const higherCount = await collection.countDocuments({
                balance: { $gt: userBalance.balance }
            });

            return higherCount + 1;
        } catch (error) {
            console.error('Error getting user position:', error);
            throw error;
        }
    }
}

export default GemsBalance;