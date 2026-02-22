const axios = require("axios");

module.exports = {
    name: "weather",
    react: "🌦️",
    category: "other",
    description: "Get weather information for a location",
    usage: ",weather <city>",
    aliases: ["forecast", "temp"],

    execute: async (_sock, m) => {
        try {
            const city = String(m.args?.join(" ") || "").trim();
            if (!city) {
                await m.reply(`Provide a city name.\nUsage: ${m.prefix}weather <city>`);
                return;
            }

            const apiKey = String(process.env.OPENWEATHER_API_KEY || "").trim();
            if (!apiKey) {
                await m.reply(
                    "Weather API key not configured.\n" +
                    "Ask the bot owner to set the *OPENWEATHER_API_KEY* environment variable."
                );
                return;
            }

            const botName = process.env.BOT_NAME || "MANTRA";
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
            const response = await axios.get(url, { timeout: 12000 });
            const d = response.data;

            const weatherIcon = {
                Clear: "☀️", Clouds: "☁️", Rain: "🌧️",
                Drizzle: "🌦️", Thunderstorm: "⛈️", Snow: "🌨️",
                Mist: "🌫️", Fog: "🌫️", Haze: "🌫️"
            };
            const icon = weatherIcon[d.weather?.[0]?.main] || "🌡️";

            const text = [
                `╭─ ${icon} *${d.name}, ${d.sys?.country}* ─`,
                `│`,
                `│  🌡 Temp: *${d.main.temp}°C* _(feels ${d.main.feels_like}°C)_`,
                `│  ⬇️ Min: ${d.main.temp_min}°C  ⬆️ Max: ${d.main.temp_max}°C`,
                `│  💧 Humidity: ${d.main.humidity}%`,
                `│  🌬 Wind: ${d.wind.speed} m/s`,
                `│  🔽 Pressure: ${d.main.pressure} hPa`,
                `│  ☁️ ${d.weather[0].main} — _${d.weather[0].description}_`,
                `│`,
                `╰──────────────`,
                ``,
                `> *${botName}*`
            ].join("\n");

            await m.reply(text);
        } catch (e) {
            console.error("weather error:", e?.response?.data || e?.message || e);
            if (e?.response?.status === 404) {
                await m.reply("City not found. Check the spelling and try again.");
                return;
            }
            await m.reply("Could not fetch weather info. Try again later.");
        }
    }
};
