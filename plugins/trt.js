import { addCommand } from '../lib/plugins.js';
import axios from 'axios';

addCommand({
    pattern: 'trt',
    alias: ['translate', 'tr'],
    desc: 'Translate text to any language',
    handler: async (m, { conn, text, args }) => {
        try {
            let msgToTranslate = '';
            let targetLang = 'en'; // Default to English

            // Scenario 1: Reply to a message with ".trt <lang>"
            if (m.quoted) {
                msgToTranslate = m.quoted.text || m.quoted.caption || m.quoted.conversation || '';
                if (args[0]) targetLang = args[0]; // e.g., .trt es
            }
            // Scenario 2: Direct command ".trt <lang> <text>"
            else if (args.length >= 2) {
                targetLang = args[0]; // First word is lang
                msgToTranslate = args.slice(1).join(' '); // Rest is text
            }
            // Scenario 3: No valid input
            else {
                return m.reply(`${global.emojis.warning} *Usage:*\n\n1. Reply to text: *${global.prefix}trt es*\n2. Type text: *${global.prefix}trt fr Hello World*`);
            }

            if (!msgToTranslate) return m.reply(`${global.emojis.error} No text found to translate.`);

            await m.reply(global.emojis.waiting);

            // Using Google Translate free endpoint
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(msgToTranslate)}`;

            const { data } = await axios.get(url);

            // Google Translate API returns a nested array. 
            // data[0][0][0] usually contains the translated text.
            let translatedText = '';

            // Loop through sentences (long text is split into segments)
            data[0].forEach(segment => {
                if (segment[0]) translatedText += segment[0];
            });

            const sourceLang = data[2]; // Detected source language

            const response = `🔮 *MANTRA TRANSLATE*\n\n` +
                `🗣️ *From:* ${sourceLang}\n` +
                `💬 *To:* ${targetLang}\n\n` +
                `📝 *Result:*\n${translatedText}`;

            await conn.sendMessage(m.chat, { text: response }, { quoted: m });

        } catch (e) {
            console.error(e);
            m.reply(`${global.emojis.error} Translation failed. Check the language code (e.g., en, es, fr, id).`);
        }
    }
});