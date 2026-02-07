import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import { withTimeout } from '../src/utils/timeout.js';
import pkg from 'gifted-baileys';
const { downloadContentFromMessage } = pkg;
import stickerPkg from 'wa-sticker-formatter';
const { Stick

er, StickerTypes } = stickerPkg;

addCommand({
    pattern: 'sticker',
    alias: ['s', 'wm'],
    category: 'tools',
    handler: async (m, { conn, text }) => {
        if (!m.quoted && m.mtype !== 'imageMessage' && m.mtype !== 'videoMessage') {
            return m.reply(UI.error('No Media', 'Reply to an image or video', 'Send an image with caption .sticker\\nOr reply to media with .sticker'));
        }

        try {
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // Download media with timeout
            const q = m.quoted ? m.quoted : m;
            const mime = (q.msg || q).mimetype || '';

            if (!mime.startsWith('image/') && !mime.startsWith('video/')) {
                throw new Error('Unsupported media type. Use image or video only.');
            }

            const stream = await downloadContentFromMessage(q.msg || q, mime.split('/')[0]);
            let buffer = Buffer.from([]);

            // Download with size limit (10MB)
            const maxSize = 10 * 1024 * 1024; // 10MB
            let currentSize = 0;

            for await (const chunk of stream) {
                currentSize += chunk.length;
                if (currentSize > maxSize) {
                    throw new Error('File too large. Maximum size is 10MB.');
                }
                buffer = Buffer.concat([buffer, chunk]);
            }

            // Create sticker with timeout
            const stickerBuffer = await withTimeout(
                (async () => {
                    const sticker = new Sticker(buffer, {
                        pack: global.packname || 'Mantra-MD',
                        author: global.author || 'MidknightMantra',
                        type: StickerTypes.FULL,
                        categories: ['🤩', '🎉'],
                        quality: 70,
                    });
                    return await sticker.toBuffer();
                })(),
                20000,
                'Sticker creation'
            );

            await conn.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m });
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (error) {
            log.error('Sticker creation failed', error, {
                command: 'sticker',
                user: m.sender,
                mime: m.quoted?.mimetype || m.mtype
            });

            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });

            if (error.message.includes('too large')) {
                return m.reply(UI.error('File Too Large', error.message, 'Use images under 10MB\\nCompress the video\\nTry a smaller file'));
            }

            if (error.message.includes('Unsupported')) {
                return m.reply(UI.error('Invalid Media', error.message, 'Use JPG/PNG images\\nUse MP4/GIF videos\\nReply to valid media'));
            }

            if (error.message.includes('timed out')) {
                return m.reply(UI.error('Timeout', 'Sticker creation took too long', 'Try smaller file\\nUse shorter video (under 10s)\\nCompress media'));
            }

            m.reply(UI.error(
                'Sticker Failed',
                error.message || 'Failed to create sticker',
                'Ensure video is under 10 seconds\\nUse images in JPG/PNG format\\nTry a smaller file size'
            ));
        }
    }
});