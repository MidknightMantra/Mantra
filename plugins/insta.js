import { addCommand } from '../lib/plugins.js';
import axios from 'axios';

addCommand({
    pattern: 'insta',
    alias: ['ig', 'instagram'],
    category: 'download',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(`${global.emojis.warning} *Usage:* ${global.prefix}insta <url>`);

        try {
            // 1. Initial Reaction
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // 2. Define multiple Instagram API endpoints (race to fastest)
            const apis = [
                {
                    name: 'GiftedTech',
                    url: `https://api.giftedtech.co.ke/api/download/instadl?apikey=gifted&url=${encodeURIComponent(text)}`,
                    extract: (data) => data.result?.download_url || data.download_url
                },
                {
                    name: 'KeithPosts',
                    url: `https://apiskeith.vercel.app/download/instaposts?q=${encodeURIComponent(text)}`,
                    extract: (data) => data.url || data.download_url
                },
                {
                    name: 'KeithDL',
                    url: `https://apiskeith.vercel.app/download/instadl?url=${encodeURIComponent(text)}`,
                    extract: (data) => data.url || data.download_url || data.result?.url
                }
            ];

            // 3. Race all APIs - first to respond wins
            const racers = apis.map(api =>
                axios.get(api.url, { timeout: 15000 })
                    .then(res => {
                        const videoUrl = api.extract(res.data);
                        if (!videoUrl) throw new Error('No video URL in response');
                        return { url: videoUrl, source: api.name };
                    })
            );

            // 4. Get the first successful response
            const winner = await Promise.any(racers);

            // 5. Send the Instagram video/image
            await conn.sendMessage(m.chat, {
                video: { url: winner.url },
                caption: `🔮 *Instagram Download*\n${global.divider}\n✦ *Source:* ${text}\n✦ *API:* ${winner.source}`,
                mimetype: 'video/mp4'
            }, { quoted: m });

            // 6. Success Reaction
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            console.error('Instagram Download Error:', e);
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });

            // More helpful error message
            if (e.message.includes('AggregateError')) {
                m.reply(`${global.emojis.error} ⏤ All Instagram APIs failed. The post might be private or the link is invalid.`);
            } else {
                m.reply(`${global.emojis.error} ⏤ Download failed. Please check the URL and try again.`);
            }
        }
    }
});