import Constants from '../lib/constants.js';
import { db } from '../lib/database.js';

/**
 * GEMS Transaction Model
 * Handles data structure and validation for GEMS transactions
 */
export class Transaction {
    /**
     * Create a new Transaction instance
     * @param {Object} data - Transaction data
     * @param {string} data.discordId - Discord user ID
     * @param {string} data.type - Transaction type (earned, spent, transferred, bonus, admin_add, admin_remove)
     * @param {number} data.amount - Transaction amount
     * @param {string} data.reason - Reason for transaction
     * @param {string} data.source - Transaction source (message, spotlight, verification, social, tip, admin, bonus)
     * @param {Object} [data.metadata] - Additional transaction metadata
     * @param {string} [data.relatedUserId] - Related user ID for transfers
     * @param {Date} [data.timestamp] - Transaction timestamp
     */
    constructor(data) {
        this.discordId = data.discordId;
        this.type = data.type;
        this.amount = data.amount;
        this.reason = data.reason;
        this.source = data.source;
        this.metadata = data.metadata || {};
        this.relatedUserId = data.relatedUserId || null;
        this.timestamp = data.timestamp || new Date();
    }

    /**
     * Validate transaction data against schema
     * @returns {Object} Validation result
     */
    validate() {
        const errors = [];
        const validTypes = ['earned', 'spent', 'transferred', 'bonus', 'admin_add', 'admin_remove'];
        const validSources = ['message', 'spotlight', 'verification', 'social', 'tip', 'admin', 'bonus'];

        // Required fields
        if (!this.discordId) errors.push('discordId is required');
        if (!this.type) errors.push('type is required');
        if (this.amount === undefined || this.amount === null) errors.push('amount is required');
        if (!this.reason) errors.push('reason is required');
        if (!this.source) errors.push('source is required');

        // Type validation
        if (typeof this.discordId !== 'string') errors.push('discordId must be a string');
        if (typeof this.type !== 'string') errors.push('type must be a string');
        if (typeof this.amount !== 'number') errors.push('amount must be a number');
        if (typeof this.reason !== 'string') errors.push('reason must be a string');
        if (typeof this.source !== 'string') errors.push('source must be a string');

        // Value validation
        if (!validTypes.includes(this.type)) {
            errors.push(`type must be one of: ${validTypes.join(', ')}`);
        }
        if (!validSources.includes(this.source)) {
            errors.push(`source must be one of: ${validSources.join(', ')}`);
        }
        if (this.amount <= 0) errors.push('amount must be positive');
        if (this.reason.length < 3) errors.push('reason must be at least 3 characters');
        if (this.reason.length > 500) errors.push('reason must be 500 characters or less');

        // Transfer validation
        if (this.type === 'transferred' && !this.relatedUserId) {
            errors.push('relatedUserId is required for transfer transactions');
        }

        // Date validation
        if (!(this.timestamp instanceof Date)) errors.push('timestamp must be a Date');

        // Metadata validation
        if (this.metadata && typeof this.metadata !== 'object') {
            errors.push('metadata must be an object');
        }

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
            type: this.type,
            amount: this.amount,
            reason: this.reason,
            source: this.source,
            metadata: this.metadata,
            relatedUserId: this.relatedUserId,
            timestamp: this.timestamp
        };
    }

    /**
     * Create Transaction from database document
     * @param {Object} doc - Database document
     * @returns {Transaction} New instance
     */
    static fromDocument(doc) {
        return new Transaction(doc);
    }

    /**
     * Save transaction to database
     * @returns {Promise<boolean>} Success status
     */
    async save() {
        try {
            const validation = this.validate();
            if (!validation.isValid) {
                throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
            }

            const collection = await db.gemsTransactions();
            const result = await collection.insertOne(this.toDocument());
            return result.acknowledged;
        } catch (error) {
            console.error('Error saving transaction:', error);
            throw error;
        }
    }

    /**
     * Find transactions by Discord ID
     * @param {string} discordId - Discord user ID
     * @param {Object} options - Query options
     * @param {number} [options.limit=50] - Maximum number of results
     * @param {number} [options.skip=0] - Number of results to skip
     * @param {string} [options.type] - Filter by transaction type
     * @param {Date} [options.startDate] - Filter by start date
     * @param {Date} [options.endDate] - Filter by end date
     * @returns {Promise<Transaction[]>} Array of transactions
     */
    static async findByDiscordId(discordId, options = {}) {
        try {
            const {
                limit = 50,
                skip = 0,
                type,
                startDate,
                endDate
            } = options;

            const query = { discordId };
            
            if (type) query.type = type;
            if (startDate || endDate) {
                query.timestamp = {};
                if (startDate) query.timestamp.$gte = startDate;
                if (endDate) query.timestamp.$lte = endDate;
            }

            const collection = await db.gemsTransactions();
            const docs = await collection.find(query)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit)
                .toArray();

            return docs.map(doc => Transaction.fromDocument(doc));
        } catch (error) {
            console.error('Error finding transactions by Discord ID:', error);
            throw error;
        }
    }

    /**
     * Get transaction statistics for a user
     * @param {string} discordId - Discord user ID
     * @param {Date} [startDate] - Start date for statistics
     * @param {Date} [endDate] - End date for statistics
     * @returns {Promise<Object>} Transaction statistics
     */
    static async getUserStats(discordId, startDate, endDate) {
        try {
            const match = { discordId };
            if (startDate || endDate) {
                match.timestamp = {};
                if (startDate) match.timestamp.$gte = startDate;
                if (endDate) match.timestamp.$lte = endDate;
            }

            const collection = await db.gemsTransactions();
            const pipeline = [
                { $match: match },
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 },
                        totalAmount: { $sum: '$amount' }
                    }
                }
            ];

            const results = await collection.aggregate(pipeline).toArray();
            
            const stats = {
                totalTransactions: 0,
                earned: { count: 0, amount: 0 },
                spent: { count: 0, amount: 0 },
                transferred: { count: 0, amount: 0 },
                bonuses: { count: 0, amount: 0 },
                adminActions: { count: 0, amount: 0 }
            };

            results.forEach(result => {
                stats.totalTransactions += result.count;
                
                switch (result._id) {
                    case 'earned':
                        stats.earned = { count: result.count, amount: result.totalAmount };
                        break;
                    case 'spent':
                        stats.spent = { count: result.count, amount: result.totalAmount };
                        break;
                    case 'transferred':
                        stats.transferred = { count: result.count, amount: result.totalAmount };
                        break;
                    case 'bonus':
                        stats.bonuses = { count: result.count, amount: result.totalAmount };
                        break;
                    case 'admin_add':
                    case 'admin_remove':
                        stats.adminActions.count += result.count;
                        stats.adminActions.amount += result.totalAmount;
                        break;
                }
            });

            return stats;
        } catch (error) {
            console.error('Error getting user transaction stats:', error);
            throw error;
        }
    }

    /**
     * Delete old transactions (for cleanup)
     * @param {Date} beforeDate - Delete transactions before this date
     * @returns {Promise<number>} Number of deleted transactions
     */
    static async deleteOld(beforeDate) {
        try {
            const collection = await db.gemsTransactions();
            const result = await collection.deleteMany({
                timestamp: { $lt: beforeDate }
            });
            return result.deletedCount;
        } catch (error) {
            console.error('Error deleting old transactions:', error);
            throw error;
        }
    }

    /**
     * Get recent transactions across all users (admin view)
     * @param {number} limit - Number of results to return
     * @returns {Promise<Transaction[]>} Array of recent transactions
     */
    static async getRecent(limit = 20) {
        try {
            const collection = await db.gemsTransactions();
            const docs = await collection.find({})
                .sort({ timestamp: -1 })
                .limit(limit)
                .toArray();

            return docs.map(doc => Transaction.fromDocument(doc));
        } catch (error) {
            console.error('Error getting recent transactions:', error);
            throw error;
        }
    }
}

export default Transaction;