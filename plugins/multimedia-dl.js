import { addCommand } from '../lib/plugins.js';
import axios from 'axios';
import { fileTypeFromBuffer } from 'file-type';
import { log } from '../src/utils/logger.js';
import { UI } from '../src/utils/design.js';
import { sendInteractive, sendSimpleButtons } from '../src/utils/buttons.js';
import { react, withReaction } from '../src/utils/messaging.js';
import { toAudio, toVideo, toPTT } from '../lib/converter.js';
import yts from 'yt-search';

const MAX_MEDIA_SIZE = 100 * 1024 * 1024; // 100MB
const gitRepoRegex = /https:\/\/github\.com\/([^/]+)\/([^/]+)/;

/**
 * Helper: Fetch buffer from URL with timeout
 */
async function fetchBuffer(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 60000 });
        return Buffer.from(response.data);
    } catch (e) {
        log.error('Failed to fetch buffer', e, { url });
        throw e;
    }
}

/**
 * Helper: Smart Send (Media or Document)
 */
async function smartSend(conn, chatId, buffer, fileName, mimetype, quoted, caption = '') {
    const isLarge = buffer.length > MAX_MEDIA_SIZE;
    const type = mimetype.split('/')[0];

    const message = {
        contextInfo: {
            forwardingScore: 1,
            isForwarded: true
        }
    };

    if (caption) message.caption = caption;

    if (isLarge || mimetype === 'application/zip') {
        message.document = buffer;
        message.fileName = fileName;
        message.mimetype = mimetype;
    } else {
        message[type] = buffer;
        message.mimetype = mimetype;
    }

    return await conn.sendMessage(chatId, message, { quoted });
}

/**
 * SPOTIFY DOWNLOADER
 */
addCommand({
    pattern: 'spotify',
    alias: ['spotifydl', 'spotidl', 'spoti'],
    category: 'downloader',
    desc: 'Download Spotify tracks by URL or name',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(UI.syntax('.spotify', '<url/name>', 'Download Spotify tracks'));

        await react(conn, m, '🎧');
        const query = text.trim();
        const apiUrl = global.giftedApiUrl;
        const apiKey = global.giftedApiKey;

        try {
            if (query.includes('spotify.com')) {
                await withReaction(conn, m, '⏳', async () => {
                    const { data } = await axios.get(`${apiUrl}/api/download/spotifydl?apikey=${apiKey}&url=${encodeURIComponent(query)}`);
                    if (!data.success) throw new Error(data.message || 'Download failed');

                    const buffer = await fetchBuffer(data.result.download_url);
                    await smartSend(conn, m.chat, buffer, `${data.result.title}.mp3`, 'audio/mpeg', m);
                });
            } else {
                const { data } = await axios.get(`${apiUrl}/api/search/spotifysearch?apikey=${apiKey}&query=${encodeURIComponent(query)}`);
                if (!data.success || !data.results || data.results.length === 0) {
                    return m.reply(UI.error('Not Found', 'No Spotify tracks found.'));
                }

                const track = data.results[0];
                await m.reply(`🎧 *SPOTIFY DOWNLOAD*\n\n✦ *Title:* ${track.title || track.name}\n✦ *Artist:* ${track.artist || track.artists?.join(', ')}\n\n> Sending track...`);

                const dlData = await axios.get(`${apiUrl}/api/download/spotifydl?apikey=${apiKey}&url=${encodeURIComponent(track.url || track.link)}`);
                const buffer = await fetchBuffer(dlData.data.result.download_url);
                await smartSend(conn, m.chat, buffer, `${track.title}.mp3`, 'audio/mpeg', m);
            }
            await react(conn, m, '✅');
        } catch (e) {
            log.error('Spotify failed', e);
            m.reply(UI.error('Download Error', e.message));
            await react(conn, m, '❌');
        }
    }
});

/**
 * FACEBOOK DOWNLOADER
 */
addCommand({
    pattern: 'fb',
    alias: ['fbdl', 'facebook'],
    category: 'downloader',
    desc: 'Download Facebook videos',
    handler: async (m, { conn, text }) => {
        if (!text || (!text.includes('facebook.com') && !text.includes('fb.watch'))) {
            return m.reply(UI.syntax('.fb', '<url>', 'Download FB videos'));
        }

        await react(conn, m, '📘');
        const apiUrl = global.giftedApiUrl;
        const apiKey = global.giftedApiKey;

        try {
            const { data } = await axios.get(`${apiUrl}/api/download/facebook?apikey=${apiKey}&url=${encodeURIComponent(text.trim())}`);
            if (!data.success) throw new Error(data.message || 'Download failed');

            const { title, hd_video, sd_video } = data.result;
            const videoUrl = hd_video || sd_video;

            await withReaction(conn, m, '⏳', async () => {
                const buffer = await fetchBuffer(videoUrl);
                await smartSend(conn, m.chat, buffer, `${title || 'fb-video'}.mp4`, 'video/mp4', m, `✦ *FB:* ${title || 'Video'}`);
            });
            await react(conn, m, '✅');
        } catch (e) {
            log.error('FB DL failed', e);
            m.reply(UI.error('Download Error', e.message));
            await react(conn, m, '❌');
        }
    }
});

/**
 * TIKTOK DOWNLOADER
 */
addCommand({
    pattern: 'tiktok',
    alias: ['tt', 'ttdl'],
    category: 'downloader',
    desc: 'Download TikTok videos',
    handler: async (m, { conn, text }) => {
        if (!text || !text.includes('tiktok.com')) {
            return m.reply(UI.syntax('.tiktok', '<url>', 'Download TikTok videos'));
        }

        await react(conn, m, '🎵');
        const apiUrl = global.giftedApiUrl;
        const apiKey = global.giftedApiKey;

        try {
            const { data } = await axios.get(`${apiUrl}/api/download/tiktok?apikey=${apiKey}&url=${encodeURIComponent(text.trim())}`);
            if (!data.success) throw new Error(data.message || 'Download failed');

            const { title, video, author } = data.result;

            await withReaction(conn, m, '⏳', async () => {
                const buffer = await fetchBuffer(video);
                await smartSend(conn, m.chat, buffer, `tiktok.mp4`, 'video/mp4', m, `🎵 *TikTok:* ${title || 'Video'}\n👤 *Author:* ${author?.name || 'Unknown'}`);
            });
            await react(conn, m, '✅');
        } catch (e) {
            log.error('TikTok failed', e);
            m.reply(UI.error('Download Error', e.message));
            await react(conn, m, '❌');
        }
    }
});

/**
 * INSTAGRAM DOWNLOADER
 */
addCommand({
    pattern: 'ig',
    alias: ['insta', 'igdl'],
    category: 'downloader',
    desc: 'Download Instagram content',
    handler: async (m, { conn, text }) => {
        if (!text || !text.includes('instagram.com')) {
            return m.reply(UI.syntax('.ig', '<url>', 'Download Instagram content'));
        }

        await react(conn, m, '📸');
        const apiUrl = global.giftedApiUrl;
        const apiKey = global.giftedApiKey;

        try {
            const { data } = await axios.get(`${apiUrl}/api/download/instadl?apikey=${apiKey}&url=${encodeURIComponent(text.trim())}`);
            if (!data.success) throw new Error(data.message || 'Download failed');

            const { download_url } = data.result;

            await withReaction(conn, m, '⏳', async () => {
                const buffer = await fetchBuffer(download_url);
                await smartSend(conn, m.chat, buffer, `insta-media`, 'video/mp4', m, `📸 *Instagram Download*`);
            });
            await react(conn, m, '✅');
        } catch (e) {
            log.error('IG DL failed', e);
            m.reply(UI.error('Download Error', e.message));
            await react(conn, m, '❌');
        }
    }
});

/**
 * TWITTER DOWNLOADER
 */
addCommand({
    pattern: 'twitter',
    alias: ['x', 'tw'],
    category: 'downloader',
    desc: 'Download Twitter/X videos',
    handler: async (m, { conn, text }) => {
        if (!text || (!text.includes('twitter.com') && !text.includes('x.com'))) {
            return m.reply(UI.syntax('.twitter', '<url>', 'Download X/Twitter videos'));
        }

        await react(conn, m, '🐦');
        const apiUrl = global.giftedApiUrl;
        const apiKey = global.giftedApiKey;

        try {
            const { data } = await axios.get(`${apiUrl}/api/download/twitter?apikey=${apiKey}&url=${encodeURIComponent(text.trim())}`);
            if (!data.success) throw new Error(data.message || 'Download failed');

            const video = data.result.videoUrls?.[0]?.url;
            if (!video) throw new Error('No video found in tweet');

            await withReaction(conn, m, '⏳', async () => {
                const buffer = await fetchBuffer(video);
                await smartSend(conn, m.chat, buffer, `twitter.mp4`, 'video/mp4', m, `🐦 *X/Twitter Download*`);
            });
            await react(conn, m, '✅');
        } catch (e) {
            log.error('Twitter failed', e);
            m.reply(UI.error('Download Error', e.message));
            await react(conn, m, '❌');
        }
    }
});

/**
 * GITHUB CLONE
 */
addCommand({
    pattern: 'gitclone',
    alias: ['git', 'clone'],
    category: 'downloader',
    desc: 'Download GitHub repo as zip',
    handler: async (m, { conn, text }) => {
        if (!text || !gitRepoRegex.test(text)) {
            return m.reply(UI.syntax('.gitclone', '<github_url>', 'Clone GitHub repo'));
        }

        await react(conn, m, '📦');
        try {
            const [, user, repo] = text.match(gitRepoRegex);
            const zipUrl = `https://api.github.com/repos/${user}/${repo.replace(/\.git$/, '')}/zipball`;
            const filename = `${user}-${repo}.zip`;

            await m.reply(`📦 *GIT CLONE*\n\n✦ *Repo:* ${user}/${repo}\n\n> Fetching zip...`);
            const buffer = await fetchBuffer(zipUrl);
            await smartSend(conn, m.chat, buffer, filename, 'application/zip', m, `📦 *Repo:* ${user}/${repo}`);
            await react(conn, m, '✅');
        } catch (e) {
            log.error('GitClone failed', e);
            m.reply(UI.error('Clone Error', e.message));
            await react(conn, m, '❌');
        }
    }
});

/**
 * GDRIVE DOWNLOADER
 */
addCommand({
    pattern: 'gdrive',
    alias: ['gdrivedl'],
    category: 'downloader',
    desc: 'Download from Google Drive',
    handler: async (m, { conn, text }) => {
        if (!text || !text.includes('drive.google.com')) {
            return m.reply(UI.syntax('.gdrive', '<url>', 'Download Drive files'));
        }

        await react(conn, m, '📁');
        const apiUrl = global.giftedApiUrl;
        const apiKey = global.giftedApiKey;

        try {
            const { data } = await axios.get(`${apiUrl}/api/download/gdrivedl?apikey=${apiKey}&url=${encodeURIComponent(text.trim())}`);
            if (!data.success) throw new Error(data.message || 'File not found');

            const { name, download_url } = data.result;
            const buffer = await fetchBuffer(download_url);
            await smartSend(conn, m.chat, buffer, name, 'application/octet-stream', m, `📁 *GDrive:* ${name}`);
            await react(conn, m, '✅');
        } catch (e) {
            log.error('GDrive failed', e);
            m.reply(UI.error('Download Error', e.message));
            await react(conn, m, '❌');
        }
    }
});

/**
 * APK DOWNLOADER
 */
addCommand({
    pattern: 'apk',
    alias: ['app'],
    category: 'downloader',
    desc: 'Download Android APKs',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(UI.syntax('.apk', '<app_name>', 'Download Android apps'));

        await react(conn, m, '📱');
        const apiUrl = global.giftedApiUrl;
        const apiKey = global.giftedApiKey;

        try {
            const { data } = await axios.get(`${apiUrl}/api/download/apkdl?apikey=${apiKey}&appName=${encodeURIComponent(text)}`);
            if (!data.success) throw new Error(data.message || 'App not found');

            const { appname, appicon, developer, download_url } = data.result;
            if (appicon) await conn.sendMessage(m.chat, { image: { url: appicon }, caption: `📱 *App:* ${appname}\n👤 *Dev:* ${developer}` }, { quoted: m });

            const buffer = await fetchBuffer(download_url);
            await smartSend(conn, m.chat, buffer, `${appname}.apk`, 'application/vnd.android.package-archive', m);
            await react(conn, m, '✅');
        } catch (e) {
            log.error('APK failed', e);
            m.reply(UI.error('Download Error', e.message));
            await react(conn, m, '❌');
        }
    }
});

/**
 * PASTEBIN VIEWER
 */
addCommand({
    pattern: 'pastebin',
    category: 'downloader',
    desc: 'Fetch Pastebin content',
    handler: async (m, { conn, text }) => {
        if (!text || !text.includes('pastebin.com')) return m.reply(UI.syntax('.pastebin', '<url>', 'Fetch paste content'));

        await react(conn, m, '📋');
        try {
            const { data } = await axios.get(`${global.giftedApiUrl}/api/download/pastebin?apikey=${global.giftedApiKey}&url=${encodeURIComponent(text.trim())}`);
            if (!data.success) throw new Error(data.message || 'Fetch failed');

            if (data.result.length > 4000) {
                await conn.sendMessage(m.chat, { document: Buffer.from(data.result), fileName: 'paste.txt', mimetype: 'text/plain' }, { quoted: m });
            } else {
                await m.reply(`📋 *PASTEBIN CONTENT*\n${global.divider}\n\n${UI.format.codeBlock(data.result)}`);
            }
            await react(conn, m, '✅');
        } catch (e) {
            m.reply(UI.error('Fetch Error', e.message));
            await react(conn, m, '❌');
        }
    }
});

/**
 * YOUTUBE PLAY & VIDEO
 */
addCommand({
    pattern: 'play',
    alias: ['song', 'yta', 'ytmp3'],
    category: 'downloader',
    desc: 'Download YouTube audio',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(UI.syntax('.play', '<query/url>', 'Download YouTube audio'));

        await withReaction(conn, m, '🔎', async () => {
            const search = await yts(text);
            if (!search.videos.length) throw new Error('No results found');
            const video = search.videos[0];

            const caption = `🎧 *YT PLAY*\n${global.divider}\n✦ *Title:* ${video.title}\n✦ *Duration:* ${video.timestamp}\n✦ *Author:* ${video.author.name}`;

            // For simplicity in the consolidated suite, we send audio directly.
            // Advanced users can use individual plugins if they exist, but here we provide a high-quality MP3.
            const apiUrl = `http://31.220.82.203:2029/api/yta?url=${encodeURIComponent(video.url)}&stream=true`;
            const buffer = await fetchBuffer(apiUrl);
            const mp3 = await toAudio(buffer, 'mp3');

            await conn.sendMessage(m.chat, {
                audio: mp3,
                mimetype: 'audio/mpeg',
                externalAdReply: {
                    title: video.title,
                    body: video.author.name,
                    thumbnailUrl: video.thumbnail,
                    mediaType: 1
                }
            }, { quoted: m });
        });
    }
});

addCommand({
    pattern: 'video',
    alias: ['ytv', 'ytmp4'],
    category: 'downloader',
    desc: 'Download YouTube video',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(UI.syntax('.video', '<query/url>', 'Download YouTube video'));

        await withReaction(conn, m, '🔎', async () => {
            const search = await yts(text);
            if (!search.videos.length) throw new Error('No results found');
            const video = search.videos[0];

            const apiUrl = `http://31.220.82.203:2029/api/ytv?url=${encodeURIComponent(video.url)}&stream=true`;
            const buffer = await fetchBuffer(apiUrl);
            await smartSend(conn, m.chat, buffer, `${video.title}.mp4`, 'video/mp4', m, `🎥 *YT VIDEO*\n✦ *Title:* ${video.title}`);
        });
    }
});

/**
 * SNACK VIDEO
 */
addCommand({
    pattern: 'snack',
    alias: ['snackdl'],
    category: 'downloader',
    desc: 'Download Snack Video',
    handler: async (m, { conn, text }) => {
        if (!text || !text.includes('snackvideo.com')) return m.reply(UI.syntax('.snack', '<url>', 'Download Snack videos'));

        await react(conn, m, '🍿');
        try {
            const { data } = await axios.get(`${global.giftedApiUrl}/api/download/snackdl?apikey=${global.giftedApiKey}&url=${encodeURIComponent(text.trim())}`);
            if (!data.success) throw new Error(data.message || 'Download failed');

            const { title, media, author } = data.result;
            const buffer = await fetchBuffer(media);
            await smartSend(conn, m.chat, buffer, 'snack.mp4', 'video/mp4', m, `🍿 *Snack:* ${title || 'Video'}\n👤 *Author:* ${author}`);
            await react(conn, m, '✅');
        } catch (e) {
            m.reply(UI.error('Download Error', e.message));
            await react(conn, m, '❌');
        }
    }
});
/**
 * GENERIC MEDIA DOWNLOADERS
 */

// IMAGE
addCommand({
    pattern: 'sendimage',
    alias: ['sendimg', 'dlimg'],
    category: 'downloader',
    desc: 'Download image from direct URL',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(UI.syntax('.sendimage', '<url>', 'Download image from URL'));

        await withReaction(conn, m, '📥', async () => {
            const buffer = await fetchBuffer(text.trim());
            const type = await fileTypeFromBuffer(buffer);
            if (!type?.mime.startsWith('image/')) throw new Error('Not a valid image URL');

            await conn.sendMessage(m.chat, { image: buffer, caption: '🖼️ *Downloaded by Mantra*' }, { quoted: m });
        });
    }
});

// AUDIO
addCommand({
    pattern: 'sendaudio',
    alias: ['sendmp3', 'dlaudio'],
    category: 'downloader',
    desc: 'Download audio from direct URL',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(UI.syntax('.sendaudio', '<url>', 'Download audio from URL'));

        await withReaction(conn, m, '🎵', async () => {
            const buffer = await fetchBuffer(text.trim());
            const converted = await toAudio(buffer, 'mp3').catch(() => buffer);
            await conn.sendMessage(m.chat, { audio: converted, mimetype: 'audio/mpeg' }, { quoted: m });
        });
    }
});

// VIDEO
addCommand({
    pattern: 'sendvideo',
    alias: ['sendmp4', 'dlvid'],
    category: 'downloader',
    desc: 'Download video from direct URL',
    handler: async (m, { conn, text }) => {
        if (!text) return m.reply(UI.syntax('.sendvideo', '<url>', 'Download video from URL'));

        await withReaction(conn, m, '🎥', async () => {
            const buffer = await fetchBuffer(text.trim());
            const converted = await toVideo(buffer, 'mp4').catch(() => buffer);
            await smartSend(conn, m.chat, converted, 'video.mp4', 'video/mp4', m, '🎥 *Downloaded by Mantra*');
        });
    }
});
