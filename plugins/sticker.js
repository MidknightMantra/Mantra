module.exports = {
    name: "sticker",
    react: "🧩",
    category: "convert",
    description: "Create sticker from quoted image/video",
    usage: ",sticker (reply to image/video)",
    aliases: ["s", "stiker"],

    execute: async (sock, m) => {
        const quoted = m.quoted || {};
        const hasSupportedMedia =
            Boolean(quoted.imageMessage) ||
            Boolean(quoted.videoMessage) ||
            Boolean(quoted.viewOnceMessage?.message?.imageMessage) ||
            Boolean(quoted.viewOnceMessage?.message?.videoMessage) ||
            Boolean(quoted.viewOnceMessageV2?.message?.imageMessage) ||
            Boolean(quoted.viewOnceMessageV2?.message?.videoMessage) ||
            Boolean(quoted.viewOnceMessageV2Extension?.message?.imageMessage) ||
            Boolean(quoted.viewOnceMessageV2Extension?.message?.videoMessage);

        if (!hasSupportedMedia) {
            await m.reply(`Reply to an image/video.\nUsage: ${m.prefix}sticker`);
            return;
        }

        try {
            const buffer = await m.downloadQuoted();
            await sock.sendMessage(m.from, { sticker: buffer }, { quoted: m.raw });
        } catch (err) {
            console.error("sticker error:", err?.message || err);
            await m.reply(`Failed to create sticker: ${err?.message || err}`);
        }
    }
};
