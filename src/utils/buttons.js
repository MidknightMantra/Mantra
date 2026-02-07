/**
 * Button Helper Utilities
 * Common patterns for creating interactive buttons and menus
 */

import pkg from 'gifted-btns';
const { sendInteractiveMessage, sendButtons } = pkg;
import { log } from './logger.js';

/**
 * Send interactive message with single select buttons
 * @param {object} conn - WhatsApp connection
 * @param {string} chatId - Chat ID
 * @param {object} options - Message options
 * @returns {Promise<object>} Sent message
 */
export async function sendInteractive(conn, chatId, options) {
    try {
        return await sendInteractiveMessage(conn, chatId, {
            title: options.title || 'Menu',
            text: options.text || '',
            footer: options.footer || global.botname || 'Mantra',
            interactiveButtons: options.buttons || []
        });
    } catch (error) {
        log.error('Failed to send interactive message', error, { chatId });
        throw error;
    }
}

/**
 * Create single select button
 * @param {string} title - Button title
 * @param {Array} sections - Sections with rows
 * @returns {object} Button object
 */
export function createSelectButton(title, sections) {
    return {
        name: 'single_select',
        buttonParamsJson: JSON.stringify({
            title,
            sections
        })
    };
}

/**
 * Create simple section with rows
 * @param {string} title - Section title
 * @param {Array} rows - Array of row objects {id, title, description, header}
 * @returns {object} Section object
 */
export function createSection(title, rows) {
    return {
        title,
        rows: rows.map(row => ({
            id: row.id,
            title: row.title,
            description: row.description || '',
            header: row.header || ''
        }))
    };
}

/**
 * Create simple button row
 * @param {string} id - Command ID to trigger
 * @param {string} title - Row title
 * @param {string} description - Row description
 * @param {string} header - Optional emoji header
 * @returns {object} Row object
 */
export function createRow(id, title, description = '', header = '') {
    return { id, title, description, header };
}

/**
 * Send simple buttons (legacy style)
 * @param {object} conn - WhatsApp connection
 * @param {string} chatId - Chat ID
 * @param {string} text - Button text
 * @param {Array} buttons - Array of button objects
 * @param {object} options - Additional options
 * @returns {Promise<object>} Sent message
 */
export async function sendSimpleButtons(conn, chatId, text, buttons, options = {}) {
    try {
        return await sendButtons(conn, chatId, {
            text,
            buttons,
            footer: options.footer || global.botname,
            ...options
        });
    } catch (error) {
        log.error('Failed to send buttons', error, { chatId });
        throw error;
    }
}

/**
 * Create quick reply buttons (up to 3)
 * @param {string} text - Message text
 * @param {Array} buttonTexts - Array of button labels (max 3)
 * @returns {object} Button message object
 */
export function createQuickReply(text, buttonTexts) {
    if (buttonTexts.length > 3) {
        log.warn('Quick reply limited to 3 buttons', { provided: buttonTexts.length });
        buttonTexts = buttonTexts.slice(0, 3);
    }

    return {
        text,
        buttons: buttonTexts.map((label, index) => ({
            buttonId: `quick_${index}`,
            buttonText: { displayText: label },
            type: 1
        }))
    };
}

/**
 * Send list message
 * @param {object} conn - WhatsApp connection
 * @param {string} chatId - Chat ID
 * @param {object} options - List options
 * @returns {Promise<object>} Sent message
 */
export async function sendList(conn, chatId, options) {
    try {
        return await conn.sendMessage(chatId, {
            text: options.text || '',
            footer: options.footer || global.botname,
            title: options.title || 'Menu',
            buttonText: options.buttonText || 'Select',
            sections: options.sections || []
        });
    } catch (error) {
        log.error('Failed to send list', error, { chatId });
        throw error;
    }
}

export default {
    sendInteractive,
    createSelectButton,
    createSection,
    createRow,
    sendSimpleButtons,
    createQuickReply,
    sendList
};
