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

            // 2. Define multiple Instagram API endpoints with proper extraction
            const apis = [
                {
                    name: 'GiftedTech',
                    fetch: async () => {
                        const { data } = await axios.get(`https://api.giftedtech.co.ke/api/download/instadl?apikey=gifted&url=${encodeURIComponent(text)}`, { timeout: 15000 });
                        if (data.result?.download_url) return data.result.download_url;
                        throw new Error('No URL');
                    }
                },
                {
                    name: 'KeithDL',
                    fetch: async () => {
                        const { data } = await axios.get(`https://apiskeith.vercel.app/download/instadl?url=${encodeURIComponent(text)}`, { timeout: 15000 });
                        if (data.result) return data.result;
                        throw new Error('No URL');
                    }
                },
                {
                    name: 'KeithPosts',
                    fetch: async () => {
                        // Extract username from URL
                        const username = text.match(/instagram\.com\/([^\/\?]+)/)?.[1];
                        if (!username) throw new Error('No username');
                        const { data } = await axios.get(`https://apiskeith.vercel.app/download/instaposts?q=${username}`, { timeout: 15000 });
                        if (data.url) return data.url;
                        throw new Error('No URL');
                    }
                }
            ];

            // 3. Race all APIs - first successful response wins
            const racers = apis.map(api =>
                api.fetch()
                    .then(url => ({ url, source: api.name }))
                    .catch(err => {
                        console.log(`${api.name} failed:`, err.message);
                        throw err;
                    })
            );

            // 4. Get the first successful response
            const winner = await Promise.any(racers);

            console.log(`Instagram download via ${winner.source}:`, winner.url.substring(0, 100));

            // 5. Send the Instagram video/image
            await conn.sendMessage(m.chat, {
                video: { url: winner.url },
                caption: `🔮 *Instagram Download*\n${global.divider}\n✦ *Link:* ${text.substring(0, 50)}...`,
                mimetype: 'video/mp4'
            }, { quoted: m });

            // 6. Success Reaction
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            console.error('Instagram Download Error:', e.message || e);
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });

            // More helpful error message
            if (e.message?.includes('AggregateError') || e.errors) {
                m.reply(`${global.emojis.error} ⏤ All Instagram APIs failed. The post might be:\n• Private account\n• Invalid/deleted post\n• Region-blocked content`);
            } else {
                m.reply(`${global.emojis.error} ⏤ Download failed. Please check the URL and try again.`);
            }
        }
    }
});