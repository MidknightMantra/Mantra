const { downloadMediaMessage } = require("gifted-baileys");
const { ytmp3 } = require("ruhend-scraper");
const axios = require("axios");

function isUrl(value) {
    return /^https?:\/\//i.test(String(value || "").trim());
}

function isYouTubeUrl(value) {
    return /(?:youtube\.com|youtu\.be)/i.test(String(value || ""));
}

function getMimetype(msg) {
    return (
        msg?.videoMessage?.mimetype ||
        msg?.audioMessage?.mimetype ||
        msg?.documentMessage?.mimetype ||
        msg?.imageMessage?.mimetype ||
        ""
    );
}

async function convertViaGiftedApi(url) {
    const endpoint = `https://api.giftedtech.co.ke/api/download/toaudio?apikey=gifted&url=${encodeURIComponent(url)}`;
    const res = await axios.get(endpoint, { timeout: 60000 });
    const audioUrl = res.data?.audio || res.data?.result?.audio || res.data?.url;
    if (!audioUrl) throw new Error("No audio URL in Gifted API response");
    return audioUrl;
}

module.exports = {
    name: "toaudio",
    react: "🎧",
    category: "tools",
    description: "Convert video/YouTube to audio (MP3). Reply to video or send a YouTube link.",
    usage: ",toaudio [youtube_url]",
    aliases: ["tomp3", "converttaudio", "extractaudio", "mp3"],

    execute: async (sock, m) => {
        const input = String((m.args || []).join(" ") || "").trim();
        const quoted = m.quoted;

        // ── Case 1: YouTube URL provided ─────────────────────────────────────
        if (input && isUrl(input)) {
            if (!isYouTubeUrl(input)) {
                await m.reply("Only YouTube URLs are supported for direct conversion.");
                return;
            }

            await m.react("⏳");
            try {
                // Try ruhend-scraper ytmp3 first
                const result = await ytmp3(input);
                const audioUrl = String(result?.audio_2 || result?.audio || "").trim();
                if (!audioUrl) throw new Error("No audio URL from ytmp3");

                const title = String(result?.title || "audio").replace(/[\\/:*?"<>|]/g, "_");

                await sock.sendMessage(m.from, {
                    audio: { url: audioUrl },
                    mimetype: "audio/mpeg",
                    ptt: false
                }, { quoted: m.raw });

                await sock.sendMessage(m.from, {
                    document: { url: audioUrl },
                    mimetype: "audio/mpeg",
                    fileName: `${title}.mp3`,
                    caption: `🎧 ${title}\n\n> *Mantra*`
                });

                await m.react("✅");
                return;
            } catch (err) {
                console.error("[toaudio] ytmp3 failed, trying gifted api:", err?.message);
            }

            try {
                const audioUrl = await convertViaGiftedApi(input);
                await sock.sendMessage(m.from, {
                    audio: { url: audioUrl },
                    mimetype: "audio/mpeg",
                    ptt: false
                }, { quoted: m.raw });
                await m.react("✅");
                return;
            } catch (err) {
                await m.react("❌");
                await m.reply(`❌ Conversion failed: ${err?.message || "Unknown error"}`);
            }
            return;
        }

        // ── Case 2: Reply to a video/audio message ────────────────────────────
        if (quoted) {
            const mimetype = getMimetype(quoted);
            const isVideo = mimetype.startsWith("video/");
            const isAudio = mimetype.startsWith("audio/");

            if (!isVideo && !isAudio) {
                await m.reply("Please reply to a video or audio message to convert.");
                return;
            }

            await m.react("⏳");
            try {
                const buffer = await m.downloadQuoted();

                // Send as audio (PTT voice note for audio, regular audio for video)
                await sock.sendMessage(m.from, {
                    audio: buffer,
                    mimetype: "audio/mpeg",
                    ptt: false
                }, { quoted: m.raw });

                await m.react("✅");
                await m.reply("🎧 Converted and sent as audio file!");
            } catch (err) {
                console.error("[toaudio] conversion from media failed:", err?.message || err);
                await m.react("❌");
                await m.reply(`❌ Conversion failed: ${err?.message || "Unknown error"}`);
            }
            return;
        }

        // ── No input ──────────────────────────────────────────────────────────
        await m.reply(
            `🎧 *To Audio Converter*\n\n` +
            `Usage:\n` +
            `• ${m.prefix}toaudio <youtube_url> — extract audio from YouTube\n` +
            `• Reply to a video/audio with ${m.prefix}toaudio — extract audio\n\n` +
            `> *Mantra*`
        );
    }
};
