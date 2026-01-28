import { addCommand } from '../lib/plugins.js';
import ytdl from 'ytdl-core';

addCommand({
    pattern: 'song',
    alias: ['play'],
    handler: async (m, { conn, text }) => {
        if (!text || !text.includes('http')) return m.reply(`*Enter YouTube URL*`);
        try {
            await m.reply(global.emojis.waiting);
            let info = await ytdl.getInfo(text);
            let stream = ytdl(text, { filter: 'audioonly', quality: 'highestaudio' });
            await conn.sendMessage(m.chat, { audio: { stream }, mimetype: 'audio/mpeg', fileName: `${info.videoDetails.title}.mp3` }, { quoted: m });
        } catch (e) { m.reply(global.emojis.error); }
    }
});