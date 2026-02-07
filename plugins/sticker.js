import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import pkg from 'gifted-baileys';
const { downloadContentFromMessage } = pkg;
// Fix CommonJS import issue
import stickerPkg from 'wa-sticker-formatter';
const { Sticker, createSticker, StickerTypes } = stickerPkg;

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
            log.error('Sticker creation failed', e, { command: 'sticker', user: m.sender });
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            m.reply(UI.error('Sticker Creation Failed', e.message || 'Failed to create sticker', 'Ensure video is under 10 seconds\nUse images in JPG/PNG format\nTry a smaller file size'));
        }
    }
});