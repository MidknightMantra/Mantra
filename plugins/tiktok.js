const axios = require("axios");
const { ttdl } = require("ruhend-scraper");

function isTikTokUrl(value) {
    const text = String(value || "").trim().toLowerCase();
    return /^https?:\/\/(www\.)?(vm|vt|m|www)?\.?tiktok\.com\//.test(text);
}

function looksLikeUrl(value) {
    return /^https?:\/\//i.test(String(value || "").trim());
}

function collectUrls(input, bucket = []) {
    if (!input) return bucket;

    if (typeof input === "string") {
        if (looksLikeUrl(input)) bucket.push(input.trim());
        return bucket;
    }

    if (Array.isArray(input)) {
        for (const item of input) collectUrls(item, bucket);
        return bucket;
    }

    if (typeof input === "object") {
        const directKeys = ["url", "src", "play", "hdplay", "wmplay", "video", "download_url", "downloadUrl"];
        for (const key of directKeys) {
            if (input[key]) collectUrls(input[key], bucket);
        }

        const arrayKeys = [
            "images",
            "photos",
            "photo",
            "image",
            "url_list",
            "urlList",
            "display_image",
            "owner_watermark_image",
            "thumbnail",
            "cover",
            "image_post_info"
        ];
        for (const key of arrayKeys) {
            if (input[key]) collectUrls(input[key], bucket);
        }
    }

    return bucket;
}

function uniqueUrls(urls) {
    const out = [];
    const seen = new Set();
    for (const url of urls) {
        const clean = String(url || "").trim();
        if (!looksLikeUrl(clean)) continue;
        if (seen.has(clean)) continue;
        seen.add(clean);
        out.push(clean);
    }
    return out;
}

function extractMedia(data) {
    const title = String(data?.title || "TikTok").trim();
    const author = String(data?.author || data?.username || "").trim();

    const videoCandidates = uniqueUrls([
        data?.video,
        data?.video_hd,
        data?.video_wm,
        data?.play,
        data?.hdplay,
        data?.wmplay
    ]);
    const video = videoCandidates[0] || "";

    const imageCandidates = uniqueUrls(
        collectUrls([
            data?.images,
            data?.photos,
            data?.photo,
            data?.image,
            data?.image_post_info
        ])
    );

    return { title, author, video, images: imageCandidates };
}

async function fetchTikWmFallback(link) {
    const payload = new URLSearchParams({
        url: link,
        count: "12",
        cursor: "0",
        web: "1",
        hd: "1"
    });

    const response = await axios.post("https://www.tikwm.com/api/", payload.toString(), {
        timeout: 20000,
        headers: {
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            accept: "application/json, text/javascript, */*; q=0.01",
            origin: "https://www.tikwm.com",
            referer: "https://www.tikwm.com/"
        }
    });

    const root = response?.data || {};
    const data = root?.data || root;
    return extractMedia(data);
}

module.exports = {
    name: "tt",
    react: "🎬",
    category: "download",
    description: "Download TikTok video or photo posts",
    usage: ",tt <tiktok_link>",
    aliases: ["tiktok", "ttdl"],

    execute: async (sock, m) => {
        try {
            const link = String(m.args?.[0] || "").trim();
            if (!link) {
                await m.reply(`Please provide a valid TikTok link.\nUsage: ${m.prefix}tt <url>`);
                return;
            }

            if (!isTikTokUrl(link)) {
                await m.reply("Invalid TikTok link. Send a valid TikTok URL.");
                return;
            }

            await m.react("🕒");

            let media = { title: "TikTok", author: "", video: "", images: [] };
            try {
                media = extractMedia(await ttdl(link));
            } catch (error) {
                console.error("tiktok ttdl fetch error:", error?.message || error);
            }

            if (!media.video && media.images.length === 0) {
                try {
                    media = await fetchTikWmFallback(link);
                } catch (error) {
                    console.error("tiktok fallback fetch error:", error?.response?.data || error?.message || error);
                }
            }

            const captionBase = [
                `Title: ${media.title || "TikTok"}`,
                media.author ? `Author: ${media.author}` : null,
                "> *Mantra TikTok Downloader*"
            ]
                .filter(Boolean)
                .join("\n");

            if (media.video) {
                await sock.sendMessage(
                    m.from,
                    {
                        video: { url: media.video },
                        caption: captionBase,
                        fileName: "tt.mp4",
                        mimetype: "video/mp4"
                    }
                );
                await m.react("✅");
                return;
            }

            if (media.images.length > 0) {
                for (let i = 0; i < media.images.length; i += 1) {
                    const imgUrl = media.images[i];
                    const caption = i === 0
                        ? `${captionBase}\nType: Photo post (${media.images.length} images)`
                        : `Photo ${i + 1}/${media.images.length}`;

                    await sock.sendMessage(m.from, {
                        image: { url: imgUrl },
                        caption
                    });
                }
                await m.react("✅");
                return;
            }

            await m.react("❌");
            await m.reply("No downloadable media found for this TikTok.");
        } catch (e) {
            console.error("tiktok command error:", e?.message || e);
            try {
                await m.react("❌");
            } catch {}
            await m.reply("Error downloading TikTok media.");
        }
    }
};
