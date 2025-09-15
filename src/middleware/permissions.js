/**
 * Permissions Middleware
 * Handles permission checking and role-based access control
 */

/**
 * Check if user has required permissions
 * @param {import('discord.js').GuildMember} member - Guild member
 * @param {string|string[]} requiredPermissions - Required permission(s)
 * @returns {boolean} Whether user has permissions
 */
export function hasPermission(member, requiredPermissions) {
    if (!member || !member.permissions) return false;

    const permissions = Array.isArray(requiredPermissions) 
        ? requiredPermissions 
        : [requiredPermissions];

    return permissions.some(permission => 
        member.permissions.has(permission)
    );
}

/**
 * Check if user has admin permissions
 * @param {import('discord.js').GuildMember} member - Guild member
 * @returns {boolean} Whether user is admin
 */
export function isAdmin(member) {
    return hasPermission(member, ['Administrator', 'ManageGuild']);
}

/**
 * Check if user has moderator permissions
 * @param {import('discord.js').GuildMember} member - Guild member
 * @returns {boolean} Whether user is moderator
 */
export function isModerator(member) {
    return hasPermission(member, [
        'Administrator',
        'ManageGuild',
        'ModerateMembers',
        'ManageMessages',
        'KickMembers',
        'BanMembers'
    ]);
}

/**
 * Check if user can manage GEMS (admin/mod permissions)
 * @param {import('discord.js').GuildMember} member - Guild member
 * @returns {boolean} Whether user can manage GEMS
 */
export function canManageGems(member) {
    return isModerator(member);
}

/**
 * Check if user is verified (check database record)
 * @param {import('discord.js').GuildMember} member - Guild member
 * @returns {Promise<boolean>} Whether user is verified
 */
export async function isVerified(member) {
    if (!member) return false;
    
    try {
        // Import here to avoid circular dependencies
        const { db } = await import('../lib/database.js');
        await db.connect();
        const discordUsers = await db.discordUsers();
        
        const user = await discordUsers.findOne({ 
            discordId: member.user.id,
            isActive: true 
        });
        
        return !!user; // Return true if user exists and is active
    } catch (error) {
        console.error('Error checking verification status:', error);
        return false;
    }
}

/**
 * Get user's highest role position
 * @param {import('discord.js').GuildMember} member - Guild member
 * @returns {number} Highest role position
 */
export function getHighestRolePosition(member) {
    if (!member || !member.roles) return 0;
    return member.roles.highest.position;
}

/**
 * Check if user can target another user (role hierarchy)
 * @param {import('discord.js').GuildMember} executor - User performing action
 * @param {import('discord.js').GuildMember} target - Target user
 * @returns {boolean} Whether executor can target the user
 */
export function canTargetUser(executor, target) {
    if (!executor || !target) return false;
    
    // Owners can target anyone
    if (executor.guild.ownerId === executor.id) return true;
    
    // Can't target yourself (for some operations)
    if (executor.id === target.id) return false;
    
    // Can't target guild owner unless you are the owner
    if (target.guild.ownerId === target.id) return false;
    
    // Check role hierarchy
    const executorPosition = getHighestRolePosition(executor);
    const targetPosition = getHighestRolePosition(target);
    
    return executorPosition > targetPosition;
}

/**
 * Rate limiting storage
 * Simple in-memory rate limiting (consider Redis for production)
 */
const rateLimits = new Map();

/**
 * Check and update rate limit for user
 * @param {string} userId - User ID
 * @param {string} action - Action being performed
 * @param {Object} [options={}] - Rate limit options
 * @param {number} [options.maxAttempts=5] - Maximum attempts
 * @param {number} [options.windowMs=60000] - Time window in milliseconds
 * @returns {Object} Rate limit result
 */
export function checkRateLimit(userId, action, options = {}) {
    const { maxAttempts = 5, windowMs = 60000 } = options;
    const key = `${userId}:${action}`;
    const now = Date.now();
    
    if (!rateLimits.has(key)) {
        rateLimits.set(key, { count: 1, resetTime: now + windowMs });
        return { allowed: true, remaining: maxAttempts - 1, resetTime: now + windowMs };
    }
    
    const limit = rateLimits.get(key);
    
    // Reset if window has passed
    if (now >= limit.resetTime) {
        rateLimits.set(key, { count: 1, resetTime: now + windowMs });
        return { allowed: true, remaining: maxAttempts - 1, resetTime: now + windowMs };
    }
    
    // Check if limit exceeded
    if (limit.count >= maxAttempts) {
        return { 
            allowed: false, 
            remaining: 0, 
            resetTime: limit.resetTime,
            retryAfter: limit.resetTime - now
        };
    }
    
    // Increment counter
    limit.count++;
    rateLimits.set(key, limit);
    
    return { 
        allowed: true, 
        remaining: maxAttempts - limit.count, 
        resetTime: limit.resetTime 
    };
}

/**
 * Clear rate limit for user and action
 * @param {string} userId - User ID
 * @param {string} action - Action to clear
 */
export function clearRateLimit(userId, action) {
    const key = `${userId}:${action}`;
    rateLimits.delete(key);
}

/**
 * Clean up expired rate limits
 * Call this periodically to prevent memory leaks
 */
export function cleanupRateLimits() {
    const now = Date.now();
    for (const [key, limit] of rateLimits.entries()) {
        if (now >= limit.resetTime) {
            rateLimits.delete(key);
        }
    }
}

/**
 * Create permission check middleware
 * @param {Function} permissionChecker - Function to check permissions
 * @param {string} [errorMessage] - Custom error message
 * @returns {Function} Middleware function
 */
export function requirePermission(permissionChecker, errorMessage) {
    return async (interaction, next) => {
        try {
            const member = interaction.member;
            
            if (!member) {
                await interaction.reply({
                    content: '❌ This command can only be used in a server.',
                    flags: 64
                });
                return;
            }
            
            const hasRequiredPermission = await permissionChecker(member);
            
            if (!hasRequiredPermission) {
                await interaction.reply({
                    content: errorMessage || '❌ You do not have permission to use this command.',
                    flags: 64
                });
                return;
            }
            
            await next();
        } catch (error) {
            console.error('Permission middleware error:', error);
            await interaction.reply({
                content: '❌ An error occurred while checking permissions.',
                flags: 64
            });
        }
    };
}

/**
 * Create rate limit middleware
 * @param {string} action - Action identifier
 * @param {Object} [options={}] - Rate limit options
 * @returns {Function} Middleware function
 */
export function requireRateLimit(action, options = {}) {
    return async (interaction, next) => {
        try {
            const userId = interaction.user.id;
            const rateLimit = checkRateLimit(userId, action, options);
            
            if (!rateLimit.allowed) {
                const retryAfterSeconds = Math.ceil(rateLimit.retryAfter / 1000);
                await interaction.reply({
                    content: `❌ Rate limit exceeded. Please try again in ${retryAfterSeconds} seconds.`,
                    flags: 64
                });
                return;
            }
            
            await next();
        } catch (error) {
            console.error('Rate limit middleware error:', error);
            await interaction.reply({
                content: '❌ An error occurred while checking rate limits.',
                flags: 64
            });
        }
    };
}

// Pre-configured middleware functions
export const requireAdmin = requirePermission(isAdmin, '❌ This command requires administrator permissions.');
export const requireModerator = requirePermission(isModerator, '❌ This command requires moderator permissions.');
export const requireVerified = requirePermission(isVerified, '❌ This command requires verification. Please verify your account first.');
export const requireGemsManager = requirePermission(canManageGems, '❌ This command requires GEMS management permissions.');

// Pre-configured rate limits
export const gemsCommandRateLimit = requireRateLimit('gems_command', { maxAttempts: 10, windowMs: 60000 });
export const transferRateLimit = requireRateLimit('gems_transfer', { maxAttempts: 3, windowMs: 300000 }); // 5 minutes
export const adminRateLimit = requireRateLimit('gems_admin', { maxAttempts: 20, windowMs: 60000 });

// Cleanup interval (run every 5 minutes)
setInterval(cleanupRateLimits, 300000);

export default {
    hasPermission,
    isAdmin,
    isModerator,
    canManageGems,
    isVerified,
    canTargetUser,
    checkRateLimit,
    clearRateLimit,
    cleanupRateLimits,
    requirePermission,
    requireRateLimit,
    requireAdmin,
    requireModerator,
    requireVerified,
    requireGemsManager,
    gemsCommandRateLimit,
    transferRateLimit,
    adminRateLimit
};