import { addCommand } from '../lib/plugins.js';
import axios from 'axios';

addCommand({
    pattern: 'bible',
    alias: ['verse', 'scripture'],
    category: 'tools',
    handler: async (m, { conn, text }) => {
        if (!text) {
            return m.reply(`${global.emojis.warning} *Usage:* ${global.prefix}bible <Book Chapter:Verse>\nExample: *${global.prefix}bible John 3:16*`);
        }

        try {
            // 1. Initial Reaction
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // 2. Fetch from bible-api.com (Free, no key needed)
            const response = await axios.get(`https://bible-api.com/${encodeURIComponent(text)}`);
            const data = response.data;

            if (!data || !data.text) {
                await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
                return m.reply(`${global.emojis.error} Verse not found. Check the spelling.`);
            }

            // 3. Format Message
            const verseText = data.text.trim();
            const reference = data.reference;
            const translation = data.translation_name || 'WEB';

            let msg = `✧ *Holy Scripture* ✧\n${global.divider}\n`;
            msg += `✦ *Ref:* ${reference} (${translation})\n\n`;
            msg += `"${verseText}"\n`;
            msg += `\n${global.divider}`;

            // 4. Send Message
            await conn.sendMessage(m.chat, { text: msg }, { quoted: m });

            // 5. Success Reaction
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            console.error('Bible Error:', e);
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            m.reply(`${global.emojis.error} ⏤ Could not find that scripture.`);
        }
    }
});