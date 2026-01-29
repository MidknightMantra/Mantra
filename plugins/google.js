import { addCommand } from '../lib/plugins.js';
import axios from 'axios';

addCommand({
    pattern: 'google',
    alias: ['g', 'search'],
    category: 'tools',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(`${global.emojis.warning} *Usage:* ${global.prefix}google <query>`);

        try {
            // 1. Initial Reaction
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // 2. Fetch Search Results
            const { data } = await axios.get(`https://api.guruapi.tech/google?query=${encodeURIComponent(text)}`);

            if (!data.results || data.results.length === 0) {
                await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
                return m.reply(`${global.emojis.error} No results found.`);
            }

            // 3. Format Results
            let msg = `🔮 *MANTRA SEARCH*\n${global.divider}\n`;
            data.results.slice(0, 3).forEach((res, i) => {
                msg += `*${i + 1}. ${res.title}*\n🔗 ${res.link}\n📝 _${res.snippet}_\n\n`;
            });
            msg += `${global.divider}`;

            // 4. Send Results
            await m.reply(msg);

            // 5. Success Reaction
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            console.error('Google Search Error:', e);
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            m.reply(`${global.emojis.error} ⏤ Search failed. Try again later.`);
        }
    }
});