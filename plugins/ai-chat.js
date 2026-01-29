import { addCommand } from '../lib/plugins.js';
import axios from 'axios';

addCommand({
    pattern: 'ai',
    alias: ['gpt', 'chat', '4o', 'mini', 'gifted', 'ask'],
    category: 'ai',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(`${global.emojis.warning} *What is your question?*`);

        try {
            // 1. Initial Reaction
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // 2. Define our competitive API racers
            const apis = [
                {
                    name: 'GPT-4',
                    url: `https://api.guruapi.tech/ai/gpt4?text=${encodeURIComponent(text)}`,
                    extract: (d) => d.msg || d.response
                },
                {
                    name: 'Gifted-AI',
                    url: `https://api.giftedtech.co.ke/api/ai/ai?apikey=gifted&q=${encodeURIComponent(text)}`,
                    extract: (d) => d.result
                },
                {
                    name: 'GPT-4o',
                    url: `https://api.giftedtech.co.ke/api/ai/gpt4o?apikey=gifted&q=${encodeURIComponent(text)}`,
                    extract: (d) => d.result
                },
                {
                    name: 'GPT-4o-Mini',
                    url: `https://api.giftedtech.co.ke/api/ai/gpt4o-mini?apikey=gifted&q=${encodeURIComponent(text)}`,
                    extract: (d) => d.result
                }
            ];

            // 3. Create an array of active requests
            const racers = apis.map(api =>
                axios.get(api.url, { timeout: 10000 })
                    .then(res => {
                        const result = api.extract(res.data);
                        if (!result) throw new Error('Empty payload');
                        return { content: result, source: api.name };
                    })
            );

            // 4. Promise.any grabs the first one to resolve successfully
            const winner = await Promise.any(racers);

            const response = `✧ *${winner.source} (Fastest)* ✧\n${global.divider}\n${winner.content}`;
            await m.reply(response);

            // 5. Success Reaction
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            console.error('AI Error:', e);
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            m.reply(`${global.emojis.error} ⏤ All AI nodes are currently unreachable. Please try again later.`);
        }
    }
});