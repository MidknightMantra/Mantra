import { addCommand } from '../lib/plugins.js';
import axios from 'axios';
import { generateWAMessageContent, generateWAMessageFromContent } from 'gifted-baileys';
import { sendButtons } from 'gifted-btns';
import { log } from '../src/utils/logger.js';

addCommand({
    pattern: 'ggleimage',
    alias: ['googleimage', 'gimage', 'ggleimagesearch', 'googleimagesearch'],
    category: 'search',
    react: '🖼️',
    desc: 'Search Google Images and send first 10 images',
    handler: async (m, { text, conn }) => {
        if (!text) return m.reply("❌ Please provide a search query for images");

        try {
            const apiUrl = `${global.giftedApiUrl}/api/search/googleimage?apikey=${global.giftedApiKey}&query=${encodeURIComponent(text)}`;
            const res = await axios.get(apiUrl, { timeout: 60000 });

            if (!res.data?.success || !res.data?.results || res.data.results.length === 0) {
                return m.reply("❌ No images found. Please try a different query.");
            }

            const images = res.data.results.slice(0, 5); // Limit to 5 to avoid spam
            await m.reply(`Found ${images.length} images for: *${text}*\nSending...`);

            for (let i = 0; i < images.length; i++) {
                try {
                    await conn.sendMessage(
                        m.chat,
                        {
                            image: { url: images[i] },
                            caption: `🖼️ Image ${i + 1}/${images.length}\n\n> *${global.botName}*`,
                        },
                        { quoted: m }
                    );
                    await new Promise((resolve) => setTimeout(resolve, 500));
                } catch (imgErr) {
                    log.error("Error sending image:", imgErr);
                }
            }
        } catch (error) {
            log.error("Google image search error:", error);
            m.reply("❌ Failed to search images. Please try again.");
        }
    }
});

addCommand({
    pattern: 'unsplash',
    alias: ['unsplashphotos', 'unsplashsearch'],
    category: 'search',
    react: '📷',
    desc: 'Search Unsplash and send first 10 photos',
    handler: async (m, { text, conn }) => {
        if (!text) return m.reply("❌ Please provide a search query for photos");

        try {
            const apiUrl = `${global.giftedApiUrl}/api/search/unsplash?apikey=${global.giftedApiKey}&query=${encodeURIComponent(text)}`;
            const res = await axios.get(apiUrl, { timeout: 60000 });

            if (!res.data?.success || !res.data?.results || res.data.results.length === 0) {
                return m.reply("❌ No photos found. Please try a different query.");
            }

            const photos = res.data.results.slice(0, 5); // Limit to 5

            await m.reply(`Found ${photos.length} Unsplash photos for: *${text}*\nSending...`);

            for (let i = 0; i < photos.length; i++) {
                try {
                    await conn.sendMessage(
                        m.chat,
                        {
                            image: { url: photos[i] },
                            caption: `📷 Unsplash Photo ${i + 1}/${photos.length}\n\n> *${global.botName}*`,
                        },
                        { quoted: m }
                    );
                    await new Promise((resolve) => setTimeout(resolve, 500));
                } catch (imgErr) {
                    log.error("Error sending Unsplash photo:", imgErr);
                }
            }
        } catch (error) {
            log.error("Unsplash search error:", error);
            m.reply("❌ Failed to search Unsplash. Please try again.");
        }
    }
});

addCommand({
    pattern: 'wallpapers',
    alias: ['wallpaper', 'hdwallpaper', 'hdwallpapers', 'getwallpapers', 'randomwallpapers'],
    category: 'search',
    react: '🖼️',
    desc: 'Search HD wallpapers',
    handler: async (m, { text, conn }) => {
        if (!text) return m.reply("❌ Please provide a wallpaper category or search query");

        try {
            const apiUrl = `${global.giftedApiUrl}/api/search/wallpaper?apikey=${global.giftedApiKey}&query=${encodeURIComponent(text)}`;
            const res = await axios.get(apiUrl, { timeout: 60000 });

            if (!res.data?.success || !res.data?.results || res.data.results.length === 0) {
                return m.reply("❌ No wallpapers found. Please try a different query.");
            }

            const wallpapers = res.data.results.slice(0, 5); // Limit to 5

            await m.reply(`Found ${wallpapers.length} wallpapers for: *${text}*\nSending...`);

            for (let i = 0; i < wallpapers.length; i++) {
                try {
                    const wp = wallpapers[i];
                    const imageUrl = Array.isArray(wp.image) ? wp.image[0] : wp.image;

                    await conn.sendMessage(
                        m.chat,
                        {
                            image: { url: imageUrl },
                            caption: `🖼️ *Wallpaper ${i + 1}/${wallpapers.length}*\n📂 Category: ${wp.type || "Unknown"}\n\n> *${global.botName}*`,
                        },
                        { quoted: m }
                    );
                    await new Promise((resolve) => setTimeout(resolve, 500));
                } catch (wpErr) {
                    log.error("Error sending wallpaper:", wpErr);
                }
            }
        } catch (error) {
            log.error("Wallpaper search error:", error);
            m.reply("❌ Failed to search wallpapers. Please try again.");
        }
    }
});

addCommand({
    pattern: 'weather',
    alias: ['getweather', 'clima'],
    category: 'search',
    react: '🌤️',
    desc: 'Get weather information for a location',
    handler: async (m, { text, conn }) => {
        if (!text) return m.reply("❌ Please provide a location name");

        try {
            const apiUrl = `${global.giftedApiUrl}/api/search/weather?apikey=${global.giftedApiKey}&location=${encodeURIComponent(text)}`;
            const res = await axios.get(apiUrl, { timeout: 60000 });

            if (!res.data?.success || !res.data?.result) {
                return m.reply("❌ Could not get weather for that location. Please try a different location.");
            }

            const w = res.data.result;
            const weatherIcons = {
                Clear: "☀️",
                Clouds: "☁️",
                Rain: "🌧️",
                Drizzle: "🌦️",
                Thunderstorm: "⛈️",
                Snow: "❄️",
                Mist: "🌫️",
                Fog: "🌫️",
                Haze: "🌫️",
            };

            const icon = weatherIcons[w.weather?.main] || "🌡️";

            let txt = `*${global.botName} 𝐖𝐄𝐀𝐓𝐇𝐄𝐑*\n\n`;
            txt += `${icon} *Location:* ${w.location}, ${w.sys?.country || ""}\n\n`;
            txt += `🌡️ *Temperature:* ${w.main?.temp}°C\n`;
            txt += `🤒 *Feels Like:* ${w.main?.feels_like}°C\n`;
            txt += `📉 *Min Temp:* ${w.main?.temp_min}°C\n`;
            txt += `📈 *Max Temp:* ${w.main?.temp_max}°C\n\n`;
            txt += `☁️ *Weather:* ${w.weather?.main} (${w.weather?.description})\n`;
            txt += `💧 *Humidity:* ${w.main?.humidity}%\n`;
            txt += `🌬️ *Wind Speed:* ${w.wind?.speed} m/s\n`;
            txt += `👁️ *Visibility:* ${w.visibility / 1000} km\n`;
            txt += `🔘 *Pressure:* ${w.main?.pressure} hPa\n\n`;
            txt += `> *${global.botName}*`;

            m.reply(txt);
        } catch (error) {
            log.error("Weather search error:", error);
            m.reply("❌ Failed to get weather data. Please try again.");
        }
    }
});

addCommand({
    pattern: 'npm',
    alias: ['npmsearch', 'npmpack', 'npmpackage'],
    category: 'search',
    react: '📦',
    desc: 'Search NPM packages',
    handler: async (m, { text, conn }) => {
        if (!text) return m.reply("❌ Please provide a package name");

        try {
            const apiUrl = `${global.giftedApiUrl}/api/search/npmsearch?apikey=${global.giftedApiKey}&packagename=${encodeURIComponent(text)}`;
            const res = await axios.get(apiUrl, { timeout: 60000 });

            if (!res.data?.success || !res.data?.result) {
                return m.reply("❌ Package not found. Please check the package name.");
            }

            const pkg = res.data.result;

            let txt = `*${global.botName} 𝐍𝐏𝐌 𝐏𝐀𝐂𝐊𝐀𝐆𝐄*\n\n`;
            txt += `📦 *Name:* ${pkg.name}\n`;
            txt += `📝 *Description:* ${pkg.description || "No description"}\n`;
            txt += `🏷️ *Version:* ${pkg.version}\n`;
            txt += `📜 *License:* ${pkg.license || "N/A"}\n`;
            txt += `👤 *Owner:* ${pkg.owner || "N/A"}\n`;
            txt += `📅 *Published:* ${pkg.publishedDate || "N/A"}\n`;
            txt += `📅 *Created:* ${pkg.createdDate || "N/A"}\n`;
            txt += `🔗 *Package:* ${pkg.packageLink}\n`;
            if (pkg.homepage) txt += `🏠 *Homepage:* ${pkg.homepage}\n`;
            txt += `\n> *${global.botName}*`;

            m.reply(txt);
            // Note: Download button logic omitted for simplicity/stability as it relies on specific event listeners that might conflict. 
            // Can be re-added later if robust button handling is confirmed.
        } catch (error) {
            log.error("NPM search error:", error);
            m.reply("❌ Failed to search NPM. Please try again.");
        }
    }
});

addCommand({
    pattern: 'wattpad',
    alias: ['watt', 'wattsearch', 'wattpadsearch'],
    category: 'search',
    react: '📚',
    desc: 'Search Wattpad stories',
    handler: async (m, { text, conn }) => {
        if (!text) return m.reply("❌ Please provide a search query");

        try {
            const apiUrl = `${global.giftedApiUrl}/api/search/wattpad?apikey=${global.giftedApiKey}&query=${encodeURIComponent(text)}`;
            const res = await axios.get(apiUrl, { timeout: 60000 });

            if (!res.data?.success || !res.data?.results || res.data.results.length === 0) {
                return m.reply("❌ No stories found. Please try a different query.");
            }

            const stories = res.data.results.slice(0, 5);

            const cards = await Promise.all(stories.map(async (story) => ({
                header: {
                    title: `📚 *${story.tittle}*`,
                    hasMediaAttachment: true,
                    imageMessage: (await generateWAMessageContent({ image: { url: story.thumbnail } }, { upload: conn.waUploadToServer })).imageMessage
                },
                body: { text: `👁️ Reads: ${story.reads}\n❤️ Likes: ${story.likes}` },
                footer: { text: `> *${global.botName}*` },
                nativeFlowMessage: {
                    buttons: [{
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({ display_text: "Read Story", url: story.link })
                    }]
                }
            })));

            const message = generateWAMessageFromContent(m.chat, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                        interactiveMessage: {
                            body: { text: `📚 Wattpad Results for: *${text}*` },
                            footer: { text: `📂 Displaying first *${stories.length}* stories` },
                            carouselMessage: { cards }
                        }
                    }
                }
            }, { quoted: m });

            await conn.relayMessage(m.chat, message.message, { messageId: message.key.id });

        } catch (error) {
            log.error("Wattpad search error:", error);
            m.reply("❌ Failed to search Wattpad. Please try again.");
        }
    }
});

addCommand({
    pattern: 'spotifysearch',
    alias: ['spotisearch'],
    category: 'search',
    react: '🎵',
    desc: 'Search Spotify for tracks',
    handler: async (m, { text, conn }) => {
        if (!text) return m.reply("❌ Please provide a song or artist name to search");

        try {
            const apiUrl = `${global.giftedApiUrl}/api/search/spotifysearch?apikey=${global.giftedApiKey}&query=${encodeURIComponent(text)}`;
            const res = await axios.get(apiUrl, { timeout: 60000 });

            if (!res.data?.success || !res.data?.results || !Array.isArray(res.data.results) || res.data.results.length === 0) {
                return m.reply(res.data?.results?.msg || "❌ No tracks found. Please try a different query.");
            }

            const tracks = res.data.results.slice(0, 5);
            let txt = `*${global.botName} 𝐒𝐏𝐎𝐓𝐈𝐅𝐘 𝐒𝐄𝐀𝐑𝐂𝐇*\n\n`;
            txt += `🔍 *Query:* ${text}\n\n`;

            tracks.forEach((track, i) => {
                txt += `*${i + 1}. ${track.title}*\n`;
                txt += `🎤 Artist: ${track.artist}\n`;
                txt += `⏱️ Duration: ${track.duration}\n\n`;
            });

            // Note: Sending buttons here requires the buttons logic.
            // Simplified to text list + command suggestion for this iteration to ensure stability unless buttons.js is robust.
            // But we will try to use sendButtons from gifted-btns as imported.

            const buttons = tracks.map((track, i) => ({
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                    display_text: `${i + 1}. Download`,
                    id: `${global.prefix || ","}spotify ${track.url}`
                })
            }));

            await sendButtons(conn, m.chat, {
                text: txt,
                footer: global.botName,
                buttons: buttons
            });

        } catch (error) {
            log.error("Spotify search error:", error);
            m.reply("❌ Failed to search Spotify. Please try again.");
        }
    }
});
