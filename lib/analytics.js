import { incrementCommandStats, getAnalyticsStats, getTopUsers } from './database.js';
import { log } from '../src/utils/logger.js';

/**
 * Analytics Manager
 */
const Analytics = {
    /**
     * Track a command execution
     * @param {string} command - Command name
     * @param {string} userJid - User JID
     */
    track: async (command, userJid) => {
        try {
            await incrementCommandStats(command, userJid);
        } catch (error) {
            log.error('Analytics track error', error);
        }
    },

    /**
     * Get global stats
     */
    getGlobalStats: async () => {
        return await getAnalyticsStats(null);
    },

    /**
     * Get user stats
     */
    getUserStats: async (userJid) => {
        return await getAnalyticsStats(userJid);
    },

    /**
     * Get top active users
     */
    getTopUsers: async (limit) => {
        return await getTopUsers(limit);
    }
};

export default Analytics;
