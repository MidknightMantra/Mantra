import { addCommand } from '../lib/plugins.js';

addCommand({
    pattern: 'imagine',
    alias: ['dalle', 'img'],
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(`*Enter prompt*`);
        try {
            await m.reply(global.emojis.waiting);
            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(text)}`;
            await conn.sendMessage(m.chat, { image: { url: imageUrl }, caption: `🔮 *Vision:* ${text}` }, { quoted: m });
        } catch (e) { m.reply(global.emojis.error); }
    }
});