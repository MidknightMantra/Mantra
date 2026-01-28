import { addCommand } from '../lib/plugins.js';
import ytSearch from 'yt-search';

addCommand({
    pattern: 'yts',
    alias: ['ytsearch', 'find'],
    desc: 'Search for YouTube videos',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(`${global.emojis.warning} *Usage:* ${global.prefix}yts <query>`);

        try {
            await m.reply(global.emojis.waiting);
            const search = await ytSearch(text);
            const videos = search.videos.slice(0, 5); // Get top 5 results

            if (videos.length === 0) return m.reply(`${global.emojis.error} No results found.`);

            let msg = `🔮 *MANTRA YOUTUBE SEARCH*\n\n`;
            videos.forEach((v, i) => {
                msg += `*${i + 1}. ${v.title}*\n`;
                msg += `⏱️ *Duration:* ${v.timestamp}\n`;
                msg += `🔗 *Link:* ${v.url}\n\n`;
            });

            msg += `💡 *Tip:* Reply with *${global.prefix}song <link>* to download!`;

            await conn.sendMessage(m.chat, {
                image: { url: videos[0].thumbnail },
                caption: msg
            }, { quoted: m });

        } catch (e) {
            console.error(e);
            m.reply(`${global.emojis.error} YouTube search failed.`);
        }
    }
});