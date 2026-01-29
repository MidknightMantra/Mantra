import { addCommand } from '../lib/plugins.js';
import { youtube } from 'btch-downloader'; // A more stable alternative to ytdl-core

addCommand({
    pattern: 'video',
    alias: ['ytv', 'playvid'],
    category: 'download',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(`${global.emojis.warning} *Please provide a YouTube URL or search term.*`);

        try {
            // 1. Reaction Feedback
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // 2. Search/Download Logic
            // This downloader handles both direct links and search queries automatically
            const data = await youtube(text);

            if (!data || !data.video) {
                throw new Error('Video not found');
            }

            // 3. Metadata Construction
            const caption = `🎬 *YouTube Video*\n${global.divider}\n` +
                `📌 *Title:* ${data.title}\n` +
                `⏱️ *Duration:* ${data.duration}\n` +
                `🔗 *Link:* ${text.includes('http') ? text : 'Search Result'}`;

            // 4. Delivery
            await conn.sendMessage(m.chat, {
                video: { url: data.video },
                mimetype: 'video/mp4',
                caption: caption
            }, { quoted: m });

            // Success Reaction
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            console.error('YTV Error:', e);
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            m.reply(`${global.emojis.error} ⏤ Failed to fetch the video. The link might be restricted or the server is down.`);
        }
    }
});