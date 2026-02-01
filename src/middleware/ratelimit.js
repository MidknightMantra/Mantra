import { CONFIG, MESSAGES } from '../config/constants.js';
import { log } from '../utils/logger.js';

/**
 * Rate limiting cache
 * Structure: { userId: { count: number, resetTime: timestamp, commands: {commandName: timestamp} } }
 */
const rateLimitCache = new Map();
const cooldownCache = new Map();

/**
 * Rate limit middleware
 * Prevents users from spamming commands
 */
export function rateLimitMiddleware(m, commandName) {
    if (!CONFIG.RATE_LIMIT.ENABLED) return;

    const userId = m.sender;
    const now = Date.now();
    const minute = 60000;

    // Get or create user's rate limit data
    let userData = rateLimitCache.get(userId);

    if (!userData || now > userData.resetTime) {
        // Reset or create new window
        userData = {
            count: 0,
            resetTime: now + minute,
            commands: {}
        };
        rateLimitCache.set(userId, userData);
    }

    // Check global rate limit
    if (userData.count >= CONFIG.RATE_LIMIT.MAX_COMMANDS_PER_MINUTE) {
        const waitTime = Math.ceil((userData.resetTime - now) / 1000);
        const message = MESSAGES.ERRORS.RATE_LIMIT.replace('{time}', waitTime);

        log.security('Rate limit exceeded', {
            user: userId.split('@')[0],
            command: commandName,
            count: userData.count
        });

        throw new Error(message);
    }

    // Increment counter
    userData.count++;
}

/**
 * Cooldown middleware
 * Prevents rapid use of the same command
 */
export function cooldownMiddleware(m, commandName) {
    if (!CONFIG.RATE_LIMIT.ENABLED) return;

    const key = `${m.sender}:${commandName}`;
    const lastUsed = cooldownCache.get(key);
    const now = Date.now();

    if (lastUsed && now - lastUsed < CONFIG.RATE_LIMIT.COOLDOWN_MS) {
        const waitTime = Math.ceil((CONFIG.RATE_LIMIT.COOLDOWN_MS - (now - lastUsed)) / 1000);
        const message = MESSAGES.ERRORS.COOLDOWN.replace('{time}', waitTime);
        throw new Error(message);
    }

    // Update last used time
    cooldownCache.set(key, now);

    // Cleanup old entries (every 100 commands)
    if (cooldownCache.size > 1000) {
        const cutoff = now - CONFIG.RATE_LIMIT.COOLDOWN_MS;
        for (const [k, v] of cooldownCache.entries()) {
            if (v < cutoff) cooldownCache.delete(k);
        }
    }
}

/**
 * Clear rate limits for a user (admin function)
 */
export function clearRateLimit(userId) {
    rateLimitCache.delete(userId);

    // Clear all cooldowns for this user
    for (const key of cooldownCache.keys()) {
        if (key.startsWith(userId)) {
            cooldownCache.delete(key);
        }
    }

    log.action('Rate limit cleared', 'admin', { user: userId });
}

/**
 * Get rate limit stats
 */
export function getRateLimitStats(userId) {
    const data = rateLimitCache.get(userId);
    return data || { count: 0, resetTime: 0 };
}

export default {
    rateLimitMiddleware,
    cooldownMiddleware,
    clearRateLimit,
    getRateLimitStats
};
