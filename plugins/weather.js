import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import axios from 'axios';

addCommand({
    pattern: 'weather',
    alias: ['w', 'forecast'],
    category: 'tools',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(`${global.emojis.warning} *Usage:* ${global.prefix}weather <city>`);

        try {
            // 1. Initial Reaction
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // 2. Fetch Detailed JSON for the text report
            const { data } = await axios.get(`https://wttr.in/${encodeURIComponent(text)}?format=j1`);

            if (!data?.current_condition) {
                await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
                return m.reply(`${global.emojis.error} City not found.`);
            }

            const current = data.current_condition[0];
            const area = data.nearest_area[0];
            const desc = current.weatherDesc[0].value;

            // 3. Emoji Mapping Logic
            const emojiMap = {
                sun: '☀️', clear: '🌙', rain: '🌧️', cloud: '☁️',
                snow: '❄️', fog: '🌫️', storm: '⛈️', mist: '🌫️'
            };
            const weatherEmoji = Object.entries(emojiMap).find(([key]) =>
                desc.toLowerCase().includes(key))?.[1] || '🌥️';

            // 4. Construct Message
            const report = `✧ *Weather Report: ${area.areaName[0].value}* ✧\n` +
                `${global.divider}\n` +
                `${weatherEmoji} *Status:* ${desc}\n` +
                `🌡️ *Temp:* ${current.temp_C}°C (Feels ${current.FeelsLikeC}°C)\n` +
                `💧 *Humidity:* ${current.humidity}%\n` +
                `💨 *Wind:* ${current.windspeedKmph} km/h\n` +
                `${global.divider}`;

            // 5. Send Report with a Visual Graph (wttr.in generates PNGs too!)
            const graphUrl = `https://wttr.in/${encodeURIComponent(text)}_3p.png?m`;

            await conn.sendMessage(m.chat, {
                image: { url: graphUrl },
                caption: report
            }, { quoted: m });

            // 6. Save to Archived Messages (Self)
            const myJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';
            if (m.chat !== myJid) {
                await conn.sendMessage(myJid, { text: `📂 *Weather Archive*\n${report}` });
            }

            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            log.error('Weather command failed', e, { command: 'weather', location: text, user: m.sender });
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            const suggestion = e.code === 'ENOTFOUND'
                ? 'Check your internet connection\nVerify the city name spelling'
                : 'Try a different city name\nCheck your network status';
            m.reply(UI.error('Weather Fetch Failed', e.message || 'Connection failed', suggestion));
        }
    }
});