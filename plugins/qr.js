const axios = require("axios");

module.exports = {
    name: "qr",
    react: "📱",
    category: "tools",
    description: "Generate a QR code from text or URL",
    usage: ",qr <text or URL>",
    aliases: ["qrcode", "makeqr", "genqr"],

    execute: async (sock, m) => {
        const text = (m.args || []).join(" ").trim() || (m.quoted?.conversation || m.quoted?.extendedTextMessage?.text || "").trim();

        if (!text) {
            return m.reply(`📱 Generate a QR code.\nUsage: ${m.prefix}qr <text or URL>`);
        }

        if (text.length > 1000) {
            return m.reply("⚠️ Text too long. Maximum 1000 characters.");
        }

        await m.react("⏳");

        try {
            // Use quickchart.io (no API key needed)
            const qrUrl = `https://quickchart.io/qr?text=${encodeURIComponent(text)}&size=512&format=png`;

            await sock.sendMessage(m.from, {
                image: { url: qrUrl },
                caption: `📱 *QR Code Generated*\n\nContent: ${text.length > 100 ? text.slice(0, 100) + "…" : text}\n\n> *Mantra*`
            }, { quoted: m.raw });

            await m.react("✅");
        } catch (err) {
            console.error("[qr] error:", err?.message || err);
            await m.react("❌");
            await m.reply(`❌ QR generation failed: ${err?.message || "Unknown error"}`);
        }
    }
};
