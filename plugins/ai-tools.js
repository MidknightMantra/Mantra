import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';
import axios from 'axios'; // Ensure axios is imported
import { getMediaBuffer } from '../lib/utils.js';
import { uploadToImgBB } from '../src/utils/uploader.js';

const API_URL = global.giftedApiUrl || 'https://api.giftedtech.my.id';
const API_KEY = global.giftedApiKey || '';

/**
 * AI Photo Editor
 */
addCommand({
    pattern: 'photoeditor',
    alias: ['editpic', 'ai-edit'],
    react: '🎨',
    category: 'ai',
    desc: 'Edit photo using AI prompt',
    handler: async (m, { text, conn }) => {
        let imageUrl = '';
        let prompt = text;

        // Smart argument parsing
        const parts = (text || '').split(' ');
        if (parts[0]?.startsWith('http')) {
            imageUrl = parts[0];
            prompt = parts.slice(1).join(' ');
        }

        // Handle quoted image
        if (!imageUrl && m.quoted) {
            const mime = m.quoted.msg?.mimetype || '';
            if (mime.startsWith('image/')) {
                await m.react('⏳');
                try {
                    const buffer = await getMediaBuffer(m.quoted, 'image');
                    const upload = await uploadToImgBB(buffer);
                    imageUrl = upload.url;
                } catch (e) {
                    return m.reply('❌ Failed to upload image for processing.');
                }
            }
        }

        if (!imageUrl) return m.reply('❌ Give me an image URL or quote an image.');
        if (!prompt) return m.reply('❌ What should I do with the image? (e.g., "Make hair blue")');

        await m.react('⏳');
        try {
            const res = await axios.get(`${API_URL}/api/tools/photoeditor`, {
                params: { apikey: API_KEY, url: imageUrl, prompt: prompt }
            });

            if (res.data?.result) {
                await conn.sendMessage(m.chat, {
                    image: { url: res.data.result },
                    caption: `🎨 *AI Edit:* ${prompt}`
                }, { quoted: m });
                await m.react('✅');
            } else {
                throw new Error('No result from API');
            }
        } catch (e) {
            log.error('PhotoEditor error', e);
            m.reply(`❌ Failed: ${e.message}`);
        }
    }
});

/**
 * Remini / Enhancer
 */
addCommand({
    pattern: 'remini',
    alias: ['enhance', 'hd', 'upscale'],
    react: '✨',
    category: 'ai',
    desc: 'Enhance image quality',
    handler: async (m, { text, conn }) => {
        let imageUrl = text;

        if (!imageUrl && m.quoted) {
            const mime = m.quoted.msg?.mimetype || '';
            if (mime.startsWith('image/')) {
                await m.react('⏳');
                try {
                    const buffer = await getMediaBuffer(m.quoted, 'image');
                    const upload = await uploadToImgBB(buffer);
                    imageUrl = upload.url;
                } catch (e) {
                    return m.reply('❌ Failed to upload image.');
                }
            }
        }

        if (!imageUrl) return m.reply('❌ Give me an image URL or quote an image.');

        await m.react('⏳');
        try {
            const res = await axios.get(`${API_URL}/api/tools/remini`, {
                params: { apikey: API_KEY, url: imageUrl }
            });

            if (res.data?.result) {
                await conn.sendMessage(m.chat, {
                    image: { url: res.data.result },
                    caption: `✨ *Enhanced Image*`
                }, { quoted: m });
                await m.react('✅');
            } else {
                throw new Error('API failed to enhance image');
            }
        } catch (e) {
            log.error('Remini error', e);
            m.reply(`❌ Failed: ${e.message}`);
        }
    }
});
