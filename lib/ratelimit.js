import { cache } from './redis.js';
import { log } from '../src/utils/logger.js';

/**
 * Rate limiter using Redis
 * Falls back to allowing requests if Redis is unavailable
 * 
 * @param {string} userId - User identifier
 * @param {string} command - Command name
 * @param {number} maxRequests - Maximum requests allowed
 * @param {number} windowSeconds - Time window in seconds
 * @returns {Promise<{allowed: boolean, remaining: number, resetIn: number}>}
 */
export async function checkRateLimit(userId, command, maxRequests = 5, windowSeconds = 60) {
    const key = `ratelimit:${userId}:${command}`;

    try {
        const current = await cache.incr(key, windowSeconds);

        // If Redis failed, allow the request (graceful degradation)
        if (current === 0) {
            return { allowed: true, remaining: maxRequests, resetIn: 0 };
        }

        const allowed = current <= maxRequests;
        const remaining = Math.max(0, maxRequests - current);

        if (!allowed) {
            log.security('Rate limit exceeded', userId, {
                command,
                attempts: current,
                limit: maxRequests
            });
        }

        return {
            allowed,
            remaining,
            resetIn: windowSeconds
        };
    } catch (e) {
        log.error('Rate limit check failed', e, { userId, command });
        // Allow request on error (fail open)
        return { allowed: true, remaining: maxRequests, resetIn: 0 };
    }
}

/**
 * Global rate limiter for all commands per user
 * Prevents spam across all commands
 * 
 * @param {string} userId - User identifier
 * @param {number} maxRequests - Maximum requests per minute
 * @returns {Promise<{allowed: boolean, remaining: number}>}
 */
export async function checkGlobalRateLimit(userId, maxRequests = 20) {
    return checkRateLimit(userId, 'global', maxRequests, 60);
}

/**
 * Track command usage for analytics
 * @param {string} command - Command name
 * @param {string} userId - User identifier
 */
export async function trackCommandUsage(command, userId) {
    try {
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const keys = [
            `stats:cmd:${command}:${date}`,
            `stats:user:${userId}:${date}`,
            `stats:global:${date}`
        ];

        for (const key of keys) {
            await cache.incr(key, 86400 * 7); // Keep stats for 7 days
        }
    } catch (e) {
        log.error('Failed to track command usage', e, { command, userId });
    }
}

/**
 * Get command statistics
 * @param {string} command - Command name
 * @param {number} days - Number of days to retrieve
 * @returns {Promise<object>} Usage statistics
 */
export async function getCommandStats(command, days = 7) {
    try {
        const stats = {};
        const today = new Date();

        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const key = `stats:cmd:${command}:${dateStr}`;

            const count = await cache.get(key) || 0;
            stats[dateStr] = count;
        }

        return stats;
    } catch (e) {
        log.error('Failed to get command stats', e, { command });
        return {};
    }
}
