import { addCommand } from '../lib/plugins.js';
import pkg from '@whiskeysockets/baileys';
const { downloadContentFromMessage } = pkg;
import { Sticker, createSticker, StickerTypes } from 'wa-sticker-formatter';

addCommand({
    pattern: 'sticker',
    alias: ['s', 'wm'],
    category: 'tools',
    handler: async (m, { conn, text }) => {
        if (!m.quoted && m.mtype !== 'imageMessage' && m.mtype !== 'videoMessage') {
            return m.reply(`${global.emojis.warning} Reply to an image or video with *${global.prefix}sticker*`);
        }

        try {
            // 1. Initial Reaction
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // 2. Download Media
            const q = m.quoted ? m.quoted : m;
            const mime = (q.msg || q).mimetype || '';
            const stream = await downloadContentFromMessage(q.msg || q, mime.split('/')[0]);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

            // 3. Create Sticker
            const sticker = new Sticker(buffer, {
                pack: global.packname || 'Mantra-MD',
                author: global.author || 'MidknightMantra',
                type: StickerTypes.FULL,
                categories: ['🤩', '🎉'],
                id: '12345',
                quality: 70,
            });

            // 4. Send Sticker
            const stickerBuffer = await sticker.toBuffer();
            await conn.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m });

            // 5. Success Reaction
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            console.error('Sticker Error:', e);
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            m.reply(`${global.emojis.error} ⏤ Failed to create sticker. Ensure it is under 10 seconds if it's a video.`);
        }
    }
});