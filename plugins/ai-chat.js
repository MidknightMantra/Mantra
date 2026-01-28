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

addCommand({
    pattern: 'ai2',
    alias: ['gifted'],
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(`*Enter query*`);
        try {
            await m.reply(global.emojis.waiting);
            const { data } = await axios.get(`https://api.giftedtech.co.ke/api/ai/ai?apikey=gifted&q=${encodeURIComponent(text)}`);
            await m.reply(`🔮 *Gifted AI:* ${data.result || data.msg}`);
        } catch (e) { m.reply(global.emojis.error); }
    }
});

addCommand({
    pattern: 'gpt4o',
    alias: ['4o'],
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(`*Enter query*`);
        try {
            await m.reply(global.emojis.waiting);
            const { data } = await axios.get(`https://api.giftedtech.co.ke/api/ai/gpt4o?apikey=gifted&q=${encodeURIComponent(text)}`);
            await m.reply(`🔮 *GPT-4o:* ${data.result || data.msg}`);
        } catch (e) { m.reply(global.emojis.error); }
    }
});

addCommand({
    pattern: 'gpt4o-mini',
    alias: ['mini'],
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(`*Enter query*`);
        try {
            await m.reply(global.emojis.waiting);
            const { data } = await axios.get(`https://api.giftedtech.co.ke/api/ai/gpt4o-mini?apikey=gifted&q=${encodeURIComponent(text)}`);
            await m.reply(`🔮 *GPT-4o Mini:* ${data.result || data.msg}`);
        } catch (e) { m.reply(global.emojis.error); }
    }
});