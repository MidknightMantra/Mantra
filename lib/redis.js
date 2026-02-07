import Redis from 'ioredis';
import { log } from '../src/utils/logger.js';

// Redis connection configuration
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    db: 0,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true
};

// Create Redis client
let redis = null;
let isConnected = false;

// Only initialize if Redis host is configured
if (process.env.REDIS_HOST) {
    try {
        redis = new Redis(redisConfig);

        redis.on('connect', () => {
            isConnected = true;
            log.action('Redis connected', 'cache', { host: redisConfig.host, port: redisConfig.port });
            console.log(`✅ Redis connected: ${redisConfig.host}:${redisConfig.port}`);
        });

        redis.on('ready', () => {
            log.action('Redis ready', 'cache');
        });

        redis.on('error', (err) => {
            isConnected = false;
            log.error('Redis connection error', err, { host: redisConfig.host });
        });

        redis.on('close', () => {
            isConnected = false;
            log.action('Redis connection closed', 'cache');
        });

        // Connect
        redis.connect().catch(e => {
            log.error('Redis failed to connect', e);
        });

    } catch (e) {
        log.error('Redis initialization failed', e);
        redis = null;
    }
} else {
    console.log('ℹ️  Redis not configured - caching disabled');
}

/**
 * Cache wrapper with graceful fallback
 * Works without Redis - degrades gracefully
 */
export const cache = {
    /**
     * Get value from cache
     * @param {string} key - Cache key
     * @returns {Promise<any|null>} Cached value or null
     */
    async get(key) {
        if (!redis || !isConnected) return null;
        try {
            const value = await redis.get(key);
            if (!value) return null;

            log.perf('cache-hit', { key });
            return JSON.parse(value);
        } catch (e) {
            log.error('Cache get failed', e, { key });
            return null;
        }
    },

    /**
     * Set value in cache with TTL
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in seconds (default: 1 hour)
     * @returns {Promise<boolean>} Success status
     */
    async set(key, value, ttl = 3600) {
        if (!redis || !isConnected) return false;
        try {
            const serialized = JSON.stringify(value);
            await redis.setex(key, ttl, serialized);
            log.perf('cache-set', { key, ttl });
            return true;
        } catch (e) {
            log.error('Cache set failed', e, { key });
            return false;
        }
    },

    /**
     * Delete value from cache
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} Success status
     */
    async del(key) {
        if (!redis || !isConnected) return false;
        try {
            await redis.del(key);
            log.perf('cache-delete', { key });
            return true;
        } catch (e) {
            log.error('Cache delete failed', e, { key });
            return false;
        }
    },

    /**
     * Check if key exists in cache
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} Existence status
     */
    async exists(key) {
        if (!redis || !isConnected) return false;
        try {
            return (await redis.exists(key)) === 1;
        } catch (e) {
            return false;
        }
    },

    /**
     * Increment counter (for rate limiting)
     * @param {string} key - Cache key
     * @param {number} ttl - Expiry in seconds
     * @returns {Promise<number>} New counter value
     */
    async incr(key, ttl = 60) {
        if (!redis || !isConnected) return 0;
        try {
            const value = await redis.incr(key);
            if (value === 1) {
                await redis.expire(key, ttl);
            }
            return value;
        } catch (e) {
            log.error('Cache incr failed', e, { key });
            return 0;
        }
    },

    /**
     * Get cache stats
     * @returns {Promise<object>} Cache statistics
     */
    async stats() {
        if (!redis || !isConnected) {
            return { enabled: false, connected: false };
        }
        try {
            const info = await redis.info('stats');
            return {
                enabled: true,
                connected: isConnected,
                host: redisConfig.host,
                port: redisConfig.port,
                info: info
            };
        } catch (e) {
            return { enabled: true, connected: false, error: e.message };
        }
    }
};

// Export redis client for advanced usage
export default redis;
