import { addCommand } from '../lib/plugins.js';
import axios from 'axios';

addCommand({
    pattern: 'tiktok',
    alias: ['tt', 'ttdl'],
    category: 'download',
    handler: async (m, { conn, text }) => {
        if (!text || !text.includes('tiktok.com')) {
            return m.reply(`${global.emojis.warning} *Please provide a valid TikTok URL.*`);
        }

        try {
            // 1. Initial Reaction
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // 2. Fetch Video Data
            const { data } = await axios.get(`https://www.tikwm.com/api/?url=${encodeURIComponent(text)}`);

            if (!data.data?.play) {
                throw new Error('Video not found or unavailable');
            }

            // 3. Metadata Construction
            const videoData = data.data;
            const caption = `🎵 *TikTok Video*\n${global.divider}\n` +
                `📌 *Title:* ${videoData.title || 'No title'}\n` +
                `👤 *Author:* @${videoData.author?.unique_id || 'Unknown'}\n` +
                `❤️ *Likes:* ${videoData.digg_count || 0}\n` +
                `💬 *Comments:* ${videoData.comment_count || 0}\n` +
                `${global.divider}`;

            // 4. Send Video
            await conn.sendMessage(m.chat, {
                video: { url: videoData.play },
                caption: caption,
                mimetype: 'video/mp4'
            }, { quoted: m });

            // 5. Success Reaction
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            console.error('TikTok Error:', e);
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            m.reply(`${global.emojis.error} ⏤ Failed to download TikTok video. The link might be invalid or the video is private.`);
        }
    }
});