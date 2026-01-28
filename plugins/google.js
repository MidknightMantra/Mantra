import { addCommand } from '../lib/plugins.js';
import axios from 'axios';

addCommand({
    pattern: 'google',
    alias: ['g', 'search'],
    desc: 'Search Google for information',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(`${global.emojis.warning} *Usage:* ${global.prefix}google <query>`);

        try {
            await m.reply(global.emojis.waiting);
            const { data } = await axios.get(`https://api.guruapi.tech/google?query=${encodeURIComponent(text)}`);

            if (!data.results || data.results.length === 0) return m.reply(`${global.emojis.error} No results found.`);

            let msg = `🔮 *MANTRA SEARCH*\n\n`;
            data.results.slice(0, 3).forEach((res, i) => {
                msg += `*${i + 1}. ${res.title}*\n🔗 ${res.link}\n📝 _${res.snippet}_\n\n`;
            });

            await m.reply(msg);
        } catch (e) {
            m.reply(`${global.emojis.error} Search failed.`);
        }
    }
});