import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';
import axios from 'axios';
import fs from 'fs';
import { getMediaBuffer } from '../lib/utils.js';
import { uploadToImgBB } from '../src/utils/uploader.js';
import { getConfig } from '../src/config/constants.js';

// Get API config (fallback to known default if not set)
const API_URL = global.giftedApiUrl || 'https://api.giftedtech.my.id';
const API_KEY = global.giftedApiKey || '';

/**
 * Screenshot Mobile
 */
addCommand({
    pattern: 'ssphone',
    alias: ['ssmobile', 'phoness'],
    react: '📱',
    category: 'tools',
    desc: 'Take a screenshot of a website (mobile view)',
    handler: async (m, { text }) => {
        if (!text) return m.reply('❌ Please provide a URL\n\nUsage: .ssphone https://google.com');
        await m.react('⏳');
        try {
            const res = await axios.get(`${API_URL}/api/tools/ssphone`, {
                params: { apikey: API_KEY, url: text },
                responseType: 'arraybuffer'
            });
            await m.reply(Buffer.from(res.data), m.chat, { caption: `📱 *Mobile Screenshot*\n🌐 ${text}` });
            await m.react('✅');
        } catch (e) {
            log.error('SSPhone error', e);
            m.reply(`❌ Failed: ${e.message}`);
        }
    }
});

/**
 * Screenshot Tablet
 */
addCommand({
    pattern: 'sstab',
    alias: ['sstablet', 'tabletss'],
    react: '📱',
    category: 'tools',
    desc: 'Take a screenshot of a website (tablet view)',
    handler: async (m, { text }) => {
        if (!text) return m.reply('❌ Please provide a URL');
        await m.react('⏳');
        try {
            const res = await axios.get(`${API_URL}/api/tools/sstab`, {
                params: { apikey: API_KEY, url: text },
                responseType: 'arraybuffer'
            });
            await m.reply(Buffer.from(res.data), m.chat, { caption: `📱 *Tablet Screenshot*\n🌐 ${text}` });
            await m.react('✅');
        } catch (e) {
            log.error('SSTab error', e);
            m.reply(`❌ Failed: ${e.message}`);
        }
    }
});

/**
 * Screenshot PC
 */
addCommand({
    pattern: 'sspc',
    alias: ['pcss', 'desktopss'],
    react: '🖥️',
    category: 'tools',
    desc: 'Take a screenshot of a website (PC view)',
    handler: async (m, { text }) => {
        if (!text) return m.reply('❌ Please provide a URL');
        await m.react('⏳');
        try {
            const res = await axios.get(`${API_URL}/api/tools/sspc`, {
                params: { apikey: API_KEY, url: text },
                responseType: 'arraybuffer'
            });
            await m.reply(Buffer.from(res.data), m.chat, { caption: `🖥️ *PC Screenshot*\n🌐 ${text}` });
            await m.react('✅');
        } catch (e) {
            log.error('SSPC error', e);
            m.reply(`❌ Failed: ${e.message}`);
        }
    }
});

/**
 * Create QR Code
 */
addCommand({
    pattern: 'createqr',
    alias: ['toqr', 'qrcode', 'makeqr'],
    react: '📱',
    category: 'tools',
    desc: 'Create a QR code from text',
    handler: async (m, { text }) => {
        const content = text || (m.quoted ? m.quoted.text : '');
        if (!content) return m.reply('❌ Please provide text or quote a message.');

        await m.react('⏳');
        try {
            const res = await axios.get(`${API_URL}/api/tools/createqr`, {
                params: { apikey: API_KEY, query: content },
                responseType: 'arraybuffer'
            });
            await m.reply(Buffer.from(res.data), m.chat, { caption: `📱 *QR Code Generator*` });
            await m.react('✅');
        } catch (e) {
            log.error('CreateQR error', e);
            m.reply(`❌ Failed: ${e.message}`);
        }
    }
});

/**
 * Read QR Code
 */
addCommand({
    pattern: 'readqr',
    alias: ['decodeqr', 'scanqr'],
    react: '🔍',
    category: 'tools',
    desc: 'Read QR code from image',
    handler: async (m, { text, conn }) => {
        let imageUrl = text;

        if (!imageUrl && m.quoted) {
            // Check if quoted message is an image
            const mime = m.quoted.msg?.mimetype || '';
            if (mime.startsWith('image/')) {
                await m.react('⏳');
                try {
                    const buffer = await getMediaBuffer(m.quoted, 'image');
                    const upload = await uploadToImgBB(buffer);
                    imageUrl = upload.url;
                } catch (e) {
                    return m.reply('❌ Failed to process image.');
                }
            }
        }

        if (!imageUrl) return m.reply('❌ Please provide a URL or quote an image containing a QR code.');

        await m.react('⏳');
        try {
            const res = await axios.get(`${API_URL}/api/tools/readqr`, {
                params: { apikey: API_KEY, url: imageUrl }
            });

            const result = res.data?.result || res.data?.data || res.data;
            const content = typeof result === 'object' ? (result.qrcode_data || result.data || JSON.stringify(result)) : result;

            if (!content) throw new Error('Could not decode QR code');

            await m.reply(`🔍 *QR Decoded:*\n\n${content}`);
            await m.react('✅');
        } catch (e) {
            log.error('ReadQR error', e);
            m.reply(`❌ Failed: ${e.message}`);
        }
    }
});

/**
 * Text to Picture (Sticker)
 */
addCommand({
    pattern: 'ttp',
    react: '🎨',
    category: 'tools',
    desc: 'Convert text to picture sticker',
    handler: async (m, { text, conn }) => {
        if (!text) return m.reply('❌ Give me text.');
        await m.react('⏳');
        try {
            const res = await axios.get(`${API_URL}/api/tools/ttp`, {
                params: { apikey: API_KEY, query: text }
            });

            if (res.data?.image_url) {
                const img = await axios.get(res.data.image_url, { responseType: 'arraybuffer' });
                await conn.sendMessage(m.chat, {
                    sticker: img.data,
                    packname: global.packname,
                    author: global.author
                }, { quoted: m });
                await m.react('✅');
            } else {
                throw new Error('API did not return image URL');
            }
        } catch (e) {
            log.error('TTP error', e);
            m.reply(`❌ Failed: ${e.message}`);
        }
    }
});

/**
 * Fancy Text
 */
addCommand({
    pattern: 'fancy',
    alias: Array.from({ length: 20 }, (_, i) => `fancy${i + 1}`),
    react: '✨',
    category: 'tools',
    desc: 'Convert text to fancy fonts',
    handler: async (m, { text, command }) => {
        if (!text) return m.reply('❌ Give me text.');
        await m.react('⏳');
        try {
            const res = await axios.get(`${API_URL}/api/tools/fancy`, {
                params: { apikey: API_KEY, text: text }
            });

            const results = res.data?.results;
            if (!results) throw new Error('API Error');

            // Check if specific style requested
            const styleMatch = command.match(/fancy(\d+)/);
            if (styleMatch) {
                const idx = parseInt(styleMatch[1]) - 1;
                if (results[idx]) {
                    return m.reply(results[idx].result);
                }
            }

            // List all
            let msg = `✨ *Fancy Text Generator*\n\n`;
            results.slice(0, 20).forEach((r, i) => {
                msg += `*${i + 1}.* ${r.result}\n`;
            });
            msg += `\nUsage: .fancy<number> <text>`;

            await m.reply(msg);
            await m.react('✅');
        } catch (e) {
            log.error('Fancy error', e);
            m.reply(`❌ Failed: ${e.message}`);
        }
    }
});

/**
 * Define Word
 */
addCommand({
    pattern: 'define',
    alias: ['meaning', 'dictionary'],
    react: '📖',
    category: 'tools',
    desc: 'Get definition of a word',
    handler: async (m, { text }) => {
        if (!text) return m.reply('❌ Please provide a word.');
        await m.react('⏳');
        try {
            const res = await axios.get(`${API_URL}/api/tools/define`, {
                params: { apikey: API_KEY, term: text }
            });

            const list = res.data?.results;
            if (!list || !list.length) return m.reply('❌ No definition found.');

            let msg = `📖 *Definition: ${text}*\n\n`;
            list.slice(0, 3).forEach((d, i) => {
                msg += `*${i + 1}.* ${d.definition}\n`;
                if (d.example) msg += `   _"${d.example}"_\n`;
                msg += '\n';
            });

            await m.reply(msg);
            await m.react('✅');
        } catch (e) {
            log.error('Define error', e);
            m.reply(`❌ Failed: ${e.message}`);
        }
    }
});

/**
 * Web to Zip
 */
addCommand({
    pattern: 'web2zip',
    react: '📦',
    category: 'tools',
    desc: 'Download website source as zip',
    handler: async (m, { text }) => {
        if (!text) return m.reply('❌ Please provide a URL.');
        await m.react('⏳');
        try {
            const res = await axios.get(`${API_URL}/api/tools/web2zip`, {
                params: { apikey: API_KEY, url: text },
                responseType: 'arraybuffer'
            });

            const domain = new URL(text).hostname.replace(/[^a-z0-9]/gi, '_');
            await m.reply(Buffer.from(res.data), m.chat, {
                fileName: `${domain}.zip`,
                mimetype: 'application/zip',
                caption: `📦 *Source Code for:* ${domain}`
            });
            await m.react('✅');
        } catch (e) {
            log.error('Web2Zip error', e);
            m.reply(`❌ Failed: ${e.message}`);
        }
    }
});

/**
 * Emoji Mix
 */
addCommand({
    pattern: 'emojimix',
    alias: ['mixemoji'],
    react: '😀',
    category: 'tools',
    desc: 'Mix two emojis',
    handler: async (m, { text, conn }) => {
        if (!text) return m.reply('❌ Provide two emojis (e.g. 😂 🙄)');

        // Simple extraction
        const emojis = text.match(/(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu);
        if (!emojis || emojis.length < 2) return m.reply('❌ Need 2 emojis.');

        await m.react('⏳');
        try {
            const res = await axios.get(`${API_URL}/api/tools/emojimix`, {
                params: { apikey: API_KEY, emoji1: emojis[0], emoji2: emojis[1] },
                responseType: 'arraybuffer'
            });

            await conn.sendMessage(m.chat, {
                sticker: Buffer.from(res.data),
                packname: global.packname,
                author: global.author
            }, { quoted: m });
            await m.react('✅');
        } catch (e) {
            log.error('EmojiMix error', e);
            m.reply(`❌ Failed: ${e.message}`);
        }
    }
});

/**
 * Rename File
 */
addCommand({
    pattern: 'rename',
    alias: ['rn'],
    react: '📝',
    category: 'tools',
    desc: 'Rename a quoted file',
    handler: async (m, { text, conn }) => {
        if (!m.quoted) return m.reply('❌ Quote a media/document message.');
        if (!text) return m.reply('❌ Specify new filename.');

        await m.react('⏳');
        try {
            const buffer = await getMediaBuffer(m.quoted);
            if (!buffer) return m.reply('❌ Failed to download media.');

            const originalMime = m.quoted.msg?.mimetype || 'application/octet-stream';
            let ext = '';

            // Try to deduce extension if not provided in text
            if (!text.includes('.')) {
                // If it was a document with filename
                if (m.quoted.msg?.fileName) {
                    const parts = m.quoted.msg.fileName.split('.');
                    if (parts.length > 1) ext = '.' + parts.pop();
                } else {
                    // Fallback map
                    const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'video/mp4': '.mp4', 'audio/mpeg': '.mp3' };
                    ext = extMap[originalMime] || '';
                }
            } else {
                // User provided extension but we should check if they duped it? No, trust user.
            }

            const finalName = text.endsWith(ext) ? text : text + ext;

            await conn.sendMessage(m.chat, {
                document: buffer,
                fileName: finalName,
                mimetype: originalMime,
                caption: `📝 Renamed to: *${finalName}*`
            }, { quoted: m });

            await m.react('✅');
        } catch (e) {
            log.error('Rename error', e);
            m.reply(`❌ Failed: ${e.message}`);
        }
    }
});
