/**
 * Group Helper Utilities
 * Common validation and operations for group commands
 */

import { log } from './logger.js';

/**
 * Validate that command is used in a group
 * @param {object} m - Message object
 * @param {boolean} isGroup - Whether message is from group
 * @param {string} customMessage - Optional custom error message
 * @returns {boolean} True if valid, false otherwise
 */
export function requireGroup(m, isGroup, customMessage = null) {
    if (!isGroup) {
        m.reply(customMessage || '⚠️ This command is for groups only.');
        return false;
    }
    return true;
}

/**
 * Validate that user is admin
 * @param {object} m - Message object
 * @param {boolean} isUserAdmin - Whether user is admin
 * @param {string} customMessage - Optional custom error message
 * @returns {boolean} True if valid, false otherwise
 */
export function requireAdmin(m, isUserAdmin, customMessage = null) {
    if (!isUserAdmin) {
        m.reply(customMessage || '⚠️ Admin only command.');
        return false;
    }
    return true;
}

/**
 * Validate that bot is admin
 * @param {object} m - Message object
 * @param {boolean} isBotAdmin - Whether bot is admin
 * @param {string} customMessage - Optional custom error message
 * @returns {boolean} True if valid, false otherwise
 */
export function requireBotAdmin(m, isBotAdmin, customMessage = null) {
    if (!isBotAdmin) {
        m.reply(customMessage || '⚠️ I need admin rights to do this.');
        return false;
    }
    return true;
}

/**
 * Validate all group requirements at once
 * @param {object} m - Message object
 * @param {object} checks - Object with isGroup, isUserAdmin, isBotAdmin
 * @returns {boolean} True if all checks pass
 */
export function validateGroupCommand(m, checks) {
    const { isGroup, requireUserAdmin, requireBotAdmin: botAdminNeeded } = checks;

    if (!requireGroup(m, isGroup)) return false;
    if (requireUserAdmin && !requireAdmin(m, checks.isUserAdmin)) return false;
    if (botAdminNeeded && !requireBotAdmin(m, checks.isBotAdmin)) return false;

    return true;
}

/**
 * Get group metadata with error handling
 * @param {object} conn - WhatsApp connection
 * @param {string} groupId - Group JID
 * @returns {Promise<object|null>} Group metadata or null
 */
export async function getGroupMeta(conn, groupId) {
    try {
        return await conn.groupMetadata(groupId);
    } catch (error) {
        log.error('Failed to get group metadata', error, { groupId });
        return null;
    }
}

/**
 * Get group admins list
 * @param {object} conn - WhatsApp connection
 * @param {string} groupId - Group JID
 * @returns {Promise<string[]>} Array of admin JIDs
 */
export async function getGroupAdmins(conn, groupId) {
    try {
        const metadata = await conn.groupMetadata(groupId);
        return metadata.participants
            .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
            .map(p => p.id);
    } catch (error) {
        log.error('Failed to get group admins', error, { groupId });
        return [];
    }
}

/**
 * Check if user is group admin
 * @param {object} conn - WhatsApp connection
 * @param {string} groupId - Group JID
 * @param {string} userId - User JID
 * @returns {Promise<boolean>} True if admin
 */
export async function isAdmin(conn, groupId, userId) {
    const admins = await getGroupAdmins(conn, groupId);
    return admins.includes(userId);
}

export default {
    requireGroup,
    requireAdmin,
    requireBotAdmin,
    validateGroupCommand,
    getGroupMeta,
    getGroupAdmins,
    isAdmin
};
