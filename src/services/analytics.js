import { log } from '../utils/logger.js';
import { CONFIG } from '../config/constants.js';

/**
 * Analytics Service
 * Tracks command usage, users, and performance metrics
 */
class AnalyticsService {
    constructor() {
        this.data = {
            commands: new Map(), // commandName -> count
            users: new Set(), // unique users
            groups: new Set(), // unique groups
            errors: [], // recent errors
            performance: [] // recent performance metrics
        };

        this.startTime = Date.now();
    }

    /**
     * Track command execution
     */
    trackCommand(commandName, user, isGroup, duration = 0) {
        if (!CONFIG.ANALYTICS.ENABLED) return;

        // Increment command counter
        const count = this.data.commands.get(commandName) || 0;
        this.data.commands.set(commandName, count + 1);

        // Track unique user
        this.data.users.add(user);

        // Track performance
        if (duration > 0) {
            this.data.performance.push({
                command: commandName,
                duration,
                timestamp: Date.now()
            });

            // Keep only last 100 performance entries
            if (this.data.performance.length > 100) {
                this.data.performance.shift();
            }
        }

        log.action('Command tracked', user, {
            command: commandName,
            duration: `${duration}ms`,
            isGroup
        });
    }

    /**
     * Track group
     */
    trackGroup(groupId) {
        if (!CONFIG.ANALYTICS.ENABLED) return;
        this.data.groups.add(groupId);
    }

    /**
     * Track error
     */
    trackError(error, context = {}) {
        if (!CONFIG.ANALYTICS.ENABLED) return;

        this.data.errors.push({
            message: error.message,
            stack: error.stack,
            context,
            timestamp: Date.now()
        });

        // Keep only last 50 errors
        if (this.data.errors.length > 50) {
            this.data.errors.shift();
        }
    }

    /**
    * Get statistics
     */
    getStats() {
        const uptime = Date.now() - this.startTime;
        const topCommands = Array.from(this.data.commands.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([cmd, count]) => ({ command: cmd, uses: count }));

        const avgResponseTime = this.data.performance.length > 0
            ? this.data.performance.reduce((sum, p) => sum + p.duration, 0) / this.data.performance.length
            : 0;

        return {
            uptime: Math.floor(uptime / 1000), // in seconds
            totalCommands: Array.from(this.data.commands.values()).reduce((a, b) => a + b, 0),
            uniqueUsers: this.data.users.size,
            uniqueGroups: this.data.groups.size,
            topCommands,
            avgResponseTime: Math.round(avgResponseTime),
            recentErrors: this.data.errors.slice(-10),
            commandCount: this.data.commands.size
        };
    }

    /**
     * Get command popularity
     */
    getPopularCommands(limit = 10) {
        return Array.from(this.data.commands.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);
    }

    /**
     * Get active user count (last 24h)
     */
    getActiveUsersCount() {
        return this.data.users.size;
    }

    /**
     * Clear analytics (admin function)
     */
    clear() {
        this.data.commands.clear();
        this.data.users.clear();
        this.data.groups.clear();
        this.data.errors = [];
        this.data.performance = [];
        log.action('Analytics cleared', 'system');
    }

    /**
     * Export analytics data
     */
    export() {
        return {
            stats: this.getStats(),
            commands: Object.fromEntries(this.data.commands),
            users: Array.from(this.data.users),
            groups: Array.from(this.data.groups),
            errors: this.data.errors,
            performance: this.data.performance
        };
    }
}

// Singleton instance
export const analytics = new AnalyticsService();
export default analytics;
