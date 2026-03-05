const axios = require("axios");

module.exports = {
    name: "ss",
    react: "📸",
    category: "tools",
    description: "Take a screenshot of a website",
    usage: ",ss <URL>",
    aliases: ["screenshot", "webss", "screencapture"],

    execute: async (sock, m) => {
        let url = String(m.args?.[0] || "").trim();

        if (!url) {
            return m.reply(`📸 Take a website screenshot.\nUsage: ${m.prefix}ss <URL>`);
        }

        // Auto-prepend https:// if missing
        if (!/^https?:\/\//i.test(url)) {
            url = "https://" + url;
        }

        await m.react("⏳");

        const providers = [
            // Provider 1: microlink
            async () => {
                const res = await axios.get(
                    `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`,
                    { timeout: 20000 }
                );
                const ssUrl = res.data?.data?.screenshot?.url;
                if (!ssUrl) throw new Error("No screenshot URL");
                return ssUrl;
            },
            // Provider 2: screenshotlayer via Gifted
            async () => {
                const res = await axios.get(
                    `https://api.giftedtech.co.ke/api/tools/screenshot?apikey=gifted&url=${encodeURIComponent(url)}`,
                    { timeout: 20000 }
                );
                const ssUrl = res.data?.url || res.data?.result;
                if (!ssUrl) throw new Error("No screenshot URL");
                return ssUrl;
            },
            // Provider 3: thum.io (free)
            async () => {
                return `https://image.thum.io/get/width/1280/crop/720/noanimate/${encodeURIComponent(url)}`;
            }
        ];

        for (const provider of providers) {
            try {
                const ssUrl = await provider();

                await sock.sendMessage(m.from, {
                    image: { url: ssUrl },
                    caption: `📸 *Screenshot*\n\n🌐 ${url}\n\n> *Mantra*`
                }, { quoted: m.raw });

                await m.react("✅");
                return;
            } catch (err) {
                console.error("[ss] provider failed:", err?.message || err);
            }
        }

        await m.react("❌");
        await m.reply(`❌ Failed to screenshot ${url}. Check the URL and try again.`);
    }
};
