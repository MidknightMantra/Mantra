import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
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
                        log.perf(`${api.name} API failed`, 0);
                        throw err;
                    })
            );

            // 4. Get the first successful response
            const winner = await Promise.any(racers);

            log.perf(`Instagram download via ${winner.source}`, 0);

            // 5. Send the Instagram video/image
            await conn.sendMessage(m.chat, {
                video: { url: winner.url },
                caption: `\n${global.divider}\n✦*Mantra Insta*`,
                mimetype: 'video/mp4'
            }, { quoted: m });

            // 6. Success Reaction
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            log.error('Instagram download failed', e, { command: 'insta', url: text?.substring(0, 50), user: m.sender });
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });

            // More helpful error message
            if (e.message?.includes('AggregateError') || e.errors) {
                m.reply(UI.error('Instagram Download Failed', 'All download APIs failed', 'Post might be from a private account\nPost may be deleted or invalid\nContent might be region-blocked'));
            } else {
                m.reply(UI.error('Instagram Download Failed', e.message || 'Download failed', 'Verify the URL is correct\nCheck if post is public\nTry again later'));
            }
        }
    }
});