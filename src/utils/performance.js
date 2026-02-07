/**
 * Performance Monitoring System
 * Tracks command execution times and provides performance metrics
 */

import { cache } from '../../lib/redis.js';
import { log } from './logger.js';

// In-memory fallback if Redis is unavailable
const memoryStats = new Map();

/**
 * Record command execution time
 * @param {string} command - Command name
 * @param {number} duration - Execution time in milliseconds
 * @param {boolean} success - Whether command succeeded
 * @param {string} userId - User ID for per-user tracking
 */
export async function recordCommandTime(command, duration, success = true, userId = null) {
    try {
        const timestamp = Date.now();
        const dateKey = new Date().toISOString().split('T')[0];

        // Store in Redis if available
        const statsKey = `perf:${command}:${dateKey}`;
        const currentStats = await cache.get(statsKey) || {
            count: 0,
            totalTime: 0,
            minTime: Infinity,
            maxTime: 0,
            failures: 0,
            times: []
        };

        currentStats.count++;
        currentStats.totalTime += duration;
        currentStats.minTime = Math.min(currentStats.minTime, duration);
        currentStats.maxTime = Math.max(currentStats.maxTime, duration);
        if (!success) currentStats.failures++;

        // Keep last 100 execution times for percentile calculations
        currentStats.times.push(duration);
        if (currentStats.times.length > 100) {
            currentStats.times = currentStats.times.slice(-100);
        }

        await cache.set(statsKey, currentStats, 86400 * 7); // Keep 7 days

        // Log slow commands (>5 seconds)
        if (duration > 5000) {
            log.warn(`Slow command detected: ${command}`, {
                duration: `${(duration / 1000).toFixed(2)}s`,
                user: userId,
                success
            });
        }

        // Fallback to memory
        if (!await cache.exists(statsKey)) {
            memoryStats.set(statsKey, currentStats);
        }

    } catch (error) {
        log.error('Failed to record command time', error, { command, duration });
    }
}

/**
 * Get statistics for a specific command
 * @param {string} command - Command name
 * @param {number} days - Number of days to retrieve (default: 7)
 * @returns {Promise<object>} Command statistics
 */
export async function getCommandStats(command, days = 7) {
    try {
        const stats = {
            command,
            period: `${days} days`,
            totalExecutions: 0,
            totalTime: 0,
            avgTime: 0,
            minTime: Infinity,
            maxTime: 0,
            failures: 0,
            successRate: 100,
            dailyStats: {}
        };

        const today = new Date();

        for (let i = 0; i < days; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const key = `perf:${command}:${dateStr}`;

            let dayStats = await cache.get(key);

            // Fallback to memory
            if (!dayStats && memoryStats.has(key)) {
                dayStats = memoryStats.get(key);
            }

            if (dayStats) {
                stats.totalExecutions += dayStats.count;
                stats.totalTime += dayStats.totalTime;
                stats.minTime = Math.min(stats.minTime, dayStats.minTime);
                stats.maxTime = Math.max(stats.maxTime, dayStats.maxTime);
                stats.failures += dayStats.failures || 0;
                stats.dailyStats[dateStr] = {
                    count: dayStats.count,
                    avgTime: Math.round(dayStats.totalTime / dayStats.count),
                    failures: dayStats.failures || 0
                };
            }
        }

        if (stats.totalExecutions > 0) {
            stats.avgTime = Math.round(stats.totalTime / stats.totalExecutions);
            stats.successRate = Math.round(((stats.totalExecutions - stats.failures) / stats.totalExecutions) * 100);
        }

        if (stats.minTime === Infinity) stats.minTime = 0;

        return stats;

    } catch (error) {
        log.error('Failed to get command stats', error, { command });
        return null;
    }
}

/**
 * Get top N slowest commands
 * @param {number} limit - Number of commands to return (default: 10)
 * @returns {Promise<Array>} Array of {command, avgTime, count}
 */
export async function getTopSlowCommands(limit = 10) {
    try {
        const commandStats = new Map();
        const dateKey = new Date().toISOString().split('T')[0];

        // This is simplified - in production you'd want to track all commands
        // For now, we'll aggregate from recent stats
        const allKeys = [];

        // Try to get all perf keys from Redis (this is a simplified version)
        // In a real implementation, you'd maintain a set of tracked commands

        return Array.from(commandStats.entries())
            .map(([cmd, stats]) => ({
                command: cmd,
                avgTime: Math.round(stats.totalTime / stats.count),
                count: stats.count,
                failures: stats.failures || 0
            }))
            .sort((a, b) => b.avgTime - a.avgTime)
            .slice(0, limit);

    } catch (error) {
        log.error('Failed to get slow commands', error);
        return [];
    }
}

/**
 * Get overall system performance metrics
 * @returns {Promise<object>} System performance metrics
 */
export async function getSystemMetrics() {
    try {
        const dateKey = new Date().toISOString().split('T')[0];
        const metrics = {
            date: dateKey,
            totalCommands: 0,
            totalTime: 0,
            avgResponseTime: 0,
            cacheHitRate: 0,
            uptime: process.uptime(),
            memory: {
                used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
            }
        };

        return metrics;

    } catch (error) {
        log.error('Failed to get system metrics', error);
        return null;
    }
}

/**
 * Reset statistics older than specified days
 * @param {number} daysToKeep - Number of days to keep (default: 7)
 */
export async function cleanOldStats(daysToKeep = 7) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        log.action('Performance stats cleanup initiated', 'performance', { daysToKeep });

        // In a full implementation, you'd scan Redis for old keys and delete them
        // For now, this is a placeholder

    } catch (error) {
        log.error('Failed to clean old stats', error);
    }
}

/**
 * Format duration for display
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
export function formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}
