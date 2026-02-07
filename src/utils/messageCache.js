/**
 * Message Cache for Anti-Delete Functionality
 * 4-Layer Redundancy: Redis → Memory → MongoDB → WhatsApp Store
 * Stores recent messages in Redis/Memory/MongoDB for quick retrieval when deleted
 */

import { cache } from '../../lib/redis.js';
import { cacheMessageInDb, getCachedMessageFromDb } from '../../lib/database.js';
import { log } from './logger.js';

// In-memory fallback cache
const memoryCache = new Map();
// Configurable cache size (default: 500 for low memory, can increase via env)
const MAX_MEMORY_SIZE = parseInt(process.env.MESSAGE_CACHE_SIZE || '500');

/**
 * Cache a message for anti-delete
 * @param {string} messageId - Message ID
 * @param {string} chatId - Chat ID where message was sent
 * @param {object} messageData - Complete message object
 * @param {number} ttl - Time to live in seconds (default: 24 hours)
 */
export async function cacheMessage(messageId, chatId, messageData, ttl = 86400) {
    try {
        const cacheKey = `msg:${chatId}:${messageId}`;

        // Serialize ONLY essential data (minimize memory)
        const serialized = {
            id: messageId,
            chat: chatId,
            sender: messageData.key?.participant || messageData.key?.remoteJid,
            message: messageData.message, // Only the message content
            timestamp: Date.now(),
            key: messageData.key
            // Note: We don't cache large media buffers, just references
        };

        // Store in Redis (primary)
        await cache.set(cacheKey, serialized, ttl);

        // Store in memory ONLY if Redis is unavailable (smart fallback)
        const redisWorking = await cache.exists(cacheKey);
        if (!redisWorking) {
            memoryCache.set(cacheKey, serialized);

            // Cleanup old memory cache entries if too large
            if (memoryCache.size > MAX_MEMORY_SIZE) {
                const firstKey = memoryCache.keys().next().value;
                memoryCache.delete(firstKey);
            }
        }

        // Also store in MongoDB for persistent storage (7-day retention)
        await cacheMessageInDb(messageId, chatId, serialized, 7);


    } catch (error) {
        log.error('Failed to cache message', error, { messageId, chatId });
    }
}

/**
 * Retrieve a cached message (4-layer fallback)
 * @param {string} messageId - Message ID
 * @param {string} chatId - Chat ID
 * @returns {object|null} Cached message data or null
 */
export async function getCachedMessage(messageId, chatId) {
    try {
        const cacheKey = `msg:${chatId}:${messageId}`;

        // Layer 1: Try Redis first (fastest)
        let cached = await cache.get(cacheKey);

        if (cached) {
            log.perf('message-cache-redis-hit', { messageId });
            return cached;
        }

        // Layer 2: Fallback to memory if Redis miss
        if (memoryCache.has(cacheKey)) {
            cached = memoryCache.get(cacheKey);
            log.perf('message-cache-memory-hit', { messageId });
            return cached;
        }

        // Layer 3: Fallback to MongoDB (persistent storage)
        cached = await getCachedMessageFromDb(messageId, chatId);
        if (cached) {
            log.perf('message-cache-mongodb-hit', { messageId });
            // Restore to Redis and memory for faster future access
            await cache.set(cacheKey, cached, 86400);
            memoryCache.set(cacheKey, cached);
            return cached;
        }

        // Layer 4: No cache hit - will fall back to WhatsApp store in listeners
        return null;

    } catch (error) {
        log.error('Failed to get cached message', error, { messageId, chatId });
        return null;
    }
}

/**
 * Delete a cached message
 * @param {string} messageId - Message ID
 * @param {string} chatId - Chat ID
 */
export async function deleteCachedMessage(messageId, chatId) {
    try {
        const cacheKey = `msg:${chatId}:${messageId}`;

        await cache.del(cacheKey);
        memoryCache.delete(cacheKey);

    } catch (error) {
        log.error('Failed to delete cached message', error, { messageId, chatId });
    }
}

/**
 * Get cache statistics
 * @returns {object} Cache stats
 */
export function getMessageCacheStats() {
    return {
        memorySize: memoryCache.size,
        maxMemorySize: MAX_MEMORY_SIZE,
        memoryUsage: `${memoryCache.size}/${MAX_MEMORY_SIZE}`,
        percentage: Math.round((memoryCache.size / MAX_MEMORY_SIZE) * 100)
    };
}

/**
 * Clear old messages from memory cache (optional maintenance)
 * @param {number} olderThanHours - Clear messages older than X hours
 */
export function clearOldMessages(olderThanHours = 24) {
    try {
        const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
        let cleared = 0;

        for (const [key, value] of memoryCache.entries()) {
            if (value.timestamp < cutoffTime) {
                memoryCache.delete(key);
                cleared++;
            }
        }

        log.action(`Cleared ${cleared} old messages from cache`, 'cache');
        return cleared;

    } catch (error) {
        log.error('Failed to clear old messages', error);
        return 0;
    }
}

export default {
    cacheMessage,
    getCachedMessage,
    deleteCachedMessage,
    getMessageCacheStats,
    clearOldMessages
};
