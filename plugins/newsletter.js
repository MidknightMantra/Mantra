import { addCommand } from '../lib/plugins.js';
import axios from 'axios';

addCommand({
    pattern: 'newsletter',
    alias: ['channel', 'searchchannel'],
    desc: 'Search for WhatsApp Channels',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(`${global.emojis.warning} *Usage:* ${global.prefix}newsletter <query>`);

        try {
            await m.reply(global.emojis.waiting);

            // API to search channels
            // Note: If this API goes down, you may need to find an alternative or use Baileys' internal 'newsletterSearch' if supported in your version.
            const { data } = await axios.get(`https://api.guruapi.tech/wa/channel?query=${encodeURIComponent(text)}`);

            if (!data.channels || data.channels.length === 0) {
                return m.reply(`${global.emojis.error} No channels found.`);
            }

            let msg = `🔮 *WhatsApp Channels Search* 🔮\n\n`;

            // Display top 5 results
            data.channels.slice(0, 5).forEach((ch) => {
                msg += `📺 *Name:* ${ch.name}\n`;
                msg += `👥 *Followers:* ${ch.followers}\n`;
                // Constructing link via ID usually works if ID is available, otherwise just name
                if (ch.id) msg += `🔗 *Link:* https://whatsapp.com/channel/${ch.id}\n`;
                msg += `──────────────────\n`;
            });

            await conn.sendMessage(m.chat, { text: msg }, { quoted: m });

        } catch (e) {
            console.error(e);
            m.reply(`${global.emojis.error} Search failed. The API might be busy.`);
        }
    }
});