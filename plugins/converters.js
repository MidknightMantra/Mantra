import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import { react, withReaction } from '../src/utils/messaging.js';
import { downloadMedia } from '../src/utils/mediaHelper.js';
import { toAudio, toPTT, toVideo, stickerToImage } from '../lib/converter.js';
import stickerPkg from 'wa-sticker-formatter';
const { Sticker, StickerTypes } = stickerPkg;

/**
 * STICKER CONVERTER
 */
addCommand({
    pattern: 'sticker',
    alias: ['s', 'st', 'wm'],
    category: 'converter',
    desc: 'Convert image/video to sticker',
    handler: async (m, { conn, text }) => {
        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || '';

        if (!/image|video/.test(mime)) {
            return m.reply(UI.error('No Media', 'Reply to an image or video', 'Example: .sticker --crop\\nOr just .sticker'));
        }

        await withReaction(conn, m, '🔄', async () => {
            const buffer = await downloadMedia(q, 10);
            if (!buffer) throw new Error('Failed to download media');

            const isCrop = text.includes('--crop') || text.includes('-c');
            const [pack, author] = text.replace(/--crop|-c/g, '').trim().split('|');

            const sticker = new Sticker(buffer, {
                pack: pack || global.packname || 'Mantra-MD',
                author: author || global.author || 'MidknightMantra',
                type: isCrop ? StickerTypes.CROPPED : StickerTypes.FULL,
                categories: ['🤩', '🎉'],
                quality: 70
            });

            await conn.sendMessage(m.chat, { sticker: await sticker.toBuffer() }, { quoted: m });
        });
    }
});

/**
 * STICKER TO IMAGE
 */
addCommand({
    pattern: 'toimg',
    alias: ['s2img', 'toimage'],
    category: 'converter',
    desc: 'Convert sticker to image',
    handler: async (m, { conn }) => {
        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || '';

        if (!/webp/.test(mime)) {
            return m.reply(UI.error('Not a Sticker', 'Reply to a sticker to convert it to image.'));
        }

        await withReaction(conn, m, '🖼️', async () => {
            const buffer = await downloadMedia(q, 5);
            const imgBuffer = await stickerToImage(buffer);
            await conn.sendMessage(m.chat, { image: imgBuffer, caption: `✨ *Converted by Mantra*` }, { quoted: m });
        });
    }
});

/**
 * VIDEO TO AUDIO
 */
addCommand({
    pattern: 'toaudio',
    alias: ['mp3', 'tomp3'],
    category: 'converter',
    desc: 'Convert video to audio',
    handler: async (m, { conn }) => {
        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || '';

        if (!/video/.test(mime)) {
            return m.reply(UI.error('Not a Video', 'Reply to a video to extract audio.'));
        }

        await withReaction(conn, m, '🎵', async () => {
            const buffer = await downloadMedia(q, 25);
            const audioBuffer = await toAudio(buffer, 'mp4');
            await conn.sendMessage(m.chat, { audio: audioBuffer, mimetype: 'audio/mpeg' }, { quoted: m });
        });
    }
});

/**
 * AUDIO TO PTT (Voice Note)
 */
addCommand({
    pattern: 'toptt',
    alias: ['tovn', 'voice', 'tovoice', 'tovoicenote'],
    category: 'converter',
    desc: 'Convert audio to voice note',
    handler: async (m, { conn }) => {
        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || '';

        if (!/audio/.test(mime)) {
            return m.reply(UI.error('Not Audio', 'Reply to an audio file to convert to voice note.'));
        }

        await withReaction(conn, m, '🎙️', async () => {
            const buffer = await downloadMedia(q, 15);
            const pttBuffer = await toPTT(buffer, 'mp3');
            await conn.sendMessage(m.chat, { audio: pttBuffer, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: m });
        });
    }
});

/**
 * AUDIO TO VIDEO (Black Screen)
 */
addCommand({
    pattern: 'tovideo',
    alias: ['tomp4', 'tovid', 'toblackscreen', 'blackscreen'],
    category: 'converter',
    desc: 'Convert audio to black screen video',
    handler: async (m, { conn }) => {
        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || '';

        if (!/audio/.test(mime)) {
            return m.reply(UI.error('Not Audio', 'Reply to audio to create a black screen video.'));
        }

        await withReaction(conn, m, '🎥', async () => {
            const buffer = await downloadMedia(q, 15);
            const videoBuffer = await toVideo(buffer, 'mp3');
            await conn.sendMessage(m.chat, { video: videoBuffer, caption: '🎥 *Converted by Mantra*' }, { quoted: m });
        });
    }
});
