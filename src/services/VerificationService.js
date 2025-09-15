/**
 * VerificationService.js
 * 
 * Service for handling Discord user verification operations.
 * Handles database interactions, Discord role management, and core verification logic.
 * 
 * Responsibilities:
 * - Database operations for Discord users
 * - Discord role assignment/removal
 * - User verification status management
 * - Data validation and transformation
 */

import { db } from '../lib/database.js';
import DiscordUser from '../models/DiscordUser.js';

class VerificationService {
    /**
     * Find a Discord user by their Discord ID
     * @param {string} discordId - The Discord user ID
     * @returns {Promise<Object|null>} User data or null if not found
     */
    async findUserByDiscordId(discordId) {
        try {
            await db.connect();
            const discordUsers = await db.discordUsers();
            return await discordUsers.findOne({ discordId });
        } catch (error) {
            console.error('Error finding user by Discord ID:', error);
            throw error;
        }
    }

    /**
     * Create a new industry professional user
     * @param {Object} userData - User data object
     * @param {string} userData.discordId - Discord user ID
     * @param {string} userData.username - Discord username
     * @param {string} userData.role - Industry role (designer, manufacturer, etc.)
     * @param {string} userData.services - Services offered
     * @returns {Promise<Object>} Created user data
     */
    async createIndustryUser({ discordId, username, role, services }) {
        try {
            const userData = DiscordUser.createIndustryUser({
                discordId,
                username,
                role,
                services
            });

            await db.connect();
            const discordUsers = await db.discordUsers();
            const result = await discordUsers.insertOne(userData);
            
            console.log(`Created industry user: ${username} (${role})`);
            return { ...userData, _id: result.insertedId };
        } catch (error) {
            console.error('Error creating industry user:', error);
            throw error;
        }
    }

    /**
     * Create a new collector user
     * @param {Object} userData - User data object
     * @param {string} userData.discordId - Discord user ID
     * @param {string} userData.username - Discord username
     * @param {boolean} userData.ownsEfd - Whether user owns EFD jewelry
     * @param {string} [userData.efdProof] - Proof of EFD ownership
     * @returns {Promise<Object>} Created user data
     */
    async createCollectorUser({ discordId, username, ownsEfd, efdProof = null }) {
        try {
            const userData = DiscordUser.createCollectorUser({
                discordId,
                username,
                ownsEfd,
                efdProof
            });

            await db.connect();
            const discordUsers = await db.discordUsers();
            const result = await discordUsers.insertOne(userData);
            
            console.log(`Created collector user: ${username} (EFD owner: ${ownsEfd})`);
            return { ...userData, _id: result.insertedId };
        } catch (error) {
            console.error('Error creating collector user:', error);
            throw error;
        }
    }

    /**
     * Reset verification status for a user
     * @param {string} discordId - Discord user ID to reset
     * @param {Object} guild - Discord guild object
     * @returns {Promise<Object>} Reset result with wasVerified flag
     */
    async resetVerification(discordId, guild) {
        try {
            await db.connect();
            const discordUsers = await db.discordUsers();
            
            // Check if user exists
            const existingUser = await discordUsers.findOne({ discordId });
            const wasVerified = !!existingUser;
            
            if (wasVerified) {
                // Delete from database
                await discordUsers.deleteOne({ discordId });
                
                // Remove Discord roles
                await this._removeVerificationRoles(guild, discordId);
                
                console.log(`Reset verification for user: ${discordId}`);
            }
            
            return { wasVerified };
        } catch (error) {
            console.error('Error resetting verification:', error);
            throw error;
        }
    }

    /**
     * Assign a Discord role to a user
     * @param {Object} guild - Discord guild object
     * @param {string} discordId - Discord user ID
     * @param {string} roleName - Name of the role to assign
     * @returns {Promise<boolean>} Success status
     */
    async assignDiscordRole(guild, discordId, roleName) {
        try {
            const member = await guild.members.fetch(discordId);
            await guild.roles.fetch(); // Refresh role cache
            
            const role = guild.roles.cache.find(r => r.name === roleName);
            if (!role) {
                console.log(`Role "${roleName}" not found in server`);
                return false;
            }
            
            await member.roles.add(role.id);
            console.log(`Assigned role "${roleName}" (ID: ${role.id}) to user ${member.user.username}`);
            return true;
        } catch (error) {
            console.error(`Error assigning role "${roleName}":`, error);
            return false;
        }
    }

    /**
     * Remove verification-related roles from a user
     * @private
     * @param {Object} guild - Discord guild object
     * @param {string} discordId - Discord user ID
     */
    async _removeVerificationRoles(guild, discordId) {
        const rolesToRemove = ['Jeweler', 'Collector', 'Industry Professional'];
        
        try {
            const member = await guild.members.fetch(discordId);
            await guild.roles.fetch(); // Refresh role cache
            
            for (const roleName of rolesToRemove) {
                const role = guild.roles.cache.find(r => r.name === roleName);
                if (role && member.roles.cache.has(role.id)) {
                    await member.roles.remove(role.id);
                    console.log(`Removed ${roleName} role from ${member.user.username}`);
                }
            }
        } catch (error) {
            console.error('Error removing verification roles:', error);
        }
    }

    /**
     * Get verification statistics
     * @returns {Promise<Object>} Verification statistics
     */
    async getVerificationStats() {
        try {
            await db.connect();
            const discordUsers = await db.discordUsers();
            
            const totalUsers = await discordUsers.countDocuments();
            const industryUsers = await discordUsers.countDocuments({ type: 'industry' });
            const collectors = await discordUsers.countDocuments({ type: 'collector' });
            const efdOwners = await discordUsers.countDocuments({ 
                type: 'collector', 
                ownsEfd: true 
            });
            
            return {
                total: totalUsers,
                industry: industryUsers,
                collectors: collectors,
                efdOwners: efdOwners
            };
        } catch (error) {
            console.error('Error getting verification stats:', error);
            throw error;
        }
    }

    /**
     * Get all verified users (admin function)
     * @param {Object} options - Query options
     * @param {string} [options.type] - Filter by user type
     * @param {number} [options.limit] - Limit results
     * @returns {Promise<Array>} Array of user data
     */
    async getAllVerifiedUsers(options = {}) {
        try {
            await db.connect();
            const discordUsers = await db.discordUsers();
            
            let query = {};
            if (options.type) {
                query.type = options.type;
            }
            
            let cursor = discordUsers.find(query);
            if (options.limit) {
                cursor = cursor.limit(options.limit);
            }
            
            return await cursor.toArray();
        } catch (error) {
            console.error('Error getting all verified users:', error);
            throw error;
        }
    }

    /**
     * Update user services (for industry professionals)
     * @param {string} discordId - Discord user ID
     * @param {string} services - New services string
     * @returns {Promise<boolean>} Success status
     */
    async updateUserServices(discordId, services) {
        try {
            await db.connect();
            const discordUsers = await db.discordUsers();
            
            const result = await discordUsers.updateOne(
                { discordId, type: 'industry' },
                { 
                    $set: { 
                        services,
                        updatedAt: new Date()
                    }
                }
            );
            
            return result.modifiedCount > 0;
        } catch (error) {
            console.error('Error updating user services:', error);
            throw error;
        }
    }

    /**
     * Assign Discord roles for industry professionals
     * @param {import('discord.js').Guild} guild - Discord guild
     * @param {string} userId - Discord user ID
     * @param {string} role - Industry role
     */
    async assignIndustryRoles(guild, userId, role) {
        try {
            const member = await guild.members.fetch(userId);
            // Fetch all roles to get updated cache
            await guild.roles.fetch();
            
            const roleName = role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');
            const discordRole = guild.roles.cache.find(r => r.name === roleName);
            
            if (discordRole) {
                await member.roles.add(discordRole.id);
                console.log(`Assigned role "${roleName}" (ID: ${discordRole.id}) to user ${member.user.username}`);
            } else {
                console.log(`Role "${roleName}" not found in server`);
            }
        } catch (error) {
            console.error('Error assigning industry roles:', error);
        }
    }

    /**
     * Assign Discord roles for collectors
     * @param {import('discord.js').Guild} guild - Discord guild  
     * @param {string} userId - Discord user ID
     * @param {boolean} ownsEfd - Whether user owns EFD jewelry
     */
    async assignCollectorRoles(guild, userId, ownsEfd) {
        try {
            const member = await guild.members.fetch(userId);
            // Fetch all roles to get updated cache
            await guild.roles.fetch();
            
            const roleNames = ownsEfd ? ['Collector', 'EFD Collector'] : ['Collector'];
            
            for (const roleName of roleNames) {
                const discordRole = guild.roles.cache.find(r => r.name === roleName);
                if (discordRole) {
                    await member.roles.add(discordRole.id);
                    console.log(`Assigned role "${roleName}" (ID: ${discordRole.id}) to user ${member.user.username}`);
                } else {
                    console.log(`Role "${roleName}" not found in server`);
                }
            }
        } catch (error) {
            console.error('Error assigning collector roles:', error);
        }
    }
}

export default VerificationService;