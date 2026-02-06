import { addCommand } from '../lib/plugins.js';
import axios from 'axios';

const supportedTranslations = {
    web: 'World English Bible (default)',
    kjv: 'King James Version',
    asv: 'American Standard Version (1901)',
    bbe: 'Bible in Basic English',
    darby: 'Darby Bible',
    dra: 'Douay-Rheims 1899 American Edition',
    ylt: 'Young\'s Literal Translation (NT only)',
    webbe: 'World English Bible, British Edition',
    oebus: 'Open English Bible, US Edition',
    oebcw: 'Open English Bible, Commonwealth Edition',
    cherokee: 'Cherokee New Testament',
    cuv: 'Chinese Union Version',
    bkr: 'Bible kralická (Czech)',
    clementine: 'Clementine Latin Vulgate',
    almeida: 'João Ferreira de Almeida (Portuguese)',
    rccv: 'Protestant Romanian Corrected Cornilescu Version'
};

addCommand({
    pattern: 'bible',
    alias: ['verse', 'scripture'],
    category: 'tools',
    handler: async (m, { conn, text }) => {
        if (!text) {
            let usage = `${global.emojis.warning} *Usage:* ${global.prefix}bible <reference> [translation]\n`;
            usage += `Example: *${global.prefix}bible John 3:16 kjv*\n`;
            usage += `For a random verse: *${global.prefix}bible random [translation]*\n\n`;
            usage += `*Supported Translations:*\n`;
            for (const [code, name] of Object.entries(supportedTranslations)) {
                usage += `- ${code}: ${name}\n`;
            }
            return m.reply(usage);
        }

        try {
            // 1. Initial Reaction
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // 2. Parse input
            const parts = text.trim().split(/\s+/);
            let reference = parts[0];
            let translation = 'web'; // default
            let isRandom = false;

            if (reference.toLowerCase() === 'random') {
                isRandom = true;
                if (parts.length > 1) {
                    translation = parts[1].toLowerCase();
                }
            } else {
                reference = parts.slice(0, -1).join(' '); // Allow multi-word references
                if (parts.length > 1) {
                    translation = parts[parts.length - 1].toLowerCase();
                }
            }

            if (!Object.keys(supportedTranslations).includes(translation)) {
                await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
                return m.reply(`\( {global.emojis.error} Invalid translation. Use * \){global.prefix}bible* for list.`);
            }

            // 3. Construct URL
            let url;
            if (isRandom) {
                url = `https://bible-api.com/data/${translation}/random`;
            } else {
                url = `https://bible-api.com/\( {encodeURIComponent(reference)}?translation= \){translation}`;
            }

            // 4. Fetch data
            const response = await axios.get(url);
            const data = response.data;

            if (!data || (!data.text && !data.verses)) {
                await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
                return m.reply(`${global.emojis.error} Verse not found. Check the spelling or reference.`);
            }

            // 5. Format Message
            let verseText = '';
            let referenceStr = '';
            let translationName = supportedTranslations[translation];

            if (data.verses) { // For ranges or multiple
                referenceStr = data.reference;
                verseText = data.verses.map(v => `${v.verse}: ${v.text.trim()}`).join('\n');
            } else {
                verseText = data.text.trim();
                referenceStr = data.reference;
            }

            let msg = `✧ *Holy Scripture* ✧\n${global.divider}\n`;
            msg += `✦ *Ref:* \( {referenceStr} ( \){translationName})\n\n`;
            msg += `"${verseText}"\n`;
            msg += `\n${global.divider}\n`;
            if (isRandom) {
                msg += `✦ *Note:* This is a random verse. Use a specific reference for exact quotes.\n`;
            }

            // 6. Send Message
            await conn.sendMessage(m.chat, { text: msg }, { quoted: m });

            // 7. Success Reaction
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            console.error('Bible Error:', e);
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            let errorMsg = `${global.emojis.error} Could not fetch that scripture.`;
            if (e.response && e.response.status === 429) {
                errorMsg += ` Rate limit exceeded. Try again later.`;
            }
            m.reply(errorMsg);
        }
    }
});
