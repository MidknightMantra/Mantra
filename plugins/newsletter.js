import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import axios from 'axios';

addCommand({
    pattern: 'newsletter',
    alias: ['channel', 'searchchannel'],
    category: 'tools',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(`${global.emojis.warning} *Usage:* ${global.prefix}newsletter <query>`);

        try {
            // 1. Initial Reaction
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // 2. Search Channels
            const { data } = await axios.get(`https://api.guruapi.tech/wa/channel?query=${encodeURIComponent(text)}`);

            if (!data.channels || data.channels.length === 0) {
                await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
                return m.reply(`${global.emojis.error} No channels found.`);
            }

            // 3. Format Results
            let msg = `🔮 *WhatsApp Channels Search* 🔮\n${global.divider}\n`;

            data.channels.slice(0, 5).forEach((ch) => {
                msg += `📺 *Name:* ${ch.name}\n`;
                msg += `👥 *Followers:* ${ch.followers}\n`;
                if (ch.id) msg += `🔗 *Link:* https://whatsapp.com/channel/${ch.id}\n`;
                msg += `──────────────────\n`;
            });

            // 4. Send Results
            await conn.sendMessage(m.chat, { text: msg }, { quoted: m });

            // 5. Success Reaction
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            log.error('Newsletter search failed', e, { command: 'newsletter', query: text?.substring(0, 50), user: m.sender });
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            m.reply(UI.error('Channel Search Failed', e.message || 'Search failed', 'Check your search term\nAPI may be busy\nTry again in a moment'));
        }
    }
});