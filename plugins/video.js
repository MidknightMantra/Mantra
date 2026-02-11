const { ytsearch, ytmp4 } = require("ruhend-scraper");

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

function formatVideoInfo(item, fromSearch = false) {
    const title = String(item?.title || "Unknown").trim();
    const duration = String(item?.duration || item?.durationH || "Unknown").trim();
    const views = String(item?.viewH || item?.views || item?.view || "Unknown").trim();
    const upload = String(item?.publishedTime || item?.upload || "Unknown").trim();
    const url = String(item?.url || "").trim();

    return [
        "*Video Found*",
        `Title: ${title}`,
        `Duration: ${duration}`,
        `Views: ${views}`,
        `Uploaded: ${upload}`,
        url ? `URL: ${url}` : null,
        fromSearch ? "_Matched from search query_" : null,
        "> Mantra Video"
    ]
        .filter(Boolean)
        .join("\n");
}

module.exports = {
    name: "video",
    react: "🎬",
    category: "download",
    description: "Download YouTube video as MP4",
    usage: ",video <title|youtube_url>",
    aliases: ["ytmp4", "vid"],

    execute: async (sock, m) => {
        try {
            const input = String((m.args || []).join(" ") || "").trim();
            if (!input) {
                await m.reply(`Please provide a YouTube link or title.\nUsage: ${m.prefix}video <title|url>`);
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
                result = await ytmp4(target);
            } catch (error) {
                console.error("[video] ytmp4 failed:", error?.message || error);
                await m.react("❌");
                await m.reply("Failed to fetch video stream.");
                return;
            }

            const videoUrl = String(result?.video || "").trim();
            if (!videoUrl) {
                console.error("[video] missing video url in response:", result);
                await m.react("❌");
                await m.reply("Video stream was not available.");
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
                    caption: formatVideoInfo(meta, fromSearch)
                });
            } else {
                await m.reply(formatVideoInfo(meta, fromSearch));
            }

            try {
                await sock.sendMessage(m.from, {
                    video: { url: videoUrl },
                    mimetype: "video/mp4"
                });
            } catch (error) {
                console.error("[video] video send failed:", error?.message || error);
                await m.react("❌");
                await m.reply("Could not send video message.");
                return;
            }

            try {
                const safeName = String(meta.title || "video").replace(/[\\/:*?"<>|]/g, "_");
                await sock.sendMessage(m.from, {
                    document: { url: videoUrl },
                    mimetype: "video/mp4",
                    fileName: `${safeName}.mp4`,
                    caption: "> Mantra"
                });
            } catch (error) {
                console.error("[video] document send failed:", error?.message || error);
            }

            await m.react("✅");
        } catch (e) {
            console.error("[video] command error:", e?.message || e);
            try {
                await m.react("❌");
            } catch {}
            await m.reply("Video download failed.");
        }
    }
};
