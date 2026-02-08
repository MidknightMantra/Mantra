import pkgSticker from 'wa-sticker-formatter';
const { Sticker, StickerTypes } = pkgSticker;
import { log } from './logger.js';

/**
 * Create a sticker from a buffer
 * @param {Buffer} buffer - Image or video buffer
 * @param {Object} options - Sticker options
 * @returns {Promise<Buffer>} Sticker buffer
 */
export async function createSticker(buffer, options = {}) {
    try {
        const sticker = new Sticker(buffer, {
            pack: options.pack || global.packname || 'Mantra-MD',
            author: options.author || global.author || 'MidknightMantra',
            type: options.type || StickerTypes.FULL, // full, crop, circle, rounded
            categories: options.categories || ['🤩', '🎉'],
            id: options.id || Date.now().toString(),
            quality: options.quality || 70,
            background: options.background || 'transparent'
        });

        return await sticker.toBuffer();
    } catch (error) {
        log.error('Failed to create sticker', error);
        throw error;
    }
}

export { StickerTypes };
