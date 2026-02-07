import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import { apiCall } from '../src/utils/apiHelper.js';
import { validateText } from '../src/utils/validator.js';
import { withTimeout } from '../src/utils/timeout.js';

addCommand({
    pattern: 'weather',
    alias: ['w', 'forecast'],
    category: 'tools',
    handler: async (m, { conn, text }) => {
        try {
            // Input validation
            const city = validateText(text, true); // Short text validation

            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // API call with retry and timeout
            const data = await withTimeout(
                apiCall(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, { timeout: 10000 }, 3),
                15000,
                'Weather fetch'
            );

            if (!data?.current_condition) {
                await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
                return m.reply(UI.error('Not Found', `City "${city}" not found`, 'Check spelling\\nTry nearby city\\nUse full city name'));
            }

            const current = data.current_condition[0];
            const area = data.nearest_area[0];
            const desc = current.weatherDesc[0].value;

            // Emoji mapping
            const emojiMap = {
                sun: '☀️', clear: '🌙', rain: '🌧️', cloud: '☁️',
                snow: '❄️', fog: '🌫️', storm: '⛈️', mist: '🌫️'
            };
            const weatherEmoji = Object.entries(emojiMap).find(([key]) =>
                desc.toLowerCase().includes(key))?.[1] || '🌥️';

            // Construct message
            const report = `✧ *Weather Report: ${area.areaName[0].value}* ✧\n` +
                `${global.divider}\n` +
                `${weatherEmoji} *Status:* ${desc}\n` +
                `🌡️ *Temp:* ${current.temp_C}°C (Feels ${current.FeelsLikeC}°C)\n` +
                `💧 *Humidity:* ${current.humidity}%\n` +
                `💨 *Wind:* ${current.windspeedKmph} km/h\n` +
                `${global.divider}`;

            // Send with visual graph
            const graphUrl = `https://wttr.in/${encodeURIComponent(city)}_3p.png?m`;

            await conn.sendMessage(m.chat, {
                image: { url: graphUrl },
                caption: report
            }, { quoted: m });

            await conn.sendMessage(m.chat, { react: { text: weatherEmoji, key: m.key } });

        } catch (error) {
            log.error('Weather fetch failed', error, { city: text, command: 'weather' });

            if (error.message.includes('validation')) {
                return m.reply(UI.error('Invalid Input', error.message, 'Provide a city name\\nExample: .weather London'));
            }

            throw error; // Let global handler manage other errors
        }
    }
});