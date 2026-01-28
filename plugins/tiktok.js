import { addCommand } from '../lib/plugins.js';
import axios from 'axios';

addCommand({
    pattern: 'tiktok',
    alias: ['tt'],
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(`*Enter TikTok URL*`);
        try {
            await m.reply(global.emojis.waiting);
            const { data } = await axios.get(`https://www.tikwm.com/api/?url=${text}`);
            if (data.data?.play) {
                await conn.sendMessage(m.chat, { video: { url: data.data.play }, caption: global.emojis.success }, { quoted: m });
            }
        } catch (e) { m.reply(global.emojis.error); }
    }
});