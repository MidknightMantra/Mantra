import { addCommand } from '../lib/plugins.js';
import axios from 'axios';

addCommand({
    pattern: 'insta',
    alias: ['ig'],
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(`*Enter Instagram URL*`);
        try {
            await m.reply(global.emojis.waiting);
            const { data } = await axios.get(`https://api.guruapi.tech/insta/v1/igdl?url=${text}`);
            if (data.media) {
                for (let item of data.media) {
                    await conn.sendMessage(m.chat, { [item.type === 'video' ? 'video' : 'image']: { url: item.url } }, { quoted: m });
                }
            }
        } catch (e) { m.reply(global.emojis.error); }
    }
});