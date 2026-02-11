module.exports = {
    name: "togroupstatus",
    react: "📢",
    category: "group",
    description: "Send text or quoted media to group status (owner only)",
    usage: ",togroupstatus <text> or reply media",
    aliases: ["groupstatus", "statusgroup", "togcstatus"],

    execute: async (sock, m) => {
        try {
            if (!m.isGroup) return m.reply("Group only command.");
            if (!m.isOwner) return m.reply("Owner only command.");

            const caption = String(m.args?.join(" ") || "").trim();
            const quoted = m.quoted || null;

            const payload = { groupStatusMessage: {} };

            if (!quoted && !caption) {
                await m.reply(
                    "Usage:\n• ,togroupstatus <text>\n• Reply to image/video/audio/document/sticker with ,togroupstatus [caption]"
                );
                return;
            }

            if (quoted?.imageMessage) {
                const buffer = await m.downloadQuoted();
                payload.groupStatusMessage.image = buffer;
                if (caption) payload.groupStatusMessage.caption = caption;
            } else if (quoted?.videoMessage) {
                const buffer = await m.downloadQuoted();
                payload.groupStatusMessage.video = buffer;
                if (caption) payload.groupStatusMessage.caption = caption;
            } else if (quoted?.audioMessage) {
                const buffer = await m.downloadQuoted();
                payload.groupStatusMessage.audio = buffer;
            } else if (quoted?.documentMessage) {
                const buffer = await m.downloadQuoted();
                payload.groupStatusMessage.document = buffer;
                payload.groupStatusMessage.fileName = quoted.documentMessage?.fileName || "document";
                payload.groupStatusMessage.mimetype =
                    quoted.documentMessage?.mimetype || "application/octet-stream";
                if (caption) payload.groupStatusMessage.caption = caption;
            } else if (quoted?.stickerMessage) {
                const buffer = await m.downloadQuoted();
                payload.groupStatusMessage.sticker = buffer;
            } else {
                payload.groupStatusMessage.text =
                    caption ||
                    quoted?.conversation ||
                    quoted?.extendedTextMessage?.text ||
                    "";
            }

            if (!Object.keys(payload.groupStatusMessage).length) {
                return m.reply("Unsupported content for group status.");
            }

            if (!payload.groupStatusMessage.text && !payload.groupStatusMessage.caption && caption) {
                payload.groupStatusMessage.caption = caption;
            }

            await sock.sendMessage(m.from, payload, { quoted: m.raw });
            await m.reply("✅ Sent to group status.");
        } catch (e) {
            console.error("togroupstatus error:", e?.message || e);
            await m.reply(`❌ Failed to send group status: ${e?.message || e}`);
        }
    }
};

