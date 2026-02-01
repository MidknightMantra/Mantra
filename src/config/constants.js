// Core Configuration Constants
export const CONFIG = {
    // Bot Identity
    BOT: {
        NAME: 'MANTRA',
        VERSION: '2.0.0',
        PREFIX: '.',
        OWNER: process.env.OWNER_NUMBER?.split(',') || []
    },

    // Performance & Limits
    PERFORMANCE: {
        PRESENCE_UPDATE_INTERVAL: 15000, // 15 seconds
        PLUGIN_LOAD_TIMEOUT: 5000,
        COMMAND_TIMEOUT: 30000,
        MAX_CONCURRENT_COMMANDS: 10
    },

    // Rate Limiting
    RATE_LIMIT: {
        ENABLED: true,
        MAX_COMMANDS_PER_MINUTE: 10,
        COOLDOWN_MS: 3000, // 3 seconds between same command
        BURST_LIMIT: 3 // Allow 3 rapid commands before rate limit
    },

    // Cache Settings
    CACHE: {
        ENABLED: true,
        TTL: 300000, // 5 minutes
        MAX_SIZE: 100,
        COMMAND_RESPONSE_CACHE: true
    },

    // Database
    DATABASE: {
        TYPE: process.env.DB_TYPE || 'memory', // 'redis', 'mongodb', or 'memory'
        URL: process.env.DB_URL || 'redis://localhost:6379',
        OPTIONS: {
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => Math.min(times * 50, 2000)
        }
    },

    // Logging
    LOGGING: {
        LEVEL: process.env.LOG_LEVEL || 'info',
        FORMAT: 'json', // 'json' or 'simple'
        FILE_LOGGING: true,
        CONSOLE_LOGGING: true,
        ERROR_FILE: 'logs/error.log',
        COMBINED_FILE: 'logs/combined.log'
    },

    // Anti-Features
    ANTI_DELETE: {
        ENABLED: true,
        STORE_DURATION: 3600, // 1 hour in seconds
        ARCHIVE_TO_OWNER: true
    },

    ANTI_VIEWONCE: {
        ENABLED: true,
        AUTO_SAVE: true,
        STEALTH_MODE: true
    },

    ANTI_LINK: {
        ENABLED: true,
        AUTO_KICK: true,
        WHITELIST_GROUPS: []
    },

    // Auto-Features
    AUTO_STATUS_VIEW: {
        ENABLED: true,
        APPEAR_IN_VIEWERS: true
    },

    // Server
    SERVER: {
        ENABLED: true,
        PORT: process.env.PORT || 8080,
        HOST: '0.0.0.0'
    },

    // Security
    SECURITY: {
        INPUT_VALIDATION: true,
        SANITIZE_INPUTS: true,
        AUDIT_LOG: true,
        MAX_MESSAGE_LENGTH: 10000
    },

    // Analytics
    ANALYTICS: {
        ENABLED: true,
        TRACK_COMMANDS: true,
        TRACK_USERS: true,
        TRACK_GROUPS: true
    }
};

// Emojis (keep for backward compatibility)
export const EMOJIS = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
    loading: '⏳',
    rocket: '🚀',
    fire: '🔥',
    star: '⭐'
};

// Message Templates
export const MESSAGES = {
    ERRORS: {
        RATE_LIMIT: '⚠️ Slow down! Wait {time}s before using this command again.',
        COOLDOWN: '⏳ Command on cooldown. Wait {time}s.',
        PERMISSION_DENIED: '🚫 You don\'t have permission to use this command.',
        ADMIN_ONLY: '👮 This command is for admins only.',
        OWNER_ONLY: '👑 This command is for bot owner only.',
        GROUP_ONLY: '👥 This command only works in groups.',
        PRIVATE_ONLY: '💬 This command only works in private chat.',
        INVALID_INPUT: '❌ Invalid input. {details}',
        COMMAND_FAILED: '⚠️ Command failed. Please try again later.',
        NOT_FOUND: '🔍 Not found.',
        NETWORK_ERROR: '🌐 Network error. Please check your connection.'
    },
    SUCCESS: {
        DONE: '✅ Done!',
        SAVED: '💾 Saved successfully.',
        DELETED: '🗑️ Deleted successfully.',
        UPDATED: '🔄 Updated successfully.'
    }
};

// Helper function to get config value with fallback
export function getConfig(path, fallback = null) {
    const keys = path.split('.');
    let value = CONFIG;

    for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
            value = value[key];
        } else {
            return fallback;
        }
    }

    return value;
}

// Validate configuration on load
export function validateConfig() {
    const errors = [];

    if (!CONFIG.BOT.OWNER || CONFIG.BOT.OWNER.length === 0) {
        errors.push('OWNER_NUMBER not set in environment');
    }

    if (CONFIG.DATABASE.TYPE === 'redis' && !CONFIG.DATABASE.URL) {
        errors.push('DB_URL not set for Redis database');
    }

    if (errors.length > 0) {
        console.warn('⚠️ Configuration warnings:', errors);
    }

    return errors.length === 0;
}
