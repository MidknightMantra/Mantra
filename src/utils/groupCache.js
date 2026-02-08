import { log } from './logger.js';

class GroupCache {
    constructor() {
        this.cache = new Map();
        this.lidCache = new Map();
    }

    /**
     * Get cached metadata for a group
     * @param {string} jid 
     * @returns {object|null}
     */
    get(jid) {
        return this.cache.get(jid) || null;
    }

    /**
     * Set metadata for a group
     * @param {string} jid 
     * @param {object} metadata 
     */
    set(jid, metadata) {
        if (!jid || !metadata) return;
        this.cache.set(jid, {
            ...metadata,
            cachedAt: Date.now()
        });
    }

    /**
     * Check if group is cached
     * @param {string} jid 
     * @returns {boolean}
     */
    has(jid) {
        return this.cache.has(jid);
    }

    /**
     * Delete a group from cache
     * @param {string} jid 
     * @returns {void}
     */
    delete(jid) {
        this.cache.delete(jid);
    }

    /**
     * Clear all cached metadata
     */
    clear() {
        this.cache.clear();
        this.lidCache.clear();
        log.info('Group cache cleared');
    }

    /**
     * Get all cached group JIDs
     * @returns {string[]}
     */
    keys() {
        return Array.from(this.cache.keys());
    }

    /**
     * Get all cached metadata
     * @returns {object}
     */
    getAll() {
        return Object.fromEntries(this.cache);
    }

    /**
     * Get cached LID mapping
     * @param {string} lid
     * @returns {string|null}
     */
    getLidMapping(lid) {
        return this.lidCache.get(lid) || null;
    }

    /**
     * Set LID mapping
     * @param {string} lid 
     * @param {string} jid 
     */
    setLidMapping(lid, jid) {
        this.lidCache.set(lid, jid);
    }
}

export const groupCache = new GroupCache();

// Helper to mimic user's previous import structure
export const getGroupMetadata = (jid) => groupCache.get(jid);
export const cachedGroupMetadata = groupCache;
export const getLidMapping = (lid) => groupCache.getLidMapping(lid);

export default {
    groupCache,
    getGroupMetadata,
    cachedGroupMetadata,
    getLidMapping
};
