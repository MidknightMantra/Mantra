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

// Bible Translations Mapping
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

// Quran Validation Schema
const quranSchema = Joi.object({
    surah: Joi.number().integer().min(1).max(114).required(),
    ayah: Joi.number().integer().min(1).max(300).required()
});

/**
 * BIBLE COMMAND
 * Fetches verses from bible-api.com
 */
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
            await withReaction(conn, m, '⏳', async () => {
                const parts = text.trim().split(/\s+/);
                let reference = parts[0];
                let translation = 'web';
                let isRandom = false;

                if (reference.toLowerCase() === 'random') {
                    isRandom = true;
                    if (parts.length > 1) translation = parts[1].toLowerCase();
                } else {
                    // Check if last part is a translation code
                    const lastPart = parts[parts.length - 1].toLowerCase();
                    if (supportedTranslations[lastPart]) {
                        translation = lastPart;
                        reference = parts.slice(0, -1).join(' ');
                    } else {
                        reference = parts.join(' ');
                    }
                }

                if (!supportedTranslations[translation]) {
                    throw new Error('Invalid translation code');
                }

                const url = isRandom
                    ? `https://bible-api.com/data/${translation}/random`
                    : `https://bible-api.com/${encodeURIComponent(reference)}?translation=${translation}`;

                const response = await axios.get(url);
                const data = response.data;

                if (!data || (!data.text && !data.verses)) {
                    throw new Error('Verse not found');
                }

                let verseText = data.verses
                    ? data.verses.map(v => `${v.verse}: ${v.text.trim()}`).join('\n')
                    : data.text.trim();

                let msg = `✧ *Holy Scripture* ✧\n${global.divider}\n`;
                msg += `✦ *Ref:* ${data.reference} (${supportedTranslations[translation]})\n\n`;
                msg += `"${verseText}"\n`;
                msg += `\n${global.divider}\n`;
                if (isRandom) msg += `✦ *Note:* This is a random verse.\n`;

                await m.reply(msg);
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
