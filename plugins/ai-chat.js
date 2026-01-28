import { addCommand } from '../lib/plugins.js';
import axios from 'axios';

addCommand({
    pattern: 'ai',
    alias: ['gpt', 'chat'],
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(`*Enter query*`);
        try {
            await m.reply(global.emojis.waiting);
            const { data } = await axios.get(`https://api.guruapi.tech/ai/gpt4?text=${encodeURIComponent(text)}`);
            await m.reply(`🔮 *AI:* ${data.msg || data.response}`);
        } catch (e) { m.reply(global.emojis.error); }
    }
});