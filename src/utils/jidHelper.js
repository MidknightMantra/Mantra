/**
 * JID Helper Utilities
 * Common operations for manipulating WhatsApp JIDs
 */

/**
 * Extract phone number from JID
 * @param {string} jid - User JID
 * @returns {string} Phone number or original string
 */
export function getUserName(jid) {
    if (!jid || typeof jid !== 'string') return '';
    return jid.split('@')[0].split(':')[0];
}

/**
 * Normalize a JID to standard @s.whatsapp.net format
 * Handles splitting and basic lid-like checks
 * @param {string} jid - Dirty JID
 * @returns {string} Normalized JID
 */
export function normalizeUserJid(jid) {
    if (!jid || typeof jid !== 'string') return '';

    // Basically the logic from the user request
    // Note: Mantra doesn't have a centralized LidMapping yet, 
    // but we can prepare the structure.

    let normalized = jid.split(':')[0].split('/')[0];
    if (!normalized.includes('@')) {
        normalized += '@s.whatsapp.net';
    }

    return normalized;
}

/**
 * Check if string is a valid JID
 * @param {string} jid 
 * @returns {boolean}
 */
export function isJid(jid) {
    return jid && typeof jid === 'string' && (jid.endsWith('@s.whatsapp.net') || jid.endsWith('@g.us') || jid.endsWith('@broadcast'));
}

export default {
    getUserName,
    normalizeUserJid,
    isJid
};
