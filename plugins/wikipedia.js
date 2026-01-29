import { addCommand } from '../lib/plugins.js';
import axios from 'axios';

addCommand({
    pattern: 'wiki',
    alias: ['wikipedia', 'w'],
    desc: 'Search Wikipedia for information',
    category: 'tools',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(`${global.emojis.warning} *Usage:* ${global.prefix}wiki <query>`);

        try {
            await m.reply(global.emojis.waiting);

            // Using the summary endpoint for speed and clean data
            const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(text)}`;
            const response = await axios.get(url);
            const data = response.data;

            // Check if the article exists or is a "disambiguation" page
            if (data.type === 'disambiguation') {
                return m.reply(`🔍 *Multiple results found.*\n\nPlease be more specific. Link: ${data.content_urls.desktop.page}`);
            }

            if (data.type === 'standard') {
                const header = `🎓 *Wikipedia: ${data.title}*`;
                const body = data.extract;
                const footer = `\n\n🔗 *Full Article:* ${data.content_urls.desktop.page}`;
                const fullMsg = `${header}\n\n${body}${footer}`;

                // Priority: Send with image if available
                if (data.thumbnail && data.thumbnail.source) {
                    await conn.sendMessage(m.chat, {
                        image: { url: data.thumbnail.source },
                        caption: fullMsg
                    }, { quoted: m });
                } else {
                    await m.reply(fullMsg);
                }
            } else {
                m.reply(`${global.emojis.error} No article found for "${text}".`);
            }
        } catch (e) {
            if (e.response && e.response.status === 404) {
                return m.reply(`${global.emojis.error} Article not found.`);
            }
            console.error('Wiki Error:', e);
            m.reply(`${global.emojis.error} Failed to reach Wikipedia. Please try again later.`);
        }
    }
});