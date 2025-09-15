// lib/constants.js
const Constants = {
    // Core Collections
    USERS_COLLECTION: 'users',
    DISCORD_USERS_COLLECTION: 'discordUsers',
    REPAIRS_COLLECTION: 'repairs',
    TASKS_COLLECTION: 'tasks',
    MATERIALS_COLLECTION: 'materials',
    PROCESSES_COLLECTION: 'processes',
    
    // Admin Collections
    ADMIN_SETTINGS_COLLECTION: 'adminSettings',
    ADMIN_SETTINGS_AUDIT_COLLECTION: 'adminSettingsAudit',
    
    // Additional Collections
    COLLECTORS_COLLECTION: 'collectors',
    CONTACT_REQUESTS_COLLECTION: 'contactRequests',
    CUSTOM_TICKETS_COLLECTION: 'customTickets',
    INVENTORY_COLLECTION: 'inventory',
    
    // Roadmap Collections
    ROADMAP_PHASES_COLLECTION: 'roadmapPhases',
    ROADMAP_TASKS_COLLECTION: 'roadmapTasks',
    ROADMAP_UPDATES_COLLECTION: 'roadmapUpdates',
    
    // GEMS Currency Collections
    GEMS_BALANCES_COLLECTION: 'gems_balances',
    GEMS_TRANSACTIONS_COLLECTION: 'gems_transactions',
    GEMS_SETTINGS_COLLECTION: 'gems_settings',
    
    // Legacy/Compatibility (to be phased out)
    REPAIRTASKS_COLLECTION: 'repairTasks', // Use TASKS_COLLECTION instead
    
    // Default Projections
    DEFAULT_PROJECTION: {
        _id: 0,
    },
    PUBLIC_USER_PROJECTION: {
        password: 0,
        verificationToken: 0,
        resetToken: 0,
        resetTokenExpiry: 0
    },
    
    // GEMS Schema Definitions
    GEMS_BALANCE_SCHEMA: {
        discordId: { type: 'string', required: true, unique: true },
        balance: { type: 'number', required: true, default: 0, min: 0 },
        lifetimeEarned: { type: 'number', required: true, default: 0, min: 0 },
        lifetimeSpent: { type: 'number', required: true, default: 0, min: 0 },
        lastActivity: { type: 'date', required: true, default: () => new Date() },
        createdAt: { type: 'date', required: true, default: () => new Date() },
        updatedAt: { type: 'date', required: true, default: () => new Date() }
    },
    
    GEMS_TRANSACTION_SCHEMA: {
        discordId: { type: 'string', required: true },
        type: { type: 'string', required: true, enum: ['earned', 'spent', 'transferred', 'bonus', 'admin_add', 'admin_remove'] },
        amount: { type: 'number', required: true },
        reason: { type: 'string', required: true },
        source: { type: 'string', required: true, enum: ['message', 'spotlight', 'verification', 'social', 'tip', 'admin', 'bonus'] },
        metadata: { type: 'object', default: {} },
        relatedUserId: { type: 'string', required: false }, // For transfers and tips
        timestamp: { type: 'date', required: true, default: () => new Date() }
    },
    
    GEMS_SETTINGS_SCHEMA: {
        settingKey: { type: 'string', required: true, unique: true },
        value: { type: 'any', required: true },
        description: { type: 'string', required: true },
        category: { type: 'string', required: true, enum: ['earning', 'spending', 'limits', 'features'] },
        updatedBy: { type: 'string', required: true },
        updatedAt: { type: 'date', required: true, default: () => new Date() }
    },
    
    // GEMS Default Settings
    GEMS_DEFAULT_SETTINGS: {
        'earning.message.daily_amount': { value: 5, description: 'GEMS earned for daily message activity', category: 'earning' },
        'earning.message.cooldown_hours': { value: 24, description: 'Hours between message activity rewards', category: 'earning' },
        'earning.showcase.amount': { value: 10, description: 'GEMS earned for showcase channel messages', category: 'earning' },
        'earning.verification.jewelry': { value: 500, description: 'GEMS earned for jewelry verification', category: 'earning' },
        'earning.verification.industry': { value: 100, description: 'GEMS earned for industry verification', category: 'earning' },
        'earning.spotlight.amount': { value: 250, description: 'GEMS earned for being spotlighted', category: 'earning' },
        'limits.tip.daily_max': { value: 100, description: 'Maximum GEMS that can be tipped per day', category: 'limits' },
        'limits.tip.min_amount': { value: 1, description: 'Minimum GEMS per tip', category: 'limits' },
        'limits.tip.max_amount': { value: 50, description: 'Maximum GEMS per single tip', category: 'limits' },
        'limits.earning.daily_max': { value: 100, description: 'Maximum GEMS that can be earned per day', category: 'limits' },
        'features.tips_enabled': { value: true, description: 'Enable/disable tip functionality', category: 'features' },
        'features.leaderboard_enabled': { value: true, description: 'Enable/disable leaderboard', category: 'features' },
        'features.daily_rewards_enabled': { value: true, description: 'Enable/disable daily activity rewards', category: 'features' }
    },
};

export default Constants;
