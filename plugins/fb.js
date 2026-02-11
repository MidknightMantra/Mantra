const { fbdl } = require("ruhend-scraper");

function isFacebookUrl(value) {
    const text = String(value || "").trim().toLowerCase();
    return /^https?:\/\/(www\.|m\.|web\.)?(facebook\.com|fb\.watch)\//.test(text);
}

function pickBest(items) {
    const list = Array.isArray(items) ? items : [];
    if (!list.length) return null;

    return (
        list.find((i) => String(i?.resolution || "").includes("720p")) ||
        list.find((i) => String(i?.resolution || "").includes("360p")) ||
        list[0]
    );
}

module.exports = {
    name: "fb",
    react: "📘",
    category: "download",
    description: "Download Facebook videos",
    usage: ",fb <facebook_link>",
    aliases: ["facebook", "fbdl"],

    execute: async (sock, m) => {
        try {
            const link = String(m.args?.[0] || "").trim();
            if (!link) {
                await m.reply(`Please provide a valid Facebook link.\nUsage: ${m.prefix}fb <url>`);
                return;
            }

            if (!isFacebookUrl(link)) {
                await m.reply("Invalid Facebook link. Please send a valid Facebook URL.");
                return;
            }

            await m.react("🕒");

            let res;
            try {
                res = await fbdl(link);
            } catch (error) {
                console.error("fb fetch error:", error?.message || error);
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

            const data = pickBest(result);
            const video = String(data?.url || "").trim();
            if (!video) {
                await m.react("❌");
                await m.reply("No downloadable data found.");
                return;
            }

            const caption = "© MidknightMantra FB Downloader | Download with ease, cherish forever.";

            try {
                await sock.sendMessage(m.from, {
                    video: { url: video },
                    caption,
                    fileName: "fb.mp4",
                    mimetype: "video/mp4"
                });
            } catch (error) {
                console.error("fb send error:", error?.message || error);
                await m.react("❌");
                await m.reply("Error downloading video.");
                return;
            }

            await m.react("✅");
        } catch (e) {
            console.error("fb command error:", e?.message || e);
            try {
                await m.react("❌");
            } catch {}
            await m.reply(`${e?.message || e}`);
        }
    }
};
