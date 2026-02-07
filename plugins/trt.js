import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import { apiCall } from '../src/utils/apiHelper.js';
import { validateText } from '../src/utils/validator.js';
import { withTimeout } from '../src/utils/timeout.js';

addCommand({
    pattern: 'trt',
    alias: ['translate', 'tr'],
    category: 'tools',
    handler: async (m, { conn, text, args }) => {
        try {
            let msgToTranslate = '';
            let targetLang = 'en';

            // Parse input
            if (m.quoted) {
                msgToTranslate = m.quoted.text || m.quoted.caption || '';
                if (args[0]) targetLang = args[0].toLowerCase();
            } else if (args.length >= 2) {
                targetLang = args[0].toLowerCase();
                msgToTranslate = args.slice(1).join(' ');
            } else if (args.length === 1 && !m.quoted) {
                targetLang = 'en';
                msgToTranslate = args.join(' ');
            } else {
                return m.reply(`${global.emojis.warning} *Usage:* \n1. Reply: .trt es\n2. Type: .trt es hello`);
            }

            // Validate text
            const textToTranslate = validateText(msgToTranslate);

            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // API call with retry
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(textToTranslate)}`;

            const data = await withTimeout(
                apiCall(url, { timeout: 10000 }, 3),
                15000,
                'Translation'
            );

            if (!data || !data[0]) {
                throw new Error('Invalid translation response');
            }

            // Parse results
            const translatedText = data[0].map(segment => segment[0]).join('');
            const sourceLang = data[2];

            // Build response
            const response = `🔮 *Mantra Translate*\n${global.divider}\n` +
                `🗣️ *From:* [${sourceLang.toUpperCase()}]\n` +
                `💬 *To:* [${targetLang.toUpperCase()}]\n\n` +
                `${translatedText}\n` +
                `${global.divider}`;

            await m.reply(response);
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (error) {
            log.error('Translation failed', error, { text, targetLang: args[0], command: 'trt' });

            if (error.message.includes('validation')) {
                return m.reply(UI.error('Invalid Input', error.message, 'Provide text to translate\\nExample: .trt es hello world'));
            }

            if (error.response?.status === 400) {
                return m.reply(UI.error('Invalid Language', 'Language code not supported', 'Use 2-letter codes (en, es, fr)\\nCheck language code spelling'));
            }

            throw error;
        }
    }
});