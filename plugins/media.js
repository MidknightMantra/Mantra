import { addCommand } from '../lib/plugins.js';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import fs from 'fs';
import { exec } from 'child_process';
import path from 'path';

// Helper to getRandom file name
const getRandom = (ext) => {
    return `${Math.floor(Math.random() * 10000)}${ext}`;
};

// 1. STICKER COMMAND
addCommand({
    pattern: 'sticker',
    handler: async (m, { conn }) => {
        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || '';

        if (/image|video|webp/.test(mime)) {
            let media = await q.download();

            let encmedia = getRandom('.webp');
            let path_media = getRandom('.' + mime.split('/')[1]);

            // Save media locally first
            fs.writeFileSync(path_media, media);

            // FFMPEG Command: Convert to WebP (512x512)
            exec(`ffmpeg -i ${path_media} -vcodec libwebp -filter:v fps=fps=20 -lossless 1 -loop 0 -preset default -an -vsync 0 -s 512:512 ${encmedia}`, (err) => {
                fs.unlinkSync(path_media); // Clean up original

                if (err) {
                    return m.reply(`${global.emojis.error} Error converting media.`);
                }

                conn.sendMessage(m.chat, { sticker: fs.readFileSync(encmedia) }, { quoted: m });
                fs.unlinkSync(encmedia); // Clean up sticker file
            });
        } else {
            m.reply(`${global.emojis.info} Reply to an image or video with *${global.prefix}sticker*`);
        }
    }
});

// 2. TOIMG COMMAND (Sticker -> Image)
addCommand({
    pattern: 'toimg',
    handler: async (m, { conn }) => {
        if (!m.quoted) return m.reply(`${global.emojis.warning} Reply to a sticker!`);

        const q = m.quoted;
        const mime = q.mimetype || '';

        if (!/webp/.test(mime)) return m.reply(`${global.emojis.warning} That is not a sticker.`);

        try {
            let media = await q.download();
            let webpPath = getRandom('.webp');
            let pngPath = getRandom('.png');

            fs.writeFileSync(webpPath, media);

            // FFMPEG Command: Convert WebP to PNG
            exec(`ffmpeg -i ${webpPath} ${pngPath}`, (err) => {
                fs.unlinkSync(webpPath); // Delete webp

                if (err) {
                    console.error(err);
                    return m.reply(`${global.emojis.error} Failed to convert sticker.`);
                }

                conn.sendMessage(m.chat, { image: fs.readFileSync(pngPath), caption: `${global.emojis.success} *Converted to Image*` }, { quoted: m });
                fs.unlinkSync(pngPath); // Delete png
            });

        } catch (e) {
            console.error(e);
            m.reply(`${global.emojis.error} Error processing sticker.`);
        }
    }
});