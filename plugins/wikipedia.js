import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import axios from 'axios';

addCommand({
    pattern: 'wiki',
    alias: ['wikipedia', 'w'],
    category: 'tools',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(`${global.emojis.warning} *Usage:* ${global.prefix}wiki <query>`);

        try {
            // 1. Initial Reaction
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // 2. Fetch from Wikipedia API
            const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(text)}`;
            const response = await axios.get(url);
            const data = response.data;

            // 3. Check for disambiguation
            if (data.type === 'disambiguation') {
                await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
                return m.reply(`🔍 *Multiple results found.*\n\nPlease be more specific. Link: ${data.content_urls.desktop.page}`);
            }

            // 4. Format and Send Article
            if (data.type === 'standard') {
                const header = `🎓 *Wikipedia: ${data.title}*`;
                const body = data.extract;
                const footer = `\n\n🔗 *Full Article:* ${data.content_urls.desktop.page}`;
                const fullMsg = `${header}\n${global.divider}\n${body}${footer}`;

                // Send with image if available
                if (data.thumbnail && data.thumbnail.source) {
                    await conn.sendMessage(m.chat, {
                        image: { url: data.thumbnail.source },
                        caption: fullMsg
                    }, { quoted: m });
                } else {
                    await m.reply(fullMsg);
                }

                // 5. Success Reaction
                await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
            } else {
                await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
                m.reply(`${global.emojis.error} No article found for "${text}".`);
            }
        } catch (e) {
            log.error('Wikipedia fetch failed', e, { command: 'wiki', query: text?.substring(0, 50), user: m.sender });
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            if (e.response?.status === 404) {
                return m.reply(UI.error('Article Not Found', `No Wikipedia article found for "${text}"`, 'Check spelling\nTry different keywords\nUse more specific terms'));
            }
            m.reply(UI.error('Wikipedia Failed', e.message || 'Failed to reach Wikipedia', 'Check internet connection\nWikipedia may be down\nTry again in a moment'));
        }
    }
});