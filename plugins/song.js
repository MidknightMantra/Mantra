const { ytsearch, ytmp3 } = require("ruhend-scraper");

function isUrl(value) {
    return /^https?:\/\//i.test(String(value || "").trim());
}

function isYouTubeUrl(value) {
    return /(?:youtube\.com|youtu\.be)/i.test(String(value || ""));
}

function pickFirstVideo(result) {
    const list = Array.isArray(result?.video) ? result.video : [];
    return list[0] || null;
}

function formatSongInfo(item, fromSearch = false) {
    const title = String(item?.title || "Unknown").trim();
    const duration = String(item?.duration || item?.durationH || "Unknown").trim();
    const views = String(item?.viewH || item?.views || item?.view || "Unknown").trim();
    const upload = String(item?.publishedTime || item?.upload || "Unknown").trim();
    const url = String(item?.url || "").trim();

    return [
        "*Song Found*",
        `Title: ${title}`,
        `Duration: ${duration}`,
        `Views: ${views}`,
        `Uploaded: ${upload}`,
        url ? `URL: ${url}` : null,
        fromSearch ? "_Matched from search query_" : null,
        "> Mantra Music"
    ]
        .filter(Boolean)
        .join("\n");
}

module.exports = {
    name: "song",
    react: "🎵",
    category: "download",
    description: "Download YouTube audio as MP3",
    usage: ",song <title|youtube_url>",
    aliases: ["play", "ytmp3", "audio"],

    execute: async (sock, m) => {
        try {
            const input = String((m.args || []).join(" ") || "").trim();
            if (!input) {
                await m.reply(`Please provide a YouTube link or title.\nUsage: ${m.prefix}song <title|url>`);
                return;
            }

            await m.react("⏳");

            let target = input;
            let item = null;
            let fromSearch = false;

            if (!isUrl(input)) {
                fromSearch = true;
                const search = await ytsearch(input);
                item = pickFirstVideo(search);
                if (!item?.url) {
                    await m.react("❌");
                    await m.reply("No YouTube results found for that query.");
                    return;
                }
                target = item.url;
            } else if (!isYouTubeUrl(input)) {
                await m.react("❌");
                await m.reply("Only YouTube links are supported for this command.");
                return;
            }

            let result;
            try {
                result = await ytmp3(target);
            } catch (error) {
                console.error("[song] ytmp3 failed:", error?.message || error);
                await m.react("❌");
                await m.reply("Failed to fetch audio stream.");
                return;
            }

            const audioUrl = String(result?.audio_2 || result?.audio || "").trim();
            if (!audioUrl) {
                console.error("[song] missing audio url in response:", result);
                await m.react("❌");
                await m.reply("Audio stream was not available.");
                return;
            }

            const meta = {
                title: result?.title || item?.title,
                duration: result?.duration || item?.duration,
                views: result?.views || item?.viewH || item?.view,
                upload: result?.upload || item?.publishedTime,
                url: target,
                thumbnail: result?.thumbnail || item?.thumbnail
            };

            if (meta.thumbnail) {
                await sock.sendMessage(m.from, {
                    image: { url: meta.thumbnail },
                    caption: formatSongInfo(meta, fromSearch)
                });
            } else {
                await m.reply(formatSongInfo(meta, fromSearch));
            }

            try {
                await sock.sendMessage(m.from, {
                    audio: { url: audioUrl },
                    mimetype: "audio/mpeg"
                });
            } catch (error) {
                console.error("[song] audio send failed:", error?.message || error);
                await m.react("❌");
                await m.reply("Could not send audio message.");
                return;
            }

            try {
                const safeName = String(meta.title || "song").replace(/[\\/:*?"<>|]/g, "_");
                await sock.sendMessage(m.from, {
                    document: { url: audioUrl },
                    mimetype: "audio/mpeg",
                    fileName: `${safeName}.mp3`,
                    caption: "> Mantra"
                });
            } catch (error) {
                console.error("[song] document send failed:", error?.message || error);
            }

            await m.react("✅");
        } catch (e) {
            console.error("[song] command error:", e?.message || e);
            try {
                await m.react("❌");
            } catch {}
            await m.reply("Song download failed.");
        }
    }
};
