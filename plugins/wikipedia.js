import { addCommand } from '../lib/plugins.js';
import axios from 'axios';

addCommand({
    pattern: 'wiki',
    alias: ['wikipedia'],
    desc: 'Search Wikipedia',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(`${global.emojis.warning} *Usage:* ${global.prefix}wiki <topic>`);

        try {
            await m.reply(global.emojis.waiting);
            const { data } = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(text)}`);

            if (data.type === 'standard') {
                let msg = `🎓 *Wikipedia: ${data.title}*\n\n${data.extract}\n\n🔗 *Full Link:* ${data.content_urls.desktop.page}`;

                if (data.thumbnail) {
                    await conn.sendMessage(m.chat, { image: { url: data.thumbnail.source }, caption: msg }, { quoted: m });
                } else {
                    await m.reply(msg);
                }
            } else {
                m.reply(`${global.emojis.error} Could not find an article for that.`);
            }
        } catch (e) {
            m.reply(`${global.emojis.error} Wikipedia search failed.`);
        }
    }
});