/**
 * Messaging Utilities
 * Common patterns for sending messages, reactions, and replies
 */

import { log } from './logger.js';

/**
 * Send reaction emoji to a message
 * @param {object} conn - WhatsApp connection
 * @param {object} message - Message to react to
 * @param {string} emoji - Emoji to send
 */
export async function react(conn, message, emoji) {
    try {
        await conn.sendMessage(message.chat, {
            react: { text: emoji, key: message.key }
        });
    } catch (error) {
        log.error('Failed to send reaction', error, { emoji });
    }
}

/**
 * Execute function with loading/success/error reactions
 * @param {object} conn - WhatsApp connection
 * @param {object} message - Message to react to
 * @param {string} loadingEmoji - Emoji while processing (default: ⏳)
 * @param {function} fn - Async function to execute
 * @returns {any} Result from function
 */
export async function withReaction(conn, message, loadingEmoji, fn) {
    await react(conn, message, loadingEmoji || '⏳');

    try {
        const result = await fn();
        await react(conn, message, '✅');
        return result;
    } catch (error) {
        await react(conn, message, '❌');
        throw error;
    }
}

/**
 * Send message with automatic quoted reply
 * @param {object} conn - WhatsApp connection
 * @param {string} chatId - Chat ID to send to
 * @param {object|string} content - Message content (object or string)
 * @param {object} quotedMsg - Optional message to quote
 * @returns {Promise<object>} Sent message
 */
export async function reply(conn, chatId, content, quotedMsg = null) {
    try {
        // Convert string to text message object
        const messageContent = typeof content === 'string'
            ? { text: content }
            : content;

        return await conn.sendMessage(chatId, messageContent, { quoted: quotedMsg });
    } catch (error) {
        log.error('Failed to send reply', error, { chatId });
        throw error;
    }
}

/**
 * Send text message with automatic formatting
 * @param {object} conn - WhatsApp connection
 * @param {string} chatId - Chat ID
 * @param {string} text - Text to send
 * @param {object} options - Additional options
 * @returns {Promise<object>} Sent message
 */
export async function sendText(conn, chatId, text, options = {}) {
    try {
        return await conn.sendMessage(chatId, { text }, options);
    } catch (error) {
        log.error('Failed to send text', error, { chatId });
        throw error;
    }
}

/**
 * Send media message (image/video/audio/document)
 * @param {object} conn - WhatsApp connection
 * @param {string} chatId - Chat ID
 * @param {string} type - Media type (image, video, audio, document)
 * @param {Buffer|string} media - Buffer or URL
 * @param {object} options - Caption, filename, etc.
 * @returns {Promise<object>} Sent message
 */
export async function sendMedia(conn, chatId, type, media, options = {}) {
    try {
        const content = {
            [type]: media,
            ...options
        };

        return await conn.sendMessage(chatId, content, options.messageOptions || {});
    } catch (error) {
        log.error('Failed to send media', error, { chatId, type });
        throw error;
    }
}

export default {
    react,
    withReaction,
    reply,
    sendText,
    sendMedia
};
