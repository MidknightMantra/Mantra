module.exports = {
    name: "take",
    react: "🏷️",
    category: "convert",
    description: "Resend quoted sticker/media as sticker with label",
    usage: ",take <packname|author> (reply to sticker/image/video)",
    aliases: ["steal"],

    execute: async (sock, m) => {
        const quoted = m.quoted || {};
        const hasSupportedMedia =
            Boolean(quoted.stickerMessage) ||
            Boolean(quoted.imageMessage) ||
            Boolean(quoted.videoMessage) ||
            Boolean(quoted.viewOnceMessage?.message?.imageMessage) ||
            Boolean(quoted.viewOnceMessage?.message?.videoMessage) ||
            Boolean(quoted.viewOnceMessageV2?.message?.imageMessage) ||
            Boolean(quoted.viewOnceMessageV2?.message?.videoMessage) ||
            Boolean(quoted.viewOnceMessageV2Extension?.message?.imageMessage) ||
            Boolean(quoted.viewOnceMessageV2Extension?.message?.videoMessage);

        if (!hasSupportedMedia) {
            await m.reply(`Reply to a sticker/image/video.\nUsage: ${m.prefix}take packname|author`);
            return;
        }

        const metadata = String(m.args?.join(" ") || "").trim();
        try {
            const buffer = await m.downloadQuoted();
            await sock.sendMessage(m.from, { sticker: buffer }, { quoted: m.raw });
            if (metadata) {
                await m.reply(`Sticker cloned (${metadata}).`);
            }
        } catch (err) {
            console.error("take error:", err?.message || err);
            await m.reply(`Failed to clone sticker: ${err?.message || err}`);
        }
    }
};
