import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import { validateText } from '../src/utils/validator.js';
import { apiCall } from '../src/utils/apiHelper.js';
import { withTimeout } from '../src/utils/timeout.js';
import { cache } from '../lib/redis.js';
import { react, withReaction } from '../src/utils/messaging.js';
import axios from 'axios';
import Joi from 'joi';

import { sendSimpleButtons } from '../src/utils/buttons.js';

// Quran Validation Schema
const quranSchema = Joi.object({
    surah: Joi.number().integer().min(1).max(114).required(),
    ayah: Joi.number().integer().min(1).max(300).required()
});

/**
 * BIBLE COMMAND
 * Fetches verses from GiftedTech API with multi-language support
 */
addCommand({
    pattern: 'bible',
    alias: ['verse', 'bibleverse', 'scripture'],
    react: '📖',
    category: 'tools',
    handler: async (m, { conn, text, isOwner }) => {
        const verse = text?.trim();
        if (!verse) {
            return m.reply(`${global.emojis.warning} *Usage:* ${global.prefix}bible <reference>\nExample: *John 3:16*`);
        }

        try {
            await withReaction(conn, m, '⏳', async () => {
                const url = `${global.giftedApiUrl}/api/tools/bible`;
                const params = {
                    apikey: global.giftedApiKey,
                    verse: verse
                };

                const response = await axios.get(url, { params });
                const res = response.data;

                if (!res?.success || !res?.result) {
                    throw new Error('Failed to fetch Bible verse. Please check the reference format.');
                }

                const r = res.result;

                let txt = `✧ *${global.botName} BIBLE* ✧\n${global.divider}\n`;
                txt += `📖 *Verse:* ${r.verse || verse}\n`;
                txt += `📊 *Verse Count:* ${r.versesCount || 1}\n\n`;
                txt += `*English:*\n${r.data?.trim() || "N/A"}\n\n`;

                if (r.translations) {
                    if (r.translations.swahili) {
                        txt += `*Swahili:*\n${r.translations.swahili}\n\n`;
                    }
                    if (r.translations.hindi) {
                        txt += `*Hindi:*\n${r.translations.hindi}\n\n`;
                    }
                }

                txt += global.divider;

                const copyContent = r.data?.trim() || "";

                await sendSimpleButtons(conn, m.chat, txt, [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({
                            display_text: "📋 Copy Verse",
                            copy_code: copyContent,
                        }),
                    },
                ], { footer: global.botName, quoted: m });
            });
        } catch (error) {
            log.error('Bible command failed', error, { text });
            await react(conn, m, '❌');
            m.reply(UI.error('Bible Error', error.message || 'Failed to fetch verse', 'Check reference format (e.g. John 3:16)'));
        }
    }
});

/**
 * QURAN COMMAND
 * Fetches Ayahs from api.alquran.cloud
 */
addCommand({
    pattern: 'quran',
    alias: ['ayah', 'surah'],
    category: 'tools',
    handler: async (m, { conn, text }) => {
        try {
            validateText(text, true);

            const parts = text.split(':');
            if (parts.length !== 2) {
                return m.reply(UI.error('Invalid Format', 'Use format: Surah:Ayah', 'Example: .quran 1:1'));
            }

            const { error, value } = quranSchema.validate({
                surah: parseInt(parts[0]),
                ayah: parseInt(parts[1])
            });

            if (error) {
                return m.reply(UI.error('Invalid Numbers', error.details[0].message, 'Surah: 1-114, Ayah: 1-300'));
            }

            const { surah, ayah } = value;

            await withReaction(conn, m, '⏳', async () => {
                const cacheKey = `quran:${surah}:${ayah}`;
                let cachedData = await cache.get(cacheKey);

                let textData, audioData;

                if (cachedData) {
                    ({ text: textData, audio: audioData } = cachedData);
                    log.perf('quran-cache-hit', { surah, ayah });
                } else {
                    [textData, audioData] = await Promise.all([
                        withTimeout(apiCall(`http://api.alquran.cloud/v1/ayah/${surah}:${ayah}/editions/quran-simple,en.asad`, { timeout: 10000 }), 15000),
                        withTimeout(apiCall(`http://api.alquran.cloud/v1/ayah/${surah}:${ayah}/ar.alafasy`, { timeout: 10000 }), 15000)
                    ]);

                    await cache.set(cacheKey, { text: textData, audio: audioData }, 86400); // 24h cache
                }

                if (textData.code !== 200 || audioData.code !== 200) {
                    throw new Error('Ayah not found');
                }

                const arabic = textData.data[0];
                const english = textData.data[1];
                const audio = audioData.data;

                let msg = `🔮 *MANTRA QURAN* 🔮\n\n`;
                msg += `📖 *Surah:* ${arabic.surah.englishName} (${arabic.surah.name})\n`;
                msg += `🔢 *Ayah:* ${arabic.numberInSurah}\n`;
                msg += `──────────────────\n\n`;
                msg += `🕋 *${arabic.text}*\n\n`;
                msg += `📝 _${english.text}_\n`;
                msg += `\n──────────────────`;

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

                await conn.sendMessage(m.chat, {
                    audio: { url: audio.audioSecondary[0] || audio.audio },
                    mimetype: 'audio/mp4',
                    ptt: true
                }, { quoted: m });
            });
        } catch (error) {
            log.error('Quran command failed', error, { text });
            await react(conn, m, '❌');
            m.reply(UI.error('Quran Error', error.message || 'Failed to fetch Ayah', 'Example: .quran 2:255'));
        }
    }
});

log.info('Scripture plugin loaded (consolidated Bible & Quran)');
