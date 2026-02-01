import { CONFIG } from '../config/constants.js';
import { log } from './logger.js';

/**
 * Simple LRU Cache for command responses
 * Reduces redundant computations for frequently used commands
 */
class Cache {
    constructor(maxSize = CONFIG.CACHE.MAX_SIZE, ttl = CONFIG.CACHE.TTL) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl;
    }

    /**
     * Generate cache key from message context
     */
    generateKey(command, args = '', userId = '') {
        return `${command}:${args}:${userId}`;
    }

    /**
     * Get cached value
     */
    get(key) {
        if (!CONFIG.CACHE.ENABLED) {
            return null;
        }

        const item = this.cache.get(key);

        if (!item) {
            return null;
        }

        // Check if expired
        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }

        log.perf('Cache hit', 0);
        return item.value;
    }

    /**
     * Set cache value
     */
    set(key, value) {
        if (!CONFIG.CACHE.ENABLED) {
            return;
        }

        // LRU eviction if cache is full
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }

    /**
     * Clear cache
     */
    clear() {
        this.cache.clear();
        log.action('Cache cleared', 'system');
    }

    /**
     * Get cache stats
     */
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            ttl: this.ttl
        };
    }
}

// Singleton instance
export const cache = new Cache();

/**
 * Debounce utility - prevents function from being called too frequently
 */
export function debounce(func, wait) {
    let timeout;

    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle utility - ensures function runs at most once per interval
 */
export function throttle(func, limit) {
    let inThrottle;
    let lastResult;

    return function (...args) {
        if (!inThrottle) {
            inThrottle = true;
            lastResult = func.apply(this, args);

            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }

        return lastResult;
    };
}

/**
 * Memoize function results
 */
export function memoize(fn, keyGenerator) {
    const cache = new Map();

    return function (...args) {
        const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

        if (cache.has(key)) {
            return cache.get(key);
        }

        const result = fn.apply(this, args);
        cache.set(key, result);

        return result;
    };
}

export default {
    cache,
    debounce,
    throttle,
    memoize
};
