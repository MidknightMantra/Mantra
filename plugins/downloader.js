import { addCommand } from '../lib/plugins.js';
import { getBuffer, toPtt, toAudio, toVideo } from '../src/utils/converter.js';
import { gmd, getMimeFromUrl, getMimeCategory, MAX_MEDIA_SIZE, gitRepoRegex, getFileSize } from '../lib/mantra.js';
import GIFTED_DLS from 'gifted-dls';

const giftedDls = new GIFTED_DLS();

/**
 * Image Downloader
 */
addCommand({
    pattern: 'sendimage',
    alias: ['sendimg', 'dlimg', 'dlimage'],
    category: 'downloader',
    react: '📷',
    desc: 'Download Image from url',
    handler: async (m, { text, conn }) => {
        if (!text) return m.reply("❌ Please provide image url");

        try {
            const buffer = await getBuffer(text);
            if (!buffer) return m.reply("❌ Failed to download the image file.");

            await conn.sendMessage(m.chat, {
                image: buffer,
                mimetype: "image/jpeg",
                caption: `> *${global.botName}*`
            }, { quoted: m });
        } catch (error) {
            log.error("Error/sendimage:", error);
            m.reply("❌ Failed to download image.");
        }
    }
});

/**
 * Audio Downloader
 */
addCommand({
    pattern: 'sendaudio',
    alias: ['sendmp3', 'dlmp3', 'dlaudio'],
    category: 'downloader',
    react: '🎶',
    desc: 'Download Audio from url',
    handler: async (m, { text, conn }) => {
        if (!text) return m.reply("❌ Please provide audio url");

        try {
            const buffer = await getBuffer(text);
            if (!buffer) return m.reply("❌ Failed to download the audio file.");

            // Attempt to convert if needed, or send as is
            const convertedBuffer = await toAudio(buffer, 'mp4');

            await conn.sendMessage(m.chat, {
                audio: convertedBuffer,
                mimetype: "audio/mpeg",
                caption: `> *${global.botName}*`
            }, { quoted: m });
        } catch (error) {
            log.error("Error/sendaudio:", error);
            m.reply("❌ Failed to download/convert audio.");
        }
    }
});

/**
 * Video Downloader
 */
addCommand({
    pattern: 'sendvideo',
    alias: ['sendmp4', 'dlmp4', 'dvideo'],
    category: 'downloader',
    react: '🎥',
    desc: 'Download Video from url',
    handler: async (m, { text, conn }) => {
        if (!text) return m.reply("❌ Please provide video url");

        try {
            const buffer = await getBuffer(text);
            if (!buffer) return m.reply("❌ Failed to download the video file.");

            const convertedBuffer = await toVideo(buffer, 'mp4');

            await conn.sendMessage(m.chat, {
                video: convertedBuffer,
                mimetype: "video/mp4",
                fileName: "Video.mp4",
                caption: `> *${global.botName}*`
            }, { quoted: m });
        } catch (error) {
            log.error("Error/sendvideo:", error);
            m.reply("❌ Failed to download/convert video.");
        }
    }
});

/**
 * YouTube Audio
 */
addCommand({
    pattern: 'play',
    alias: ['ytmp3', 'ytmp3doc', 'audiodoc', 'yta'],
    category: 'downloader',
    react: '🎶',
    desc: 'Download Audio from Youtube',
    handler: async (m, { text, conn }) => {
        if (!text) return m.reply("❌ Please provide a song name");

        try {
            const searchResponse = await yts(text);
            if (!searchResponse.videos.length) return m.reply("❌ No video found.");

            const firstVideo = searchResponse.videos[0];
            const audioApi = `http://31.220.82.203:2029/api/yta?url=${encodeURIComponent(firstVideo.url)}&stream=true`;

            await m.react('⬇️');

            const bufferRes = await getBuffer(audioApi);
            if (!bufferRes) return m.reply("❌ Failed to download audio stream.");

            const sizeMB = bufferRes.length / (1024 * 1024);
            if (sizeMB > 50) return m.reply("❌ File too large (>50MB).");

            const convertedBuffer = await toAudio(bufferRes, 'mp3');
            const dateNow = Date.now();

            await sendButtons(conn, m.chat, {
                text: `⿻ *Title:* ${firstVideo.title}\n⿻ *Duration:* ${firstVideo.timestamp}\n\n*Select format:*`,
                footer: global.botName,
                image: firstVideo.thumbnail,
                buttons: [
                    { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: "Audio 🎶", id: `play_audio_${dateNow}` }) },
                    { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: "Voice Msg 🔉", id: `play_ptt_${dateNow}` }) },
                    { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: "Document 📄", id: `play_doc_${dateNow}` }) }
                ]
            });

            const listener = async (upsert) => {
                const msg = upsert.messages[0];
                if (!msg.message || msg.key.remoteJid !== m.chat) return;

                let selectedId = null;
                if (msg.message.buttonsResponseMessage) selectedId = msg.message.buttonsResponseMessage.selectedButtonId;
                else if (msg.message.templateButtonReplyMessage) selectedId = msg.message.templateButtonReplyMessage.selectedId;
                else if (msg.message.interactiveMessage) {
                    const resp = msg.message.interactiveMessage.nativeFlowResponseMessage;
                    if (resp) selectedId = JSON.parse(resp.paramsJson).id;
                }

                if (selectedId && selectedId.endsWith(`_${dateNow}`)) {
                    await conn.sendMessage(m.chat, { react: { text: '⬇️', key: msg.key } });

                    if (selectedId.startsWith('play_audio')) {
                        await conn.sendMessage(m.chat, { audio: convertedBuffer, mimetype: 'audio/mpeg' }, { quoted: msg });
                    } else if (selectedId.startsWith('play_ptt')) {
                        const pttBuffer = await toPtt(convertedBuffer);
                        await conn.sendMessage(m.chat, { audio: pttBuffer, mimetype: 'audio/ogg; codecs=opus', ptt: true }, { quoted: msg });
                    } else if (selectedId.startsWith('play_doc')) {
                        await conn.sendMessage(m.chat, { document: convertedBuffer, mimetype: 'audio/mpeg', fileName: `${firstVideo.title}.mp3` }, { quoted: msg });
                    }

                    conn.ev.off('messages.upsert', listener);
                }
            };

            conn.ev.on('messages.upsert', listener);
            setTimeout(() => conn.ev.off('messages.upsert', listener), 60000);

        } catch (error) {
            log.error("Error/play:", error);
            m.reply("❌ Failed to download song.");
        }
    }
});

/**
 * YouTube Video
 */
addCommand({
    pattern: 'video',
    alias: ['ytmp4', 'ytmp4doc', 'mp4', 'dlmp4'],
    category: 'downloader',
    react: '🎥',
    desc: 'Download Video from Youtube',
    handler: async (m, { text, conn }) => {
        if (!text) return m.reply("❌ Please provide a video name");

        try {
            const searchResponse = await yts(text);
            if (!searchResponse.videos.length) return m.reply("❌ No video found.");

            const firstVideo = searchResponse.videos[0];
            const videoApi = `http://31.220.82.203:2029/api/ytv?url=${encodeURIComponent(firstVideo.url)}&stream=true`;

            await m.react('⬇️');

            const bufferRes = await getBuffer(videoApi);
            if (!bufferRes) return m.reply("❌ Failed to download video stream.");

            const sizeMB = bufferRes.length / (1024 * 1024);
            if (sizeMB > 50) return m.reply("❌ File too large (>50MB).");

            // Explicitly convert using optimized preset to ensure MP4 compatibility
            const convertedBuffer = await toVideo(bufferRes, 'mp4');

            const dateNow = Date.now();

            await sendButtons(conn, m.chat, {
                text: `⿻ *Title:* ${firstVideo.title}\n⿻ *Duration:* ${firstVideo.timestamp}\n\n*Select format:*`,
                footer: global.botName,
                image: firstVideo.thumbnail,
                buttons: [
                    { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: "Video 🎥", id: `vid_mp4_${dateNow}` }) },
                    { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: "Document 📄", id: `vid_doc_${dateNow}` }) }
                ]
            });

            const listener = async (upsert) => {
                const msg = upsert.messages[0];
                if (!msg.message || msg.key.remoteJid !== m.chat) return;

                let selectedId = null;
                if (msg.message.buttonsResponseMessage) selectedId = msg.message.buttonsResponseMessage.selectedButtonId;
                else if (msg.message.templateButtonReplyMessage) selectedId = msg.message.templateButtonReplyMessage.selectedId;
                else if (msg.message.interactiveMessage) {
                    const resp = msg.message.interactiveMessage.nativeFlowResponseMessage;
                    if (resp) selectedId = JSON.parse(resp.paramsJson).id;
                }

                if (selectedId && selectedId.endsWith(`_${dateNow}`)) {
                    await conn.sendMessage(m.chat, { react: { text: '⬇️', key: msg.key } });

                    if (selectedId.startsWith('vid_mp4')) {
                        await conn.sendMessage(m.chat, { video: convertedBuffer, mimetype: 'video/mp4', caption: `🎥 ${firstVideo.title}` }, { quoted: msg });
                    } else if (selectedId.startsWith('vid_doc')) {
                        await conn.sendMessage(m.chat, { document: convertedBuffer, mimetype: 'video/mp4', fileName: `${firstVideo.title}.mp4`, caption: `📄 ${firstVideo.title}` }, { quoted: msg });
                    }

                    conn.ev.off('messages.upsert', listener);
                }
            };

            conn.ev.on('messages.upsert', listener);
            setTimeout(() => conn.ev.off('messages.upsert', listener), 60000);

        } catch (error) {
            log.error("Error/video:", error);
            m.reply("❌ Failed to download video.");
        }
    }
});

/**
 * 🎧 SPOTIFY DOWNLOADER
 */
gmd({
    pattern: "spotify",
    category: "downloader",
    react: "🎧",
    aliases: ["spotifydl", "spotidl", "spoti"],
    description: "Download Spotify tracks by URL or song name",
}, async (from, Gifted, conText) => {
    const { q, mek, reply, react, botName, botFooter, gmdBuffer, GiftedTechApi, GiftedApiKey } = conText;

    if (!q) {
        await react("❌");
        return reply("Please provide a Spotify URL or song name\n\n*Examples:*\n.spotify https://open.spotify.com/track/...\n.spotify The Spectre Alan Walker");
    }

    const truncate = (str, len) => str && str.length > len ? str.substring(0, len - 2) + ".." : str;

    const downloadAndSend = async (trackUrl, quotedMsg) => {
        const endpoints = ["spotifydl", "spotifydlv2"];
        let result = null;

        for (const endpoint of endpoints) {
            try {
                const apiUrl = `${GiftedTechApi}/api/download/${endpoint}?apikey=${GiftedApiKey}&url=${encodeURIComponent(trackUrl)}`;
                const response = await axios.get(apiUrl, { timeout: 30000 });
                if (response.data?.success && response.data?.result?.download_url) {
                    result = response.data.result;
                    break;
                }
            } catch (err) { continue; }
        }

        if (!result || !result.download_url) {
            await react("❌");
            return reply("Failed to fetch track. Please try again.", quotedMsg);
        }

        const audioBuffer = await gmdBuffer(result.download_url);
        if (audioBuffer.length > MAX_MEDIA_SIZE) {
            await Gifted.sendMessage(from, {
                document: audioBuffer,
                fileName: `${(result.title || "track").replace(/[^\w\s.-]/gi, "")}.mp3`,
                mimetype: "audio/mpeg"
            }, { quoted: quotedMsg });
        } else {
            await Gifted.sendMessage(from, { audio: audioBuffer, mimetype: "audio/mpeg" }, { quoted: quotedMsg });
        }
        await react("✅");
    };

    try {
        if (q.includes("spotify.com")) return await downloadAndSend(q, mek);

        const searchUrl = `${GiftedTechApi}/api/search/spotifysearch?apikey=${GiftedApiKey}&query=${encodeURIComponent(q)}`;
        const searchResponse = await axios.get(searchUrl, { timeout: 30000 });
        const tracks = searchResponse.data?.results?.tracks?.slice(0, 3) || searchResponse.data?.results?.slice(0, 3) || [];

        if (!tracks.length) {
            await react("❌");
            return reply("No tracks found.");
        }

        const dateNow = Date.now();
        const buttons = tracks.map((track, index) => ({
            id: `sp_${index}_${dateNow}`,
            text: truncate(track.title || track.name, 20)
        }));

        await sendButtons(Gifted, from, {
            title: `${botName} SPOTIFY`,
            text: `*Search Results:*\n\n${tracks.map((t, i) => `${i + 1}. ${t.title || t.name}`).join('\n')}\n\n*Select a track:*`,
            footer: botFooter,
            buttons: buttons
        });

        const handleResponse = async (upsert) => {
            const msg = upsert.messages[0];
            if (!msg.message || msg.key.remoteJid !== from) return;
            const selectedId = msg.message.templateButtonReplyMessage?.selectedId || msg.message.buttonsResponseMessage?.selectedButtonId;
            if (!selectedId || !selectedId.includes(`_${dateNow}`)) return;

            await react("⬇️");
            const index = parseInt(selectedId.split("_")[1]);
            const track = tracks[index];
            const url = track?.url || track?.link || track?.external_urls?.spotify;
            if (url) await downloadAndSend(url, msg);
            Gifted.ev.off("messages.upsert", handleResponse);
        };

        Gifted.ev.on("messages.upsert", handleResponse);
        setTimeout(() => Gifted.ev.off("messages.upsert", handleResponse), 120000);
    } catch (e) {
        log.error("Spotify Error:", e);
        reply("An error occurred.");
    }
});

/**
 * 📁 GDrive Downloader
 */
gmd({
    pattern: "gdrive",
    category: "downloader",
    react: "📁",
    aliases: ["googledrive", "drive"],
    description: "Download from Google Drive",
}, async (from, Gifted, conText) => {
    const { q, mek, react, reply, GiftedTechApi, GiftedApiKey, gmdBuffer } = conText;
    if (!q || !q.includes("drive.google.com")) return reply("Please provide a valid Google Drive URL");

    try {
        const res = await axios.get(`${GiftedTechApi}/api/download/gdrivedl?apikey=${GiftedApiKey}&url=${encodeURIComponent(q)}`);
        if (!res.data?.success) return reply("Failed to fetch file.");

        const { name, download_url } = res.data.result;
        const buffer = await gmdBuffer(download_url);
        const mime = getMimeFromUrl(name || "");
        const cat = getMimeCategory(mime);

        if (cat === 'audio' && buffer.length < MAX_MEDIA_SIZE) {
            await Gifted.sendMessage(from, { audio: buffer, mimetype: 'audio/mpeg' }, { quoted: mek });
        } else if (cat === 'video' && buffer.length < MAX_MEDIA_SIZE) {
            await Gifted.sendMessage(from, { video: buffer, caption: name, mimetype: 'video/mp4' }, { quoted: mek });
        } else {
            await Gifted.sendMessage(from, { document: buffer, fileName: name, mimetype: mime }, { quoted: mek });
        }
        await react("✅");
    } catch (e) { reply("Error downloading from GDrive."); }
});

/**
 * 🔥 MediaFire Downloader
 */
gmd({
    pattern: "mediafire",
    category: "downloader",
    react: "🔥",
    aliases: ["mfire"],
    description: "Download from MediaFire",
}, async (from, Gifted, conText) => {
    const { q, mek, react, reply, GiftedTechApi, GiftedApiKey } = conText;
    if (!q || !q.includes("mediafire.com")) return reply("Please provide a valid MediaFire URL");

    try {
        const res = await axios.get(`${GiftedTechApi}/api/download/mediafire?apikey=${GiftedApiKey}&url=${encodeURIComponent(q)}`);
        if (!res.data?.success) return reply("Failed to fetch file.");

        const { fileName, downloadUrl, mimeType } = res.data.result;
        await Gifted.sendMessage(from, { document: { url: downloadUrl }, fileName, mimetype: mimeType }, { quoted: mek });
        await react("✅");
    } catch (e) { reply("Error downloading from MediaFire."); }
});

/**
 * 📱 APK Downloader
 */
gmd({
    pattern: "apk",
    category: "downloader",
    react: "📱",
    description: "Download Android APK files",
}, async (from, Gifted, conText) => {
    const { q, mek, react, reply, GiftedTechApi, GiftedApiKey, botName } = conText;
    if (!q) return reply("Example: .apk WhatsApp");

    try {
        await reply(`Searching for *${q}*...`);
        const res = await axios.get(`${GiftedTechApi}/api/download/apkdl?apikey=${GiftedApiKey}&appName=${encodeURIComponent(q)}`);
        if (!res.data?.success) return reply("App not found.");

        const { appname, appicon, download_url } = res.data.result;
        await Gifted.sendMessage(from, { image: { url: appicon }, caption: `*${botName} APK*\n*App:* ${appname}` }, { quoted: mek });
        await Gifted.sendMessage(from, { document: { url: download_url }, fileName: `${appname}.apk`, mimetype: 'application/vnd.android.package-archive' }, { quoted: mek });
        await react("✅");
    } catch (e) { reply("Error downloading APK."); }
});

/**
 * 📋 Pastebin Viewer
 */
gmd({
    pattern: "pastebin",
    category: "downloader",
    react: "📋",
    description: "Fetch content from Pastebin",
}, async (from, Gifted, conText) => {
    const { q, mek, react, reply, GiftedTechApi, GiftedApiKey, botName } = conText;
    if (!q || !q.includes("pastebin.com")) return reply("Provide a valid Pastebin URL");

    try {
        const res = await axios.get(`${GiftedTechApi}/api/download/pastebin?apikey=${GiftedApiKey}&url=${encodeURIComponent(q)}`);
        const content = res.data.result;
        if (content.length > 65000) {
            await Gifted.sendMessage(from, { document: Buffer.from(content), fileName: 'paste.txt', mimetype: 'text/plain' }, { quoted: mek });
        } else {
            await reply(`*${botName} PASTEBIN*\n\n${content}`);
        }
        await react("✅");
    } catch (e) { reply("Error fetching paste."); }
});

/**
 * 📽 YouTube Video (Advanced)
 */
gmd({
    pattern: "ytv",
    category: "downloader",
    react: "📽",
    description: "Download Video from YouTube (Select Quality)",
}, async (from, Gifted, conText) => {
    const { q, mek, react, reply, GiftedTechApi, GiftedApiKey, botName, botPic, formatVideo, gmdBuffer } = conText;
    if (!q || !q.includes("youtu")) return reply("Provide a YouTube URL");

    try {
        const search = await axios.get(`${GiftedTechApi}/search/yts?apikey=${GiftedApiKey}&query=${encodeURIComponent(q)}`);
        const video = search.data.results[0];

        const sent = await Gifted.sendMessage(from, {
            image: { url: video.thumbnail || botPic },
            caption: `*${botName} YTV*\n\n*Title:* ${video.title}\n\n*Reply with quality:*\n1 - 360p\n2 - 720p\n3 - 1080p`
        }, { quoted: mek });

        const handle = async (upsert) => {
            const msg = upsert.messages[0];
            if (msg.message?.extendedTextMessage?.contextInfo?.stanzaId !== sent.key.id) return;

            const choice = (msg.message.conversation || msg.message.extendedTextMessage?.text).trim();
            const quality = choice === "1" ? 360 : choice === "2" ? 720 : choice === "3" ? 1080 : null;
            if (!quality) return reply("Invalid choice. 1, 2, or 3 only.");

            await react("⬇️");
            try {
                const dl = await giftedDls.ytmp4(q, quality);
                const buffer = await gmdBuffer(dl.result.download_url);
                if (buffer.length > MAX_MEDIA_SIZE) {
                    await Gifted.sendMessage(from, { document: buffer, fileName: `${video.title}.mp4`, mimetype: 'video/mp4' }, { quoted: msg });
                } else {
                    const formatted = await formatVideo(buffer);
                    await Gifted.sendMessage(from, { video: formatted, mimetype: 'video/mp4' }, { quoted: msg });
                }
                await react("✅");
            } catch (e) { reply("Download failed."); }
            Gifted.ev.off("messages.upsert", handle);
        };

        Gifted.ev.on("messages.upsert", handle);
        setTimeout(() => Gifted.ev.off("messages.upsert", handle), 120000);
    } catch (e) { reply("Error searching video."); }
});

/**
 * 📦 GITHUB REPO DOWNLOADER
 */
gmd({
    pattern: "gitclone",
    category: "downloader",
    react: "📦",
    aliases: ["gitdl", "github", "git", "repodl", "clone"],
    description: "Download GitHub repository as zip file",
}, async (from, Gifted, conText) => {
    const { q, mek, reply, react, botName, newsletterJid, gitRepoRegex } = conText;
    if (!q || !gitRepoRegex.test(q)) return reply("Please provide a valid GitHub link.");

    try {
        let [, user, repo] = q.match(gitRepoRegex) || [];
        repo = repo.replace(/\.git$/, "").split("/")[0];
        const zipUrl = `https://api.github.com/repos/${user}/${repo}/zipball`;

        await reply(`Fetching repository *${user}/${repo}*...`);
        await Gifted.sendMessage(from, {
            document: { url: zipUrl },
            fileName: `${user}-${repo}.zip`,
            mimetype: "application/zip",
        }, { quoted: mek });
        await react("✅");
    } catch (e) { reply("Failed to download repository."); }
});

/**
 * 📘 FACEBOOK DOWNLOADER
 */
gmd({
    pattern: "fb",
    category: "downloader",
    react: "📘",
    aliases: ["fbdl", "facebook"],
    description: "Download Facebook videos",
}, async (from, Gifted, conText) => {
    const { q, mek, reply, react, botName, botFooter, gmdBuffer, toAudio, GiftedTechApi, GiftedApiKey } = conText;
    if (!q || (!q.includes("facebook.com") && !q.includes("fb.watch"))) return reply("Provide a valid Facebook URL.");

    try {
        const res = await axios.get(`${GiftedTechApi}/api/download/facebook?apikey=${GiftedApiKey}&url=${encodeURIComponent(q)}`);
        if (!res.data?.success) return reply("Failed to fetch video.");

        const { title, hd_video, sd_video, thumbnail } = res.data.result;
        const videoUrl = hd_video || sd_video;
        const dateNow = Date.now();

        await sendButtons(Gifted, from, {
            title: `${botName} FACEBOOK`,
            text: `*Title:* ${title || "Facebook Video"}\n\n*Select format:*`,
            footer: botFooter,
            image: thumbnail,
            buttons: [
                { id: `fb_hd_${dateNow}`, text: "HD Video" },
                { id: `fb_sd_${dateNow}`, text: "SD Video" },
                { id: `fb_aud_${dateNow}`, text: "Audio 🎵" }
            ]
        });

        const handle = async (upsert) => {
            const msg = upsert.messages[0];
            if (!msg.message || msg.key.remoteJid !== from) return;
            const sid = msg.message.templateButtonReplyMessage?.selectedId || msg.message.buttonsResponseMessage?.selectedButtonId;
            if (!sid || !sid.includes(`_${dateNow}`)) return;

            await react("⬇️");
            if (sid.startsWith("fb_aud")) {
                const buff = await gmdBuffer(videoUrl);
                const aud = await toAudio(buff);
                await Gifted.sendMessage(from, { audio: aud, mimetype: 'audio/mpeg' }, { quoted: msg });
            } else {
                const url = sid.startsWith("fb_hd") ? hd_video : sd_video;
                await Gifted.sendMessage(from, { video: { url }, caption: title, mimetype: 'video/mp4' }, { quoted: msg });
            }
            Gifted.ev.off("messages.upsert", handle);
        };
        Gifted.ev.on("messages.upsert", handle);
    } catch (e) { reply("Error downloading from Facebook."); }
});

/**
 * 🎵 TIKTOK DOWNLOADER
 */
gmd({
    pattern: "tiktok",
    category: "downloader",
    react: "🎵",
    aliases: ["tt"],
    description: "Download TikTok videos",
}, async (from, Gifted, conText) => {
    const { q, mek, reply, react, botName, botFooter, gmdBuffer, toAudio, GiftedTechApi, GiftedApiKey } = conText;
    if (!q || !q.includes("tiktok.com")) return reply("Provide a valid TikTok URL.");

    try {
        const res = await axios.get(`${GiftedTechApi}/api/download/tiktok?apikey=${GiftedApiKey}&url=${encodeURIComponent(q)}`);
        if (!res.data?.success) return reply("Failed to fetch video.");

        const { title, video, music, cover } = res.data.result;
        const dateNow = Date.now();

        await sendButtons(Gifted, from, {
            title: `${botName} TIKTOK`,
            text: `*Title:* ${title || "TikTok Video"}\n\n*Select format:*`,
            footer: botFooter,
            image: cover,
            buttons: [
                { id: `tt_vid_${dateNow}`, text: "Video 🎥" },
                { id: `tt_aud_${dateNow}`, text: "Audio 🎵" }
            ]
        });

        const handle = async (upsert) => {
            const msg = upsert.messages[0];
            if (!msg.message || msg.key.remoteJid !== from) return;
            const sid = msg.message.templateButtonReplyMessage?.selectedId || msg.message.buttonsResponseMessage?.selectedButtonId;
            if (!sid || !sid.includes(`_${dateNow}`)) return;

            await react("⬇️");
            if (sid.startsWith("tt_aud")) {
                const aud = await gmdBuffer(music || video);
                const converted = music ? aud : await toAudio(aud);
                await Gifted.sendMessage(from, { audio: converted, mimetype: 'audio/mpeg' }, { quoted: msg });
            } else {
                await Gifted.sendMessage(from, { video: { url: video }, caption: title, mimetype: 'video/mp4' }, { quoted: msg });
            }
            Gifted.ev.off("messages.upsert", handle);
        };
        Gifted.ev.on("messages.upsert", handle);
    } catch (e) { reply("Error downloading from TikTok."); }
});

/**
 * 🐦 TWITTER / X DOWNLOADER
 */
gmd({
    pattern: "twitter",
    category: "downloader",
    react: "🐦",
    aliases: ["x", "tw"],
    description: "Download Twitter/X videos",
}, async (from, Gifted, conText) => {
    const { q, mek, reply, react, botName, botFooter, GiftedTechApi, GiftedApiKey } = conText;
    if (!q || (!q.includes("twitter.com") && !q.includes("x.com"))) return reply("Provide a valid Twitter URL.");

    try {
        const res = await axios.get(`${GiftedTechApi}/api/download/twitter?apikey=${GiftedApiKey}&url=${encodeURIComponent(q)}`);
        if (!res.data?.success) return reply("No video found.");

        const { videoUrls, thumbnail } = res.data.result;
        const dateNow = Date.now();

        await sendButtons(Gifted, from, {
            title: `${botName} X / TWITTER`,
            text: `*Select Quality:*`,
            footer: botFooter,
            image: thumbnail,
            buttons: videoUrls.map((v, i) => ({ id: `tw_${i}_${dateNow}`, text: v.quality }))
        });

        const handle = async (upsert) => {
            const msg = upsert.messages[0];
            if (!msg.message || msg.key.remoteJid !== from) return;
            const sid = msg.message.templateButtonReplyMessage?.selectedId || msg.message.buttonsResponseMessage?.selectedButtonId;
            if (!sid || !sid.includes(`_${dateNow}`)) return;

            await react("⬇️");
            const idx = parseInt(sid.split("_")[1]);
            await Gifted.sendMessage(from, { video: { url: videoUrls[idx].url }, mimetype: 'video/mp4' }, { quoted: msg });
            Gifted.ev.off("messages.upsert", handle);
        };
        Gifted.ev.on("messages.upsert", handle);
    } catch (e) { reply("Error downloading from Twitter."); }
});

/**
 * 📸 INSTAGRAM DOWNLOADER
 */
gmd({
    pattern: "ig",
    category: "downloader",
    react: "📸",
    aliases: ["insta", "igdl"],
    description: "Download Instagram reels/videos",
}, async (from, Gifted, conText) => {
    const { q, mek, reply, react, botName, botFooter, GiftedTechApi, GiftedApiKey } = conText;
    if (!q || !q.includes("instagram.com")) return reply("Provide a valid Instagram URL.");

    try {
        const res = await axios.get(`${GiftedTechApi}/api/download/instadl?apikey=${GiftedApiKey}&url=${encodeURIComponent(q)}`);
        if (!res.data?.success) return reply("Failed to fetch.");

        const { download_url, thumbnail } = res.data.result;
        await Gifted.sendMessage(from, { video: { url: download_url }, caption: `> *${botName}*`, image: { url: thumbnail } }, { quoted: mek });
        await react("✅");
    } catch (e) { reply("Error downloading from Instagram."); }
});

/**
 * 🍿 SNACK VIDEO DOWNLOADER
 */
gmd({
    pattern: "snack",
    category: "downloader",
    react: "🍿",
    description: "Download Snack Video",
}, async (from, Gifted, conText) => {
    const { q, mek, reply, react, GiftedTechApi, GiftedApiKey } = conText;
    if (!q || !q.includes("snackvideo.com")) return reply("Provide a valid Snack Video URL.");

    try {
        const res = await axios.get(`${GiftedTechApi}/api/download/snackdl?apikey=${GiftedApiKey}&url=${encodeURIComponent(q)}`);
        if (!res.data?.success) return reply("Failed to fetch.");

        const { media, title } = res.data.result;
        await Gifted.sendMessage(from, { video: { url: media }, caption: title }, { quoted: mek });
        await react("✅");
    } catch (e) { reply("Error downloading Snack Video."); }
});
