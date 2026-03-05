const axios = require("axios");

async function shortenUrl(url) {
    // Provider 1: is.gd (free, no API key)
    try {
        const res = await axios.get(`https://is.gd/create.php?format=json&url=${encodeURIComponent(url)}`, { timeout: 10000 });
        if (res.data?.shorturl) return { short: res.data.shorturl, provider: "is.gd" };
    } catch { }

    // Provider 2: v.gd (backup of is.gd)
    try {
        const res = await axios.get(`https://v.gd/create.php?format=json&url=${encodeURIComponent(url)}`, { timeout: 10000 });
        if (res.data?.shorturl) return { short: res.data.shorturl, provider: "v.gd" };
    } catch { }

    // Provider 3: tinyurl
    try {
        const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, { timeout: 10000 });
        if (res.data && String(res.data).startsWith("http")) return { short: String(res.data).trim(), provider: "tinyurl" };
    } catch { }

    throw new Error("All URL shortening services failed. Try again later.");
}

module.exports = {
    name: "short",
    react: "🔗",
    category: "tools",
    description: "Shorten a URL",
    usage: ",short <URL>",
    aliases: ["shorten", "shorturl", "tinyurl", "bitly"],

    execute: async (_sock, m) => {
        const url = String(m.args?.[0] || "").trim();

        if (!url) {
            return m.reply(`🔗 Shorten a URL.\nUsage: ${m.prefix}short <URL>`);
        }

        if (!/^https?:\/\//i.test(url)) {
            return m.reply("Please provide a valid URL starting with http:// or https://");
        }

        await m.react("⏳");

        try {
            const result = await shortenUrl(url);
            await m.react("✅");
            await m.reply(
                `🔗 *URL Shortened*\n\n` +
                `Original: ${url}\n` +
                `Short: ${result.short}\n` +
                `Provider: ${result.provider}\n\n` +
                `> *Mantra*`
            );
        } catch (err) {
            await m.react("❌");
            await m.reply(`❌ ${err.message}`);
        }
    }
};
