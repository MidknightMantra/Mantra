import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import { validateText, schemas } from '../src/utils/validator.js';
import { apiCall } from '../src/utils/apiHelper.js';
import { withTimeout } from '../src/utils/timeout.js';
import Joi from 'joi';

// Validation schema for Surah:Ayah format
const quranSchema = Joi.object({
    surah: Joi.number().integer().min(1).max(114).required(),
    ayah: Joi.number().integer().min(1).max(300).required()
});

addCommand({
    pattern: 'quran',
    alias: ['ayah', 'surah'],
    category: 'tools',
    handler: async (m, { conn, text }) => {
        try {
            // Input validation
            validateText(text, true);

            // Parse and validate Surah:Ayah format
            const parts = text.split(':');
            if (parts.length !== 2) {
                return m.reply(UI.error('Invalid Format', 'Use format: Surah:Ayah', 'Example: .quran 1:1\\nExample: .quran 112:1'));
            }

            const [surahStr, ayahStr] = parts;
            const { error, value } = quranSchema.validate({
                surah: parseInt(surahStr),
                ayah: parseInt(ayahStr)
            });

            if (error) {
                return m.reply(UI.error('Invalid Numbers', error.details[0].message, 'Surah: 1-114\\nAyah: 1-300\\nExample: .quran 1:7'));
            }

            const { surah, ayah } = value;

            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // Fetch text and audio with timeout
            const [textData, audioData] = await Promise.all([
                withTimeout(
                    apiCall(`http://api.alquran.cloud/v1/ayah/${surah}:${ayah}/editions/quran-simple,en.asad`, { timeout: 10000 }, 3),
                    15000,
                    'Quran text fetch'
                ),
                withTimeout(
                    apiCall(`http://api.alquran.cloud/v1/ayah/${surah}:${ayah}/ar.alafasy`, { timeout: 10000 }, 3),
                    15000,
                    'Quran audio fetch'
                )
            ]);

            if (textData.code !== 200 || audioData.code !== 200) {
                throw new Error('Ayah not found');
            }

            const arabic = textData.data[0];
            const english = textData.data[1];
            const audio = audioData.data;

            // Format message
            let msg = `🔮 *MANTRA QURAN* 🔮\n\n`;
            msg += `📖 *Surah:* ${arabic.surah.englishName} (${arabic.surah.name})\n`;
            msg += `🔢 *Ayah:* ${arabic.numberInSurah}\n`;
            msg += `──────────────────\n\n`;
            msg += `🕋 *${arabic.text}*\n\n`;
            msg += `📝 _${english.text}_\n`;
            msg += `\n──────────────────`;

            // Send message with audio
            await conn.sendMessage(m.chat, {
                text: msg,
                contextInfo: {
                    externalAdReply: {
                        title: `${arabic.surah.englishName} - Ayah ${arabic.numberInSurah}`,
                        body: 'Quran Audio',
                        mediaType: 1,
                        renderLargerThumbnail: false
                    }
                }
            }, { quoted: m });

            // Send audio
            await conn.sendMessage(m.chat, {
                audio: { url: audio.audioSecondary[0] || audio.audio },
                mimetype: 'audio/mp4',
                ptt: true
            }, { quoted: m });

            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (error) {
            log.error('Quran fetch failed', error, { command: 'quran', text, user: m.sender });

            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });

            if (error.message.includes('validation')) {
                return m.reply(UI.error('Invalid Input', error.message, 'Use format: .quran Surah:Ayah\\nExample: .quran 1:1'));
            }

            if (error.message.includes('not found')) {
                return m.reply(UI.error('Ayah Not Found', 'Invalid Surah or Ayah number', 'Valid Surah: 1-114\\nCheck Ayah number\\nExample: .quran 2:255'));
            }

            m.reply(UI.error('Quran Fetch Failed', error.message || 'Failed to fetch Ayah', 'Check Surah and Ayah numbers\\nTry again later\\nAPI may be temporarily down'));
        }
    }
});