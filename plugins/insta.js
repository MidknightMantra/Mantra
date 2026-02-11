const { igdl } = require("ruhend-scraper");

function isInstagramUrl(value) {
    const text = String(value || "").trim().toLowerCase();
    return /^https?:\/\/(www\.)?instagram\.com\//.test(text);
}

function pickBestMedia(items) {
    const list = Array.isArray(items) ? items : [];
    if (!list.length) return null;

    const byResolution = list.find((i) => String(i?.resolution || "").includes("720p"))
        || list.find((i) => String(i?.resolution || "").includes("360p"));

    return byResolution || list[0];
}

function getMediaUrl(item) {
    if (!item) return "";
    if (typeof item === "string") return item;
    return String(item.url || "").trim();
}

function isImageUrl(url, typeHint) {
    const lowerType = String(typeHint || "").toLowerCase();
    if (lowerType.includes("image")) return true;
    return /\.(jpg|jpeg|png|webp)(\?|$)/i.test(String(url || ""));
}

module.exports = {
    name: "ig",
    react: "📸",
    category: "download",
    description: "Download Instagram media",
    usage: ",ig <instagram_link>",
    aliases: ["insta", "instagram"],

    execute: async (sock, m) => {
        try {
            const link = String(m.args?.[0] || "").trim();
            if (!link) {
                await m.reply(`Please give a valid Instagram link.\nUsage: ${m.prefix}ig <url>`);
                return;
            }

            if (!isInstagramUrl(link)) {
                await m.reply("Invalid Instagram link. Please send a valid Instagram URL.");
                return;
            }

            await m.react("🕒");

            let res;
            try {
                res = await igdl(link);
            } catch (error) {
                console.error("instagram fetch error:", error?.message || error);
                await m.react("❌");
                await m.reply("Error obtaining data.");
                return;
            }

            const result = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
            if (!result.length) {
                await m.react("❌");
                await m.reply("No result found.");
                return;
            }

            const selected = pickBestMedia(result);
            const mediaUrl = getMediaUrl(selected);

            if (!mediaUrl) {
                await m.react("❌");
                await m.reply("No downloadable media found.");
                return;
            }

            const dev = "> ©Mantra\n\nDownload with ease, cherish forever.";

            try {
                if (isImageUrl(mediaUrl, selected?.type)) {
                    await sock.sendMessage(m.from, {
                        image: { url: mediaUrl },
                        caption: dev
                    });
                } else {
                    await sock.sendMessage(m.from, {
                        video: { url: mediaUrl },
                        caption: dev,
                        fileName: "ig.mp4",
                        mimetype: "video/mp4"
                    });
                }
            } catch (error) {
                console.error("instagram send error:", error?.message || error);
                await m.react("❌");
                await m.reply("Error downloading media.");
                return;
            }

            await m.react("✅");
        } catch (e) {
            console.error("instagram command error:", e?.message || e);
            try {
                await m.react("❌");
            } catch {}
            await m.reply(`${e?.message || e}`);
        }
    }
};
