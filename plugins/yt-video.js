import { addCommand } from '../lib/plugins.js';
import ytdl from 'ytdl-core';

addCommand({
    pattern: 'video',
    alias: ['ytv'],
    handler: async (m, { conn, text }) => {
        if (!text || !text.includes('http')) return m.reply(`*Enter YouTube URL*`);
        try {
            await m.reply(global.emojis.waiting);
            let stream = ytdl(text, { filter: 'audioandvideo', quality: 'highest' });
            await conn.sendMessage(m.chat, { video: { stream }, mimetype: 'video/mp4', caption: global.emojis.success }, { quoted: m });
        } catch (e) { m.reply(global.emojis.error); }
    }
});