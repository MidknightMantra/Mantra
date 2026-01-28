import { addCommand } from '../lib/plugins.js';
import axios from 'axios';

addCommand({
    pattern: 'bible',
    alias: ['verse', 'scripture'],
    desc: 'Get a Bible verse',
    handler: async (m, { conn, text }) => {
        if (!text) {
            return m.reply(`${global.emojis.warning} *Usage:* ${global.prefix}bible <Book Chapter:Verse>\nExample: *${global.prefix}bible John 3:16*`);
        }

        try {
            await m.reply(global.emojis.waiting);

            // Fetch from bible-api.com (Free, no key needed)
            const response = await axios.get(`https://bible-api.com/${encodeURIComponent(text)}`);
            const data = response.data;

            if (!data || !data.text) {
                return m.reply(`${global.emojis.error} Verse not found. Check the spelling.`);
            }

            const verseText = data.text.trim();
            const reference = data.reference;
            const translation = data.translation_name || 'WEB';

            let msg = `✧ *Holy Scripture* ✧\n${global.divider}\n`;
            msg += `✦ *Ref:* ${reference} (${translation})\n\n`;
            msg += `"${verseText}"\n`;
            msg += `\n${global.divider}`;

            await conn.sendMessage(m.chat, { text: msg }, { quoted: m });

        } catch (e) {
            console.error(e);
            m.reply(`${global.emojis.error} Could not find that scripture.`);
        }
    }
});