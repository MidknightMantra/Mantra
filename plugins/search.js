import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import { apiCall } from '../src/utils/apiHelper.js';
import { validateText } from '../src/utils/validator.js';
import { withTimeout } from '../src/utils/timeout.js';
import { react, withReaction } from '../src/utils/messaging.js';
import { cache } from '../lib/redis.js';
import axios from 'axios';

/**
 * GOOGLE SEARCH
 */
addCommand({
    pattern: 'google',
    alias: ['g', 'search'],
    category: 'search',
    desc: 'Search Google for information',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(UI.syntax('.google', '<query>', 'Search Google'));

        await withReaction(conn, m, '🔍', async () => {
            const data = await withTimeout(
                apiCall(`https://api.guruapi.tech/google?query=${encodeURIComponent(text)}`, { timeout: 10000 }, 3),
                15000,
                'Google search'
            );

            if (!data.results || data.results.length === 0) throw new Error('No results found.');

            let msg = `🔎 *MANTRA SEARCH*\n${global.divider}\n`;
            data.results.slice(0, 5).forEach((res, i) => {
                msg += `*${i + 1}. ${res.title}*\n🔗 ${res.link}\n`;
            });
            msg += `\n${global.divider}`;
            await m.reply(msg);
        });
    }
});

/**
 * WIKIPEDIA
 */
addCommand({
    pattern: 'wiki',
    alias: ['wikipedia'],
    category: 'search',
    desc: 'Search Wikipedia',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(UI.syntax('.wiki', '<topic>', 'Search Wikipedia'));

        await withReaction(conn, m, '📖', async () => {
            const data = await apiCall(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(text)}`);
            if (data.type === 'disambiguation') throw new Error('Query is too broad. Be more specific.');

            const response = `${UI.box(data.title)}\n\n${data.extract}\n\n🔗 _${data.content_urls.desktop.page}_`;
            await m.reply(response);
        });
    }
});

/**
 * WEATHER
 */
addCommand({
    pattern: 'weather',
    alias: ['w', 'forecast'],
    category: 'search',
    desc: 'Check current weather',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(UI.syntax('.weather', '<city>', 'Check weather'));

        await withReaction(conn, m, '🌦️', async () => {
            const cacheKey = `weather:${text.toLowerCase().trim()}`;
            let data = await cache.get(cacheKey);

            if (!data) {
                // Using wttr.in for a beautiful text/image report
                const res = await axios.get(`https://wttr.in/${encodeURIComponent(text)}?format=j1`);
                data = res.data;
                await cache.set(cacheKey, data, 1800); // 30 min cache
            }

            const current = data.current_condition[0];
            const area = data.nearest_area[0];

            const report = `🌡️ *WEATHER: ${area.areaName[0].value.toUpperCase()}*\n${global.divider}\n` +
                `▸ *Status:* ${current.weatherDesc[0].value}\n` +
                `▸ *Temp:* ${current.temp_C}°C (Feels ${current.FeelsLikeC}°C)\n` +
                `▸ *Humidity:* ${current.humidity}%\n` +
                `▸ *Wind:* ${current.windspeedKmph} km/h\n` +
                `${global.divider}`;

            const graphUrl = `https://wttr.in/${encodeURIComponent(text)}_3p.png?m`;
            await conn.sendMessage(m.chat, { image: { url: graphUrl }, caption: report }, { quoted: m });
        });
    }
});

/**
 * TRANSLATE
 */
addCommand({
    pattern: 'trt',
    alias: ['translate', 'tr'],
    category: 'search',
    desc: 'Translate text to another language',
    handler: async (m, { conn, text, args }) => {
        let msgToTranslate = '';
        let targetLang = 'en';

        if (m.quoted) {
            msgToTranslate = m.quoted.text || m.quoted.caption || '';
            if (args[0]) targetLang = args[0].toLowerCase();
        } else if (args.length >= 2) {
            targetLang = args[0].toLowerCase();
            msgToTranslate = args.slice(1).join(' ');
        } else if (args.length === 1) {
            msgToTranslate = args.join(' ');
        } else {
            return m.reply(UI.syntax('.trt', '<lang> <text>', 'Translate text (e.g. .trt es hello)'));
        }

        await withReaction(conn, m, '🔠', async () => {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(msgToTranslate)}`;
            const { data } = await axios.get(url);

            const translatedText = data[0].map(segment => segment[0]).join('');
            const sourceLang = data[2];

            const response = `🌍 *Mantra Translate*\n${global.divider}\n` +
                `▸ *From:* [${sourceLang.toUpperCase()}]\n` +
                `▸ *To:* [${targetLang.toUpperCase()}]\n\n` +
                `${translatedText}\n` +
                `${global.divider}`;

            await m.reply(response);
        });
    }
});

/**
 * TEMP NUMBER
 */
addCommand({
    pattern: 'tempnumber',
    alias: ['sms', 'tempnum'],
    category: 'search',
    desc: 'Get temporary phone numbers for SMS verification',
    handler: async (m, { conn }) => {
        await withReaction(conn, m, '📱', async () => {
            const { data } = await axios.get('https://apiskeith.top/tempnumber');
            if (!data.status) throw new Error('API is currently unavailable.');

            let msg = `📱 *TEMP PHONENUMBERS*\n${global.divider}\n\n`;
            data.result.slice(0, 15).forEach((res, i) => {
                msg += `*${i + 1}. ${res.country}*\n▸ *Num:* ${res.number}\n▸ *Link:* ${res.link}\n\n`;
            });
            msg += `${global.divider}\n_Click the link to view received SMS_`;

            await m.reply(msg);
        });
    }
});
