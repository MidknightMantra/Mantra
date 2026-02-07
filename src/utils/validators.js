import { CONFIG, MESSAGES } from '../config/constants.js';

/**
 * Input validation utilities
 */
export const validate = {
    /**
     * Validate phone number format
     */
    phoneNumber: (num) => {
        if (typeof num !== 'string') return false;
        const cleaned = num.split('@')[0]; // Properly extract numeric part
        return /^[0-9]{10,15}$/.test(cleaned);
    },

    /**
     * Validate URL
     */
    url: (url) => {
        try {
            const parsed = new URL(url);
            return ['http:', 'https:'].includes(parsed.protocol);
        } catch {
            return false;
        }
    },

    /**
     * Validate message length
     */
    messageLength: (text) => {
        return Boolean(text && text.length > 0 && text.length <= CONFIG.SECURITY.MAX_MESSAGE_LENGTH);
    },

    /**
     * Validate command permissions
     */
    permissions: {
        isOwner: (sender) => {
            const number = sender.split('@')[0];
            return CONFIG.BOT.OWNER.includes(number);
        },

        isAdmin: (sender, groupAdmins = []) => {
            return groupAdmins.includes(sender);
        },

        canExecute: (m, requiredLevel) => {
            if (requiredLevel === 'owner') {
                return validate.permissions.isOwner(m.sender);
            }
            if (requiredLevel === 'admin') {
                return m.isUserAdmin || validate.permissions.isOwner(m.sender);
            }
            return true; // Public command
        }
    },

    /**
     * Validate group context
     */
    context: {
        requireGroup: (m) => {
            if (!m.isGroup) {
                throw new Error(MESSAGES.ERRORS.GROUP_ONLY);
            }
            return true;
        },

        requirePrivate: (m) => {
            if (m.isGroup) {
                throw new Error(MESSAGES.ERRORS.PRIVATE_ONLY);
            }
            return true;
        },

        requireBotAdmin: (m) => {
            if (m.isGroup && !m.isBotAdmin) {
                throw new Error('🤖 I need to be an admin to use this feature.');
            }
            return true;
        }
    }
};

/**
 * Input sanitization utilities
 */
export const sanitize = {
    /**
     * Remove potentially dangerous characters
     */
    text: (text) => {
        if (!text) return '';
        return text
            .replace(/[<>{}]/g, '') // Remove brackets
            .replace(/javascript:/gi, '') // Remove JS protocol
            .trim();
    },

    /**
     * Sanitize for SQL (if using SQL database)
     */
    sql: (text) => {
        if (!text) return '';
        return text.replace(/['";\\]/g, '');
    },

    /**
     * Sanitize mention
     */
    mention: (jid) => {
        if (!jid) return '';
        return jid.replace(/[^0-9@s.whatsapp.net]/g, '');
    },

    /**
     * Sanitize command input
     */
    command: (text) => {
        if (!text) return '';
        return sanitize.text(text).substring(0, CONFIG.SECURITY.MAX_MESSAGE_LENGTH);
    }
};

/**
 * Guard functions for commands
 */
export const guards = {
    /**
     * Owner-only guard
     */
    ownerOnly: (m) => {
        if (!validate.permissions.isOwner(m.sender)) {
            throw new Error(MESSAGES.ERRORS.OWNER_ONLY);
        }
    },

    /**
     * Admin-only guard
     */
    adminOnly: (m) => {
        if (!m.isUserAdmin && !validate.permissions.isOwner(m.sender)) {
            throw new Error(MESSAGES.ERRORS.ADMIN_ONLY);
        }
    },

    /**
     * Group-only guard
     */
    groupOnly: (m) => {
        validate.context.requireGroup(m);
    },

    /**
     * Private-only guard
     */
    privateOnly: (m) => {
        validate.context.requirePrivate(m);
    },

    /**
     * Bot admin guard
     */
    botAdminRequired: (m) => {
        validate.context.requireBotAdmin(m);
    }
};

export default {
    validate,
    sanitize,
    guards
};
