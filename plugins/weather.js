import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import { apiCall } from '../src/utils/apiHelper.js';
import { validateText } from '../src/utils/validator.js';
import { withTimeout } from '../src/utils/timeout.js';
import { cache } from '../lib/redis.js';

// Assuming apiKey is defined globally or imported from a config file
// For the purpose of this edit, we'll assume it's accessible.
const apiKey = process.env.OPENWEATHER_API_KEY || 'YOUR_OPENWEATHER_API_KEY'; // Placeholder

addCommand({
    pattern: 'weather',
    alias: ['w', 'forecast'],
    category: 'tools',
    handler: async (m, { conn, text }) => {
        try {
            // Input validation
            const city = validateText(text, true); // Short text validation

            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // Check cache first (15 minute TTL)
            const cacheKey = `weather:${city.toLowerCase()}`;
            let weatherData = await cache.get(cacheKey);

            if (!weatherData) {
                // Fetch with retry and timeout
                weatherData = await withTimeout(
                    apiCall(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`, { timeout: 10000 }, 3),
                    15000,
                    'Weather fetch'
                );

                // Cache for 15 minutes
                await cache.set(cacheKey, weatherData, 900);
                log.perf('weather-api-call', { city });
            } else {
                log.perf('weather-cache-hit', { city });
            }

            // The original code checked for `data?.current_condition`.
            // The new API (openweathermap.org) returns `weatherData.cod` for errors or `weatherData.main` for data.
            // Adjusting the check based on OpenWeatherMap's typical error response (e.g., 404 for city not found).
            if (weatherData.cod && weatherData.cod !== 200) { // OpenWeatherMap returns cod: 404 for not found
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