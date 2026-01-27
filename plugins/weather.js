import axios from 'axios'

export default {
    cmd: ['weather', 'w', 'clima'],
    category: 'info',
    desc: 'Check weather with multiple fallbacks',
    run: async (conn, msg, { text }) => {
        const city = text?.trim()
        if (!city) return msg.reply('📍 Please provide a city name.\nExample: *.weather Nairobi*')

        // --- Attempt 1: Open-Meteo (No Key, High Accuracy) ---
        try {
            // We first geocode the city name to coordinates
            const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`
            const geoRes = await axios.get(geoUrl)
            
            if (!geoRes.data.results || geoRes.data.results.length === 0) throw new Error('City not found')
            
            const { latitude, longitude, name, country } = geoRes.data.results[0]
            const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&timezone=auto`
            const weatherRes = await axios.get(weatherUrl)
            
            const { temperature, windspeed, weathercode } = weatherRes.data.current_weather
            
            // Basic weather code mapper
            const conditions = { 0: 'Clear ☀️', 1: 'Mainly Clear 🌤', 2: 'Partly Cloudy ⛅', 3: 'Overcast ☁️', 45: 'Foggy 🌫', 51: 'Drizzle 🌧', 61: 'Rain 🌦', 71: 'Snow ❄️', 95: 'Thunderstorm ⛈' }
            const desc = conditions[weathercode] || 'Unknown'

            return await msg.reply(`🌍 *Weather: ${name}, ${country}*\n\n🌡️ *Temp:* ${temperature}°C\n☁️ *Status:* ${desc}\n🌬️ *Wind:* ${windspeed} km/h\n\n🛰️ _Source: Open-Meteo_`)

        } catch (err) {
            console.log('Primary API failed, trying fallback...')
        }

        // --- Attempt 2: wttr.in (Fallback / No Key) ---
        try {
            // Using format=3 for a clean one-liner string
            const fallbackUrl = `https://wttr.in/${encodeURIComponent(city)}?format=%l:+%C+%t+%w&m`
            const response = await axios.get(fallbackUrl)
            
            if (response.data && !response.data.includes("Unknown location")) {
                return await msg.reply(`🌍 *Weather Report*\n\n📍 ${response.data.trim()}\n\n🛰️ _Source: wttr.in_`)
            }
        } catch (err) {
            console.error('Fallback API also failed:', err.message)
        }

        await msg.reply('❌ Could not fetch weather for that location. Please try again later.')
    }
}
