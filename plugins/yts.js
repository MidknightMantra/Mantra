import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import { validateText } from '../src/utils/validator.js';
import { withTimeout } from '../src/utils/timeout.js';
import ytSearch from 'yt-search';

addCommand({
    pattern: 'yts',
    alias: ['ytsearch', 'find'],
    category: 'tools',
    handler: async (m, { conn, text }) => {
        try {
            // Input validation
            const query = validateText(text, true);

            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // Search with timeout
            const search = await withTimeout(
                ytSearch(query),
                15000,
                'YouTube search'
            );

            const videos = search.videos.slice(0, 5);

            if (videos.length === 0) {
                await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
                return m.reply(UI.error('No Results', `No videos found for "${query}"`, 'Try different keywords\\nCheck spelling\\nMake query more specific'));
            }

            // Format results
            let msg = `🔮 *MANTRA YOUTUBE SEARCH*\n${global.divider}\n`;
            videos.forEach((v, i) => {
                msg += `*${i + 1}. ${v.title}*\n`;
                msg += `⏱️ *Duration:* ${v.timestamp}\n`;
                msg += `🔗 *Link:* ${v.url}\n\n`;
            });
            msg += `${global.divider}\n💡 *Tip:* Use *${global.prefix}song <link>* to download!`;

            // Send results with thumbnail
            await conn.sendMessage(m.chat, {
                image: { url: videos[0].thumbnail },
                caption: msg
            }, { quoted: m });

            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (error) {
            log.error('YouTube search failed', error, {
                command: 'yts',
                query: text?.substring(0, 50),
                user: m.sender
            });

            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });

            if (error.message.includes('validation')) {
                return m.reply(UI.error('Invalid Input', error.message, 'Provide a search query\\nExample: .yts Despacito'));
            }

            if (error.message.includes('timed out')) {
                return m.reply(UI.error('Timeout', 'Search took too long', 'Check internet connection\\nTry again later'));
            }

            m.reply(UI.error(
                'YouTube Search Failed',
                error.message || 'Search failed',
                'Check your search query\\nVerify internet connection\\nAPI may be temporarily down'
            ));
        }
    }
});