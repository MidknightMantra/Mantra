import { addCommand } from '../lib/plugins.js';
import axios from 'axios';

addCommand({
    pattern: 'trt',
    alias: ['translate', 'tr'],
    category: 'tools',
    handler: async (m, { conn, text, args }) => {
        try {
            let msgToTranslate = '';
            let targetLang = 'en';

            // 1. Identify Content and Target Language
            if (m.quoted) {
                // Reply mode: .trt <lang> (Default to 'en' if no arg provided)
                msgToTranslate = m.quoted.text || m.quoted.caption || '';
                if (args[0]) targetLang = args[0];
            } else if (args.length >= 2) {
                // Direct mode: .trt <lang> <text>
                targetLang = args[0];
                msgToTranslate = args.slice(1).join(' ');
            } else if (args.length === 1 && !m.quoted) {
                // Direct mode (default to English): .trt <text>
                targetLang = 'en';
                msgToTranslate = args.join(' ');
            } else {
                return m.reply(`${global.emojis.warning} *Usage:* \n1. Reply: .trt es\n2. Type: .trt es hello`);
            }

            if (!msgToTranslate.trim()) return m.reply(`${global.emojis.error} No text found.`);

            // 2. Status Reaction (Processing)
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // 3. API Call
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(msgToTranslate)}`;
            const { data } = await axios.get(url);

            if (!data || !data[0]) throw new Error('Invalid API response');

            // 4. Parse Results
            let translatedText = data[0].map(segment => segment[0]).join('');
            const sourceLang = data[2];

            // 5. Build Response
            const response = `🔮 *Mantra Translate*\n${global.divider}\n` +
                `🗣️ *From:* [${sourceLang.toUpperCase()}]\n` +
                `💬 *To:* [${targetLang.toUpperCase()}]\n\n` +
                `📝 *Result:*\n${translatedText}`;

            await conn.sendMessage(m.chat, { text: response }, { quoted: m });

            // 6. Success Reaction
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            console.error('Translation Error:', e);
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            m.reply(`${global.emojis.error} Translation failed. Check your language codes.`);
        }
    }
});