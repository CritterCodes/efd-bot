/**
 * DiscordUser.js
 * 
 * Model for Discord user verification data.
 * Defines data structures, validation, and transformation logic.
 * 
 * Responsibilities:
 * - Define Discord user data schema
 * - Validate user data
 * - Transform and format data
 * - Encapsulate data creation logic
 */

class DiscordUser {
    /**
     * Validation schemas for different user types
     */
    static SCHEMAS = {
        INDUSTRY_ROLES: ['jeweler', 'lapidarist', 'cad_designer', 'dealer', 'other'],
        REQUIRED_FIELDS: {
            BASE: ['discordId', 'username', 'type'],
            INDUSTRY: ['role', 'services'],
            COLLECTOR: ['ownsEfd']
        }
    };

    /**
     * Create a new industry professional user record
     * @param {Object} data - User data
     * @param {string} data.discordId - Discord user ID
     * @param {string} data.username - Discord username  
     * @param {string} data.role - Industry role
     * @param {Array} data.services - Services offered (array)
     * @param {Array} data.dealerProducts - Products sold (for dealers only)
     * @returns {Object} Formatted user data for database
     */
    static createIndustryUser({ discordId, username, role, services = [], dealerProducts = [] }) {
        // Validate required fields (include type for validation)
        this.validateRequired({ discordId, username, type: 'industry', role, services }, 'INDUSTRY');
        
        // Validate role
        if (!this.SCHEMAS.INDUSTRY_ROLES.includes(role)) {
            throw new Error(`Invalid industry role: ${role}. Must be one of: ${this.SCHEMAS.INDUSTRY_ROLES.join(', ')}`);
        }

        const userData = {
            discordId: this.sanitizeString(discordId),
            username: this.sanitizeString(username),
            type: 'industry',
            role: this.sanitizeString(role),
            services: Array.isArray(services) ? services : [],
            verifiedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true
        };

        // Add dealerProducts if provided (for dealer role)
        if (dealerProducts && dealerProducts.length > 0) {
            userData.dealerProducts = Array.isArray(dealerProducts) ? dealerProducts : [];
        }

        return userData;
    }

    /**
     * Create a new collector user record
     * @param {Object} data - User data
     * @param {string} data.discordId - Discord user ID
     * @param {string} data.username - Discord username
     * @param {boolean} data.ownsEfd - Whether user owns EFD jewelry
     * @param {string|null} [data.efdProof] - Proof of EFD ownership
     * @returns {Object} Formatted user data for database
     */
    static createCollectorUser({ discordId, username, ownsEfd, efdProof = null }) {
        // Validate required fields (include type for validation)
        this.validateRequired({ discordId, username, type: 'collector', ownsEfd }, 'COLLECTOR');
        
        // Validate ownsEfd is boolean
        if (typeof ownsEfd !== 'boolean') {
            throw new Error('ownsEfd must be a boolean value');
        }

        const userData = {
            discordId: this.sanitizeString(discordId),
            username: this.sanitizeString(username),
            type: 'collector',
            ownsEfd: Boolean(ownsEfd),
            verifiedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true
        };

        // Add EFD proof if provided
        if (efdProof) {
            userData.efdProof = this.sanitizeString(efdProof);
        }

        return userData;
    }

    /**
     * Update user data with new information
     * @param {Object} existingData - Current user data
     * @param {Object} updateData - Data to update
     * @returns {Object} Updated user data
     */
    static updateUser(existingData, updateData) {
        const allowedUpdates = ['username', 'services', 'efdProof', 'isActive'];
        const updatedData = { ...existingData };

        for (const [key, value] of Object.entries(updateData)) {
            if (allowedUpdates.includes(key)) {
                if (typeof value === 'string') {
                    updatedData[key] = this.sanitizeString(value);
                } else {
                    updatedData[key] = value;
                }
            }
        }

        updatedData.updatedAt = new Date();
        return updatedData;
    }

    /**
     * Validate required fields for user creation
     * @param {Object} data - Data to validate
     * @param {string} userType - Type of user (INDUSTRY or COLLECTOR)
     * @throws {Error} If validation fails
     */
    static validateRequired(data, userType) {
        const baseFields = this.SCHEMAS.REQUIRED_FIELDS.BASE;
        const typeFields = this.SCHEMAS.REQUIRED_FIELDS[userType] || [];
        const requiredFields = [...baseFields, ...typeFields];

        for (const field of requiredFields) {
            if (!data[field] && data[field] !== false) { // Allow false for boolean fields
                throw new Error(`Missing required field: ${field}`);
            }
        }
    }

    /**
     * Sanitize string input to prevent injection and ensure data quality
     * @param {string} input - String to sanitize
     * @returns {string} Sanitized string
     */
    static sanitizeString(input) {
        if (typeof input !== 'string') {
            return String(input);
        }
        
        return input
            .trim()
            .replace(/[<>]/g, '') // Remove potential HTML/XML tags
            .substring(0, 500); // Limit length
    }

    /**
     * Validate Discord ID format
     * @param {string} discordId - Discord ID to validate
     * @returns {boolean} Whether the Discord ID is valid
     */
    static isValidDiscordId(discordId) {
        // Discord IDs are snowflakes - 18-19 digit numbers
        const discordIdRegex = /^\d{17,19}$/;
        return discordIdRegex.test(discordId);
    }

    /**
     * Get user display name based on type and role
     * @param {Object} userData - User data object
     * @returns {string} Display name for the user
     */
    static getDisplayName(userData) {
        if (!userData) return 'Unknown User';
        
        switch (userData.type) {
            case 'industry':
                return `${userData.username} (${userData.role})`;
            case 'collector':
                return userData.ownsEfd 
                    ? `${userData.username} (EFD Owner)` 
                    : `${userData.username} (Collector)`;
            default:
                return userData.username;
        }
    }

    /**
     * Get verification summary for a user
     * @param {Object} userData - User data object
     * @returns {Object} Verification summary
     */
    static getVerificationSummary(userData) {
        if (!userData) return null;

        const summary = {
            discordId: userData.discordId,
            username: userData.username,
            type: userData.type,
            verifiedAt: userData.verifiedAt,
            displayName: this.getDisplayName(userData),
            isActive: userData.isActive
        };

        if (userData.type === 'industry') {
            summary.role = userData.role;
            summary.services = userData.services;
        } else if (userData.type === 'collector') {
            summary.ownsEfd = userData.ownsEfd;
            if (userData.efdProof) {
                summary.hasProof = true;
            }
        }

        return summary;
    }

    /**
     * Create a query object for database searches
     * @param {Object} filters - Filter parameters
     * @returns {Object} MongoDB query object
     */
    static createQuery(filters = {}) {
        const query = {};

        if (filters.discordId) {
            query.discordId = filters.discordId;
        }

        if (filters.type) {
            query.type = filters.type;
        }

        if (filters.role) {
            query.role = filters.role;
        }

        if (filters.ownsEfd !== undefined) {
            query.ownsEfd = filters.ownsEfd;
        }

        if (filters.isActive !== undefined) {
            query.isActive = filters.isActive;
        }

        if (filters.verifiedAfter) {
            query.verifiedAt = { $gte: new Date(filters.verifiedAfter) };
        }

        if (filters.verifiedBefore) {
            query.verifiedAt = { 
                ...query.verifiedAt, 
                $lte: new Date(filters.verifiedBefore) 
            };
        }

        return query;
    }

    /**
     * Get default projection for user queries (excluding sensitive data)
     * @returns {Object} MongoDB projection object
     */
    static getPublicProjection() {
        return {
            _id: 0,
            discordId: 1,
            username: 1,
            type: 1,
            role: 1,
            ownsEfd: 1,
            verifiedAt: 1,
            isActive: 1
            // Exclude: efdProof, services (may contain sensitive info)
        };
    }
}

export default DiscordUser;