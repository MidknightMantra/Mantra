import { addCommand } from '../lib/plugins.js';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';
import fs from 'fs';
import { exec } from 'child_process';

addCommand({
    pattern: 'sticker',
    handler: async (m, { conn }) => {
        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || '';

        if (/image/.test(mime)) {
            let media = await q.download(); // Helper needed or use bailyes download
            let encmedia = await conn.downloadAndSaveMediaMessage(q, 'sticker');
            let ran = `${Math.floor(Math.random() * 10000)}.webp`;

            exec(`ffmpeg -i ${encmedia} -vcodec libwebp -filter:v fps=fps=20 -lossless 1 -loop 0 -preset default -an -vsync 0 -s 512:512 ${ran}`, (err) => {
                fs.unlinkSync(encmedia);
                if (err) return m.reply('Error converting to sticker');
                conn.sendMessage(m.chat, { sticker: fs.readFileSync(ran) }, { quoted: m });
                fs.unlinkSync(ran);
            });
        } else {
            m.reply(`Reply to an image with ${global.prefix}sticker`);
        }
    }
});