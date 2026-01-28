import { addCommand } from '../lib/plugins.js';
import axios from 'axios';

addCommand({
    pattern: 'weather',
    alias: ['w', 'forecast'],
    desc: 'Check weather for a city',
    handler: async (m, { conn, text }) => {
        if (!text) {
            return m.reply(`${global.emojis.warning} *Usage:* ${global.prefix}weather <city>\nExample: ${global.prefix}weather Nairobi`);
        }

        try {
            await m.reply(global.emojis.waiting);

            // Fetching from wttr.in (No API Key needed)
            const response = await axios.get(`https://wttr.in/${encodeURIComponent(text)}?format=j1`);
            const data = response.data;

            if (!data || !data.current_condition) {
                return m.reply(`${global.emojis.error} City not found.`);
            }

            const current = data.current_condition[0];
            const nearest = data.nearest_area[0];

            // Determine Emoji based on description
            const desc = current.weatherDesc[0].value.toLowerCase();
            let weatherEmoji = '🌥️';
            if (desc.includes('sun') || desc.includes('clear')) weatherEmoji = '☀️';
            else if (desc.includes('rain')) weatherEmoji = '🌧️';
            else if (desc.includes('snow')) weatherEmoji = '❄️';
            else if (desc.includes('cloud')) weatherEmoji = '☁️';
            else if (desc.includes('fog') || desc.includes('mist')) weatherEmoji = '🌫️';

            // Construct Message
            let txt = `✧ *Weather Report: ${nearest.areaName[0].value}* ✧\n${global.divider}\n`;
            txt += `✦ *Temp:* ${current.temp_C}°C (Feels ${current.FeelsLikeC}°C)\n`;
            txt += `✦ *Humidity:* ${current.humidity}%\n`;
            txt += `✦ *Wind:* ${current.windspeedKmph} km/h\n`;
            txt += `✦ *Horizon:* ${current.weatherDesc[0].value}\n`;
            txt += `${global.divider}`;

            await conn.sendMessage(m.chat, { text: txt }, { quoted: m });

        } catch (e) {
            console.error(e);
            m.reply(`${global.emojis.error} Could not fetch weather. Make sure the city name is correct.`);
        }
    }
});