/**
 * Media Helper Utilities
 * Common patterns for media download and validation
 */

import pkg from 'gifted-baileys';
const { downloadContentFromMessage, getContentType } = pkg;
import { log } from './logger.js';

/**
 * Get media type from message
 * @param {object} message - Message object
 * @returns {string|null} Media type or null
 */
export function getMediaType(message) {
    if (!message || !message.message) return null;

    const mType = getContentType(message.message);
    const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];

    return mediaTypes.includes(mType) ? mType : null;
}

/**
 * Check if message has media
 * @param {object} message - Message object
 * @returns {boolean} True if has media
 */
export function hasMedia(message) {
    return getMediaType(message) !== null;
}

/**
 * Get media file size
 * @param {object} message - Message object
 * @returns {number} Size in bytes, 0 if no media
 */
export function getMediaSize(message) {
    const mediaType = getMediaType(message);
    if (!mediaType) return 0;

    return message.message[mediaType]?.fileLength || 0;
}

/**
 * Validate media size
 * @param {object} message - Message object
 * @param {number} maxSizeMB - Maximum size in MB
 * @returns {boolean} True if valid size
 */
export function validateMediaSize(message, maxSizeMB = 10) {
    const size = getMediaSize(message);
    return size > 0 && size <= maxSizeMB * 1024 * 1024;
}

/**
 * Validate media type
 * @param {object} message - Message object
 * @param {string[]} allowedTypes - Allowed types (image, video, audio, document, sticker)
 * @returns {boolean} True if valid type
 */
export function validateMediaType(message, allowedTypes = ['image', 'video', 'audio']) {
    const mediaType = getMediaType(message);
    if (!mediaType) return false;

    const type = mediaType.replace('Message', '');
    return allowedTypes.includes(type);
}

/**
 * Download media from message
 * @param {object} message - Message object
 * @param {number} maxSizeMB - Maximum file size in MB
 * @returns {Promise<Buffer|null>} Media buffer or null
 */
export async function downloadMedia(message, maxSizeMB = 10) {
    try {
        const mediaType = getMediaType(message);
        if (!mediaType) {
            throw new Error('No media found in message');
        }

        // Size validation
        if (!validateMediaSize(message, maxSizeMB)) {
            throw new Error(`File too large (max ${maxSizeMB}MB)`);
        }

        // Download
        const stream = await downloadContentFromMessage(
            message.message[mediaType],
            mediaType.replace('Message', '')
        );

        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }

        log.action('Media downloaded', 'media', {
            type: mediaType,
            size: `${(buffer.length / 1024).toFixed(2)}KB`
        });

        return buffer;

    } catch (error) {
        log.error('Failed to download media', error);
        throw error;
    }
}

/**
 * Require media in message (validation helper)
 * @param {object} m - Message object
 * @param {object} quoted - Quoted message (optional)
 * @param {string[]} allowedTypes - Allowed media types
 * @returns {object|null} Message with media or null
 */
export function requireMedia(m, quoted = null, allowedTypes = ['image', 'video']) {
    const target = quoted || m;

    if (!hasMedia(target)) {
        m.reply(`⚠️ Please send or reply to ${allowedTypes.join('/')} media.`);
        return null;
    }

    if (!validateMediaType(target, allowedTypes)) {
        m.reply(`⚠️ Invalid media type. Only ${allowedTypes.join('/')} allowed.`);
        return null;
    }

    return target;
}

/**
 * Get MIME type from media type
 * @param {string} mediaType - Media type (imageMessage, videoMessage, etc.)
 * @returns {string} MIME type
 */
export function getMimeType(mediaType) {
    const mimeMap = {
        imageMessage: 'image/jpeg',
        videoMessage: 'video/mp4',
        audioMessage: 'audio/mp4',
        documentMessage: 'application/octet-stream',
        stickerMessage: 'image/webp'
    };

    return mimeMap[mediaType] || 'application/octet-stream';
}

export default {
    getMediaType,
    hasMedia,
    getMediaSize,
    validateMediaSize,
    validateMediaType,
    downloadMedia,
    requireMedia,
    getMimeType
};
