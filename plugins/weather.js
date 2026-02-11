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
                await m.reply(`Please provide a city name. Usage: ${m.prefix}weather <city name>`);
                return;
            }

            const apiKey = process.env.OPENWEATHER_API_KEY || "2d61a72574c11c4f36173b627f8cb177";
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;

            const response = await axios.get(url, { timeout: 12000 });
            const data = response.data;

            const weather = `
Weather Information for ${data.name}, ${data.sys.country}

Temperature: ${data.main.temp}°C
Feels Like: ${data.main.feels_like}°C
Min Temp: ${data.main.temp_min}°C
Max Temp: ${data.main.temp_max}°C
Humidity: ${data.main.humidity}%
Weather: ${data.weather[0].main}
Description: ${data.weather[0].description}
Wind Speed: ${data.wind.speed} m/s
Pressure: ${data.main.pressure} hPa

> *Mantra*
`;

            await m.reply(weather.trim());
        } catch (e) {
            console.error("weather error:", e?.response?.data || e?.message || e);
            if (e?.response?.status === 404) {
                await m.reply("City not found. Please check the spelling and try again.");
                return;
            }
            await m.reply("An error occurred while fetching weather information. Try again later.");
        }
    }
};
