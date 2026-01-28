import { addCommand } from '../lib/plugins.js';
import { smsg } from '../lib/utils.js';
import ytdl from 'ytdl-core'; // Standard YT library
import axios from 'axios';
import fs from 'fs';

// Helper to validate URLs
const isUrl = (url) => {
    return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi'));
};

// 1. YOUTUBE SONG (Audio)
addCommand({
    pattern: 'song',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(`*${global.emojis.error} Usage:* ${global.prefix}song <url>`);

        try {
            if (!ytdl.validateURL(text)) return m.reply(`${global.emojis.error} Invalid YouTube URL.`);

            await m.reply(`${global.emojis.waiting} *Mantra is downloading song...*`);

            let info = await ytdl.getInfo(text);
            let title = info.videoDetails.title;
            let stream = ytdl(text, { filter: 'audioonly', quality: 'highestaudio' });

            // Send Audio
            await conn.sendMessage(m.chat, {
                audio: { stream: stream },
                mimetype: 'audio/mpeg',
                fileName: `${title}.mp3`,
                contextInfo: {
                    externalAdReply: {
                        title: title,
                        body: global.botName,
                        thumbnailUrl: info.videoDetails.thumbnails[0].url,
                        sourceUrl: text,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m });

        } catch (e) {
            console.error(e);
            m.reply(`${global.emojis.error} Failed to download song.`);
        }
    }
});

// 2. YOUTUBE VIDEO
addCommand({
    pattern: 'video',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(`*${global.emojis.error} Usage:* ${global.prefix}video <url>`);

        try {
            if (!ytdl.validateURL(text)) return m.reply(`${global.emojis.error} Invalid YouTube URL.`);

            await m.reply(`${global.emojis.waiting} *Mantra is downloading video...*`);

            let info = await ytdl.getInfo(text);
            let title = info.videoDetails.title;
            let stream = ytdl(text, { filter: 'audioandvideo', quality: 'highest' });

            await conn.sendMessage(m.chat, {
                video: { stream: stream },
                caption: `${global.emojis.video} *${title}*`,
                mimetype: 'video/mp4'
            }, { quoted: m });

        } catch (e) {
            console.error(e);
            m.reply(`${global.emojis.error} Failed to download video.`);
        }
    }
});

// 3. TIKTOK (No Watermark)
addCommand({
    pattern: 'tiktok',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(`*${global.emojis.error} Usage:* ${global.prefix}tiktok <url>`);

        try {
            await m.reply(`${global.emojis.waiting} *Fetching TikTok...*`);

            // Using a free public API for TikTok (lovetik/tikwm alternative)
            // Note: Public APIs change often. If this breaks, update the API URL.
            const { data } = await axios.get(`https://www.tikwm.com/api/?url=${text}`);

            if (data.data && data.data.play) {
                await conn.sendMessage(m.chat, {
                    video: { url: data.data.play },
                    caption: `${global.emojis.success} *Mantra TikTok Downloader*`
                }, { quoted: m });
            } else {
                throw new Error("No video found");
            }
        } catch (e) {
            console.error(e);
            m.reply(`${global.emojis.error} Error fetching TikTok. URL might be invalid.`);
        }
    }
});

// 4. INSTAGRAM (Reels/Post)
addCommand({
    pattern: 'insta',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(`*${global.emojis.error} Usage:* ${global.prefix}insta <url>`);

        try {
            await m.reply(`${global.emojis.waiting} *Fetching Instagram...*`);

            // Using a robust public API (SnapInsta scraper or similar)
            // This is an example endpoint. For production, consider using a dedicated Scraper library.
            const apiUrl = `https://api.guruapi.tech/insta/v1/igdl?url=${text}`;
            const { data } = await axios.get(apiUrl);

            if (data.media && data.media.length > 0) {
                for (let media of data.media) {
                    if (media.url) {
                        await conn.sendMessage(m.chat, {
                            [media.type === 'video' ? 'video' : 'image']: { url: media.url },
                            caption: `${global.emojis.success} *Mantra Insta*`
                        }, { quoted: m });
                    }
                }
            } else {
                throw new Error("No media found");
            }

        } catch (e) {
            console.error(e);
            m.reply(`${global.emojis.error} Private account or invalid link.`);
        }
    }
});