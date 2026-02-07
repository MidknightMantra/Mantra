import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import ytSearch from 'yt-search';

addCommand({
    pattern: 'yts',
    alias: ['ytsearch', 'find'],
    category: 'tools',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(`${global.emojis.warning} *Usage:* ${global.prefix}yts <query>`);

        try {
            // 1. Initial Reaction
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // 2. Search YouTube
            const search = await ytSearch(text);
            const videos = search.videos.slice(0, 5);

            if (videos.length === 0) {
                await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
                return m.reply(`${global.emojis.error} No results found.`);
            }

            // 3. Format Results
            let msg = `🔮 *MANTRA YOUTUBE SEARCH*\n${global.divider}\n`;
            videos.forEach((v, i) => {
                msg += `*${i + 1}. ${v.title}*\n`;
                msg += `⏱️ *Duration:* ${v.timestamp}\n`;
                msg += `🔗 *Link:* ${v.url}\n\n`;
            });
            msg += `${global.divider}\n💡 *Tip:* Reply with *${global.prefix}song <link>* to download!`;

            // 4. Send Results with Thumbnail
            await conn.sendMessage(m.chat, {
                image: { url: videos[0].thumbnail },
                caption: msg
            }, { quoted: m });

            // 5. Success Reaction
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            log.error('YouTube search failed', e, { command: 'yts', query: text?.substring(0, 50), user: m.sender });
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            m.reply(UI.error('YouTube Search Failed', e.message || 'Search failed', 'Check your search query\nVerify internet connection\nAPI may be temporarily down'));
        }
    }
});