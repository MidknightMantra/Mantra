import { addCommand } from '../lib/plugins.js';
import axios from 'axios';
import fs from 'fs/promises';
import { generateWAMessageContent, generateWAMessageFromContent } from 'gifted-baileys';
import pkgButtons from 'gifted-btns';
const { sendButtons } = pkgButtons;
import { log } from '../src/utils/logger.js';
import acrcloud from 'acrcloud';
import { createSticker, StickerTypes } from '../src/utils/sticker.js';
import '../config.js'; // Ensure global configs are loaded

// Re-map createSticker to gmdSticker for consistency with user snippet logic if needed, 
// or just use createSticker directly.
const gmdSticker = createSticker;

addCommand({
    pattern: 'yts',
    alias: ['yt-search'],
    category: 'search',
    react: '🔍',
    desc: 'Perform YouTube search',
    handler: async (m, { text, conn }) => {
        if (!text) return m.reply("❌ Please provide a search query");

        try {
            const apiUrl = `https://yts.giftedtech.co.ke/?q=${encodeURIComponent(text)}`;
            const res = await axios.get(apiUrl, { timeout: 100000 });
            const results = res.data?.videos;

            if (!Array.isArray(results) || results.length === 0) return m.reply("❌ No videos found.");

            const videos = results.slice(0, 5);
            const cards = await Promise.all(videos.map(async (vid) => ({
                header: {
                    title: `🎬 *${vid.name}*`,
                    hasMediaAttachment: true,
                    imageMessage: (await generateWAMessageContent({ image: { url: vid.thumbnail } }, { upload: conn.waUploadToServer })).imageMessage
                },
                body: {
                    text: `📺 Duration: ${vid.duration}\n👁️ Views: ${vid.views}${vid.published ? `\n📅 Published: ${vid.published}` : ""}`
                },
                footer: { text: `> *${global.botName}*` },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({ display_text: "Copy Link", copy_code: vid.url })
                        },
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({ display_text: "Watch on YouTube", url: vid.url })
                        }
                    ]
                }
            })));

            const message = generateWAMessageFromContent(m.chat, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                        interactiveMessage: {
                            body: { text: `🔍 YouTube Results for: *${text}*` },
                            footer: { text: `📂 Displaying first *${videos.length}* videos` },
                            carouselMessage: { cards }
                        }
                    }
                }
            }, { quoted: m });

            await conn.relayMessage(m.chat, message.message, { messageId: message.key.id });

        } catch (error) {
            log.error("Error/yts:", error);
            m.reply("❌ Oops! Something went wrong.");
        }
    }
});

addCommand({
    pattern: 'shazam',
    alias: ['whatmusic', 'whatsong', 'identify', 'accr'],
    category: 'search',
    react: '🙄',
    desc: 'Identify music from audio/video',
    handler: async (m, { conn, isQuoted, quoted }) => {
        if (!isQuoted) return m.reply("❌ Please reply to an audio or video message.");

        const quotedAudio = quoted.msg?.audioMessage || (quoted.type === 'audioMessage' ? quoted.msg : null);
        const quotedVideo = quoted.msg?.videoMessage || (quoted.type === 'videoMessage' ? quoted.msg : null);

        // Handling for raw quoted objects if helper didn't normalize completely
        const targetMsg = quoted.msg || quoted; // Fallback

        if (!quotedAudio && !quotedVideo && !targetMsg.mimetype?.includes('audio') && !targetMsg.mimetype?.includes('video')) {
            return m.reply("❌ The quoted message doesn't contain any audio or video");
        }

        let tempFilePath;
        try {
            const acr = new acrcloud({
                host: "identify-us-west-2.acrcloud.com",
                access_key: "4ee38e62e85515a47158aeb3d26fb741",
                access_secret: "KZd3cUQoOYSmZQn1n5ACW5XSbqGlKLhg6G8S8EvJ",
            });

            // Re-using download logic. Ideally import downloadMedia from mediaHelper
            const buffer = await quoted.download();
            if (!buffer) return m.reply("❌ Failed to download media.");

            const MAX_SIZE = 1 * 1024 * 1024; // 1MB for ACRCloud
            const searchBuffer = buffer.length > MAX_SIZE ? buffer.slice(0, MAX_SIZE) : buffer;

            const { status, metadata } = await acr.identify(searchBuffer);

            if (status.code !== 0) return m.reply(`❌ Music identification failed: ${status.msg}`);
            if (!metadata?.music?.[0]) return m.reply("❌ No music information found.");

            const { title, artists, album, genres, label, release_date } = metadata.music[0];

            let txt = `*${global.botName} 𝐒𝐇𝐀𝐙𝐀𝐌*\n\n`;
            txt += `*Title:* ${title || "Unknown"}\n`;
            if (artists?.length) txt += `*Artists:* ${artists.map((v) => v.name).join(", ")}\n`;
            if (album?.name) txt += `*Album:* ${album.name}\n`;
            if (genres?.length) txt += `*Genres:* ${genres.map((v) => v.name).join(", ")}\n`;
            if (label) txt += `*Label:* ${label}\n`;
            if (release_date) txt += `*Release Date:* ${release_date}\n`;
            txt += `\n> *${global.botName}*`;

            const imgUrl = global.botPic || global.config?.botPic;
            // If botPic is not URL, we might need a default or skip image.

            await conn.sendMessage(m.chat, {
                text: txt,
                // contextInfo etc omitted for simplicity unless botPic is guaranteed URL
            }, { quoted: m });

        } catch (e) {
            log.error("Error/shazam:", e);
            m.reply(`❌ Error: ${e.message}`);
        }
    }
});

addCommand({
    pattern: 'google',
    alias: ['ggle', 'gglesearch', 'googlesearch'],
    category: 'search',
    react: '🔍',
    desc: 'Search Google (text)',
    handler: async (m, { text, conn }) => {
        if (!text) return m.reply("❌ Please provide a search query");

        try {
            const apiUrl = `${global.giftedApiUrl}/api/search/google?apikey=${global.giftedApiKey}&query=${encodeURIComponent(text)}`;
            const res = await axios.get(apiUrl, { timeout: 60000 });

            if (!res.data?.success || !res.data?.results || !Array.isArray(res.data.results) || res.data.results.length === 0) {
                return m.reply("❌ No results found.");
            }

            const results = res.data.results.slice(0, 5);
            const defaultImg = "https://files.giftedtech.co.ke/image/ZAwgoogle-images-1548419288.jpg";

            const cards = await Promise.all(results.map(async (result) => ({
                header: {
                    title: `🔍 *${result.title}*`,
                    hasMediaAttachment: true,
                    imageMessage: (await generateWAMessageContent({ image: { url: defaultImg } }, { upload: conn.waUploadToServer })).imageMessage
                },
                body: { text: `📝 ${result.description || "No description"}` },
                footer: { text: `> *${global.botName}*` },
                nativeFlowMessage: {
                    buttons: [
                        {
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({ display_text: "Copy Link", copy_code: result.link })
                        },
                        {
                            name: "cta_url",
                            buttonParamsJson: JSON.stringify({ display_text: "Open Link", url: result.link })
                        }
                    ]
                }
            })));

            const message = generateWAMessageFromContent(m.chat, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                        interactiveMessage: {
                            body: { text: `🔍 Google Results for: *${text}*` },
                            footer: { text: `📂 Displaying first *${results.length}* results` },
                            carouselMessage: { cards }
                        }
                    }
                }
            }, { quoted: m });

            await conn.relayMessage(m.chat, message.message, { messageId: message.key.id });

        } catch (error) {
            log.error("Error/google:", error);
            m.reply("❌ Failed to perform Google search.");
        }
    }
});

addCommand({
    pattern: 'lyrics',
    alias: ['songlyrics', 'getlyrics'],
    category: 'search',
    react: '🎵',
    desc: 'Get song lyrics',
    handler: async (m, { text, conn }) => {
        if (!text) return m.reply("❌ Please provide a song name");

        try {
            const apiUrl = `${global.giftedApiUrl}/api/search/lyricsv2?apikey=${global.giftedApiKey}&query=${encodeURIComponent(text)}`;
            const res = await axios.get(apiUrl, { timeout: 60000 });

            if (!res.data?.success || !res.data?.result) {
                return m.reply("❌ No lyrics found.");
            }

            const { artist, title, lyrics } = res.data.result;

            let txt = `*${global.botName} 𝐋𝐘𝐑𝐈𝐂𝐒*\n\n`;
            txt += `🎤 *Artist:* ${artist || "Unknown"}\n`;
            txt += `🎵 *Title:* ${title || "Unknown"}\n\n`;
            txt += `${lyrics}\n\n`;

            await sendButtons(conn, m.chat, {
                text: txt,
                footer: global.botName,
                buttons: [
                    {
                        name: "cta_copy",
                        buttonParamsJson: JSON.stringify({ display_text: "📋 Copy Lyrics", copy_code: lyrics })
                    }
                ]
            });

        } catch (error) {
            log.error("Error/lyrics:", error);
            m.reply("❌ Failed to get lyrics.");
        }
    }
});

addCommand({
    pattern: 'happymod',
    alias: ['modapks', 'apkmod'],
    category: 'search',
    react: '📱',
    desc: 'Search HappyMod for modded APKs',
    handler: async (m, { text, conn }) => {
        if (!text) return m.reply("❌ Please provide an app name");

        try {
            const apiUrl = `${global.giftedApiUrl}/api/search/happymod?apikey=${global.giftedApiKey}&query=${encodeURIComponent(text)}`;
            const res = await axios.get(apiUrl, { timeout: 60000 });

            if (!res.data?.success || !res.data?.results?.data) {
                return m.reply("❌ No results found.");
            }

            const results = res.data.results.data.slice(0, 5);
            const cards = await Promise.all(results.map(async (app) => ({
                header: {
                    title: `📱 *${app.name}*`,
                    hasMediaAttachment: true,
                    imageMessage: (await generateWAMessageContent({ image: { url: app.icon } }, { upload: conn.waUploadToServer })).imageMessage
                },
                body: { text: `📝 ${app.summary || "No description"}\n📦 Source: ${app.source || "Unknown"}` },
                footer: { text: `> *${global.botName}*` },
                nativeFlowMessage: {
                    buttons: [{
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({ display_text: "Download", url: app.url })
                    }]
                }
            })));

            const message = generateWAMessageFromContent(m.chat, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                        interactiveMessage: {
                            body: { text: `📱 HappyMod Results for: *${text}*` },
                            footer: { text: `📂 Displaying first *${results.length}* apps` },
                            carouselMessage: { cards }
                        }
                    }
                }
            }, { quoted: m });

            await conn.relayMessage(m.chat, message.message, { messageId: message.key.id });

        } catch (error) {
            log.error("Error/happymod:", error);
            m.reply("❌ Failed to search HappyMod.");
        }
    }
});

addCommand({
    pattern: 'apkmirror',
    alias: ['apkmirrorsearch'],
    category: 'search',
    react: '📦',
    desc: 'Search APK Mirror',
    handler: async (m, { text, conn }) => {
        if (!text) return m.reply("❌ Please provide an app name");

        try {
            const apiUrl = `${global.giftedApiUrl}/api/search/apkmirror?apikey=${global.giftedApiKey}&query=${encodeURIComponent(text)}`;
            const res = await axios.get(apiUrl, { timeout: 60000 });

            if (!res.data?.success || !res.data?.results?.data) {
                return m.reply("❌ No results found.");
            }

            const results = res.data.results.data.slice(0, 5);
            const cards = await Promise.all(results.map(async (app) => ({
                header: {
                    title: `📦 *${app.name}*`,
                    hasMediaAttachment: true,
                    imageMessage: (await generateWAMessageContent({ image: { url: app.icon } }, { upload: conn.waUploadToServer })).imageMessage
                },
                body: { text: `📦 Source: ${app.source || "APK Mirror"}` },
                footer: { text: `> *${global.botName}*` },
                nativeFlowMessage: {
                    buttons: [{
                        name: "cta_url",
                        buttonParamsJson: JSON.stringify({ display_text: "Download", url: app.url })
                    }]
                }
            })));

            const message = generateWAMessageFromContent(m.chat, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                        interactiveMessage: {
                            body: { text: `📦 APK Mirror Results for: *${text}*` },
                            footer: { text: `📂 Displaying first *${results.length}* apps` },
                            carouselMessage: { cards }
                        }
                    }
                }
            }, { quoted: m });

            await conn.relayMessage(m.chat, message.message, { messageId: message.key.id });

        } catch (error) {
            log.error("Error/apkmirror:", error);
            m.reply("❌ Failed to search APK Mirror.");
        }
    }
});

addCommand({
    pattern: 'stickersearch',
    alias: ['searchsticker', 'findsticker'],
    category: 'search',
    react: '🎨',
    desc: 'Search and send stickers',
    handler: async (m, { text, conn }) => {
        if (!text) return m.reply("❌ Please provide a search query");

        try {
            const apiUrl = `${global.giftedApiUrl}/api/search/stickersearch?apikey=${global.giftedApiKey}&query=${encodeURIComponent(text)}`;
            const res = await axios.get(apiUrl, { timeout: 60000 });

            if (!res.data?.success || !res.data?.results || res.data.results.length === 0) {
                return m.reply("❌ No stickers found.");
            }

            const stickers = res.data.results.slice(0, 5); // Limit to 5
            await m.reply(`Found ${stickers.length} stickers for: *${text}*\nSending...`);

            for (const stickerUrl of stickers) {
                try {
                    const response = await axios.get(stickerUrl, { responseType: 'arraybuffer', timeout: 30000 });
                    const stickerBuffer = Buffer.from(response.data);

                    const processedSticker = await gmdSticker(stickerBuffer, {
                        pack: global.packname || "Mantra-MD",
                        author: global.author || "MidknightMantra",
                        type: StickerTypes.FULL,
                        categories: ["🤩", "🎉"],
                        quality: 75,
                    });

                    await conn.sendMessage(m.chat, { sticker: processedSticker }, { quoted: m });
                    await new Promise((resolve) => setTimeout(resolve, 500));
                } catch (stickerErr) {
                    log.error("Error sending sticker:", stickerErr);
                }
            }
        } catch (error) {
            log.error("Error/stickersearch:", error);
            m.reply("❌ Failed to search stickers.");
        }
    }
});
