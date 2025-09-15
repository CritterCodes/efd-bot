/**
 * Validation Middleware
 * Reusable validation functions for Discord commands and inputs
 */

/**
 * Validate Discord user ID format
 * @param {string} userId - Discord user ID to validate
 * @returns {Object} Validation result
 */
export function validateUserId(userId) {
    if (!userId) {
        return { isValid: false, error: 'User ID is required' };
    }

    if (typeof userId !== 'string') {
        return { isValid: false, error: 'User ID must be a string' };
    }

    // Discord snowflake IDs are 17-19 digits
    if (!/^\d{17,19}$/.test(userId)) {
        return { isValid: false, error: 'Invalid user ID format' };
    }

    return { isValid: true };
}

/**
 * Validate GEMS amount
 * @param {number} amount - Amount to validate
 * @param {Object} [options={}] - Validation options
 * @param {number} [options.min=1] - Minimum allowed amount
 * @param {number} [options.max=Infinity] - Maximum allowed amount
 * @param {boolean} [options.allowZero=false] - Whether to allow zero
 * @returns {Object} Validation result
 */
export function validateAmount(amount, options = {}) {
    const { min = 1, max = Infinity, allowZero = false } = options;

    if (amount === undefined || amount === null) {
        return { isValid: false, error: 'Amount is required' };
    }

    if (typeof amount !== 'number') {
        return { isValid: false, error: 'Amount must be a number' };
    }

    if (isNaN(amount) || !isFinite(amount)) {
        return { isValid: false, error: 'Amount must be a valid number' };
    }

    if (!allowZero && amount <= 0) {
        return { isValid: false, error: 'Amount must be positive' };
    }

    if (allowZero && amount < 0) {
        return { isValid: false, error: 'Amount cannot be negative' };
    }

    if (amount < min) {
        return { isValid: false, error: `Amount must be at least ${min}` };
    }

    if (amount > max) {
        return { isValid: false, error: `Amount cannot exceed ${max}` };
    }

    // Check for decimal places (GEMS are whole numbers)
    if (amount % 1 !== 0) {
        return { isValid: false, error: 'Amount must be a whole number' };
    }

    return { isValid: true };
}

/**
 * Validate reason string
 * @param {string} reason - Reason to validate
 * @param {Object} [options={}] - Validation options
 * @param {number} [options.minLength=3] - Minimum length
 * @param {number} [options.maxLength=500] - Maximum length
 * @param {boolean} [options.required=true] - Whether reason is required
 * @returns {Object} Validation result
 */
export function validateReason(reason, options = {}) {
    const { minLength = 3, maxLength = 500, required = true } = options;

    if (!reason || reason.trim() === '') {
        if (required) {
            return { isValid: false, error: 'Reason is required' };
        }
        return { isValid: true };
    }

    if (typeof reason !== 'string') {
        return { isValid: false, error: 'Reason must be a string' };
    }

    const trimmedReason = reason.trim();

    if (trimmedReason.length < minLength) {
        return { isValid: false, error: `Reason must be at least ${minLength} characters` };
    }

    if (trimmedReason.length > maxLength) {
        return { isValid: false, error: `Reason must be ${maxLength} characters or less` };
    }

    // Check for invalid characters (basic sanitization)
    if (/[<>]/.test(trimmedReason)) {
        return { isValid: false, error: 'Reason contains invalid characters' };
    }

    return { isValid: true, sanitized: trimmedReason };
}

/**
 * Validate Discord command interaction
 * @param {import('discord.js').CommandInteraction} interaction - Discord interaction
 * @returns {Object} Validation result
 */
export function validateInteraction(interaction) {
    if (!interaction) {
        return { isValid: false, error: 'Interaction is required' };
    }

    if (!interaction.user) {
        return { isValid: false, error: 'Interaction must have a user' };
    }

    if (!interaction.user.id) {
        return { isValid: false, error: 'User must have an ID' };
    }

    if (!interaction.guild) {
        return { isValid: false, error: 'Command must be used in a server' };
    }

    return { isValid: true };
}

/**
 * Validate pagination parameters
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} Validation result
 */
export function validatePagination(page, limit) {
    const pageValidation = validateAmount(page, { min: 1, max: 1000 });
    if (!pageValidation.isValid) {
        return { isValid: false, error: `Page ${pageValidation.error.toLowerCase()}` };
    }

    const limitValidation = validateAmount(limit, { min: 1, max: 100 });
    if (!limitValidation.isValid) {
        return { isValid: false, error: `Limit ${limitValidation.error.toLowerCase()}` };
    }

    return { isValid: true };
}

/**
 * Sanitize user input string
 * @param {string} input - Input to sanitize
 * @param {Object} [options={}] - Sanitization options
 * @param {boolean} [options.removeEmojis=false] - Remove emoji characters
 * @param {boolean} [options.removeMentions=true] - Remove Discord mentions
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input, options = {}) {
    if (typeof input !== 'string') return '';

    const { removeEmojis = false, removeMentions = true } = options;
    let sanitized = input.trim();

    // Remove Discord mentions (@user, @role, #channel)
    if (removeMentions) {
        sanitized = sanitized.replace(/<[@#][!&]?\d+>/g, '');
    }

    // Remove emojis if requested
    if (removeEmojis) {
        sanitized = sanitized.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
    }

    // Remove excessive whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    return sanitized;
}

/**
 * Create a validation middleware function
 * @param {Function} validator - Validation function
 * @returns {Function} Middleware function
 */
export function createValidationMiddleware(validator) {
    return async (interaction, next) => {
        try {
            const validation = await validator(interaction);
            if (!validation.isValid) {
                await interaction.reply({
                    content: `❌ ${validation.error}`,
                    ephemeral: true
                });
                return;
            }
            await next();
        } catch (error) {
            console.error('Validation middleware error:', error);
            await interaction.reply({
                content: '❌ An error occurred during validation.',
                ephemeral: true
            });
        }
    };
}

/**
 * Validate transfer operation parameters
 * @param {string} fromUserId - Sender user ID
 * @param {string} toUserId - Recipient user ID
 * @param {number} amount - Transfer amount
 * @param {string} reason - Transfer reason
 * @returns {Object} Validation result
 */
export function validateTransfer(fromUserId, toUserId, amount, reason) {
    // Validate sender
    const fromValidation = validateUserId(fromUserId);
    if (!fromValidation.isValid) {
        return { isValid: false, error: `Sender: ${fromValidation.error}` };
    }

    // Validate recipient
    const toValidation = validateUserId(toUserId);
    if (!toValidation.isValid) {
        return { isValid: false, error: `Recipient: ${toValidation.error}` };
    }

    // Check if same user
    if (fromUserId === toUserId) {
        return { isValid: false, error: 'Cannot transfer GEMS to yourself' };
    }

    // Validate amount
    const amountValidation = validateAmount(amount);
    if (!amountValidation.isValid) {
        return { isValid: false, error: amountValidation.error };
    }

    // Validate reason
    const reasonValidation = validateReason(reason);
    if (!reasonValidation.isValid) {
        return { isValid: false, error: reasonValidation.error };
    }

    return { 
        isValid: true, 
        sanitizedReason: reasonValidation.sanitized 
    };
}

export default {
    validateUserId,
    validateAmount,
    validateReason,
    validateInteraction,
    validatePagination,
    validateTransfer,
    sanitizeInput,
    createValidationMiddleware
};