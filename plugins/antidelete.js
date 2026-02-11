const { WAProto, downloadMediaMessage } = require("gifted-baileys");

const REVOKE_STUB_TYPE = Number(WAProto?.WebMessageInfo?.StubType?.REVOKE ?? 1);
const REVOKE_PROTOCOL_TYPE = Number(WAProto?.Message?.ProtocolMessage?.Type?.REVOKE ?? 0);

function normalizeJid(jid) {
    const value = String(jid || "").trim();
    if (!value) return "";
    const atIndex = value.indexOf("@");
    if (atIndex < 0) return value;

    const left = value.slice(0, atIndex).split(":")[0];
    const right = value.slice(atIndex + 1);
    return `${left}@${right}`;
}

function getSelfJid(userId) {
    const raw = String(userId || "").trim();
    if (!raw) return "";

    const [userPart = "", serverPart = "s.whatsapp.net"] = raw.split("@");
    const user = userPart.split(":")[0];
    if (!user) return "";

    return `${user}@${serverPart || "s.whatsapp.net"}`;
}

function pickDeletedMessageId(update) {
    const protocol = update?.update?.message?.protocolMessage;
    if (Number(protocol?.type) === REVOKE_PROTOCOL_TYPE && protocol?.key?.id) {
        return String(protocol.key.id);
    }

    if (Number(update?.update?.messageStubType) === REVOKE_STUB_TYPE) {
        return String(update?.key?.id || "");
    }

    return "";
}

function unwrapMessageForMedia(message) {
    let current = message || null;
    let guard = 0;

    while (current && guard < 12) {
        guard += 1;

        if (current.ephemeralMessage?.message) {
            current = current.ephemeralMessage.message;
            continue;
        }
        if (current.documentWithCaptionMessage?.message) {
            current = current.documentWithCaptionMessage.message;
            continue;
        }
        if (current.viewOnceMessage?.message) {
            current = current.viewOnceMessage.message;
            continue;
        }
        if (current.viewOnceMessageV2?.message) {
            current = current.viewOnceMessageV2.message;
            continue;
        }
        if (current.viewOnceMessageV2Extension?.message) {
            current = current.viewOnceMessageV2Extension.message;
            continue;
        }

        break;
    }

    return current;
}

function getDeletedMediaMeta(cached) {
    const message = unwrapMessageForMedia(cached?.raw?.message || null);
    if (!message) return null;

    if (message.imageMessage) {
        return { type: "image", meta: message.imageMessage };
    }
    if (message.videoMessage) {
        return { type: "video", meta: message.videoMessage };
    }
    if (message.audioMessage) {
        return { type: "audio", meta: message.audioMessage };
    }
    if (message.stickerMessage) {
        return { type: "sticker", meta: message.stickerMessage };
    }
    if (message.documentMessage) {
        return { type: "document", meta: message.documentMessage };
    }

    return null;
}

function describeDeletedContent(cached) {
    const text = String(cached?.body || "").trim();
    if (text) return text;

    const contentType = String(cached?.contentType || "").toLowerCase();
    if (contentType.includes("image")) return "[image]";
    if (contentType.includes("video")) return "[video]";
    if (contentType.includes("audio")) return "[audio]";
    if (contentType.includes("sticker")) return "[sticker]";
    if (contentType.includes("document")) return "[document]";

    const media = getDeletedMediaMeta(cached);
    if (media?.type) return `[${media.type}]`;

    return "[media]";
}

async function resendDeletedMedia(sock, targetJid, cached) {
    const media = getDeletedMediaMeta(cached);
    if (!media) return false;

    const sourceKey = cached?.raw?.key;
    const sourceMessage = cached?.raw?.message;
    if (!sourceKey || !sourceMessage) return false;

    const buffer = await downloadMediaMessage(
        { key: sourceKey, message: sourceMessage },
        "buffer",
        {},
        { reuploadRequest: sock.updateMediaMessage }
    );

    if (!buffer || !Buffer.isBuffer(buffer) || !buffer.length) return false;

    const caption = String(media.meta?.caption || "").trim() || undefined;

    if (media.type === "image") {
        await sock.sendMessage(targetJid, { image: buffer, caption });
        return true;
    }

    if (media.type === "video") {
        await sock.sendMessage(targetJid, { video: buffer, caption });
        return true;
    }

    if (media.type === "audio") {
        await sock.sendMessage(targetJid, {
            audio: buffer,
            mimetype: String(media.meta?.mimetype || "audio/mpeg"),
            ptt: Boolean(media.meta?.ptt)
        });
        return true;
    }

    if (media.type === "sticker") {
        await sock.sendMessage(targetJid, { sticker: buffer });
        return true;
    }

    if (media.type === "document") {
        await sock.sendMessage(targetJid, {
            document: buffer,
            mimetype: String(media.meta?.mimetype || "application/octet-stream"),
            fileName: String(media.meta?.fileName || "deleted-document")
        });
        return true;
    }

    return false;
}

module.exports = {
    name: "antidelete",
    react: "🧹",
    category: "security",
    description: "Toggle anti-delete to restore revoked messages",
    usage: ",antidelete on|off",
    aliases: ["ad", "undelete"],

    execute: async (_sock, m, mantra) => {
        const state = String(m.args?.[0] || "").trim().toLowerCase();

        if (!state) {
            await m.reply(`AntiDelete is ${mantra.settings.antidelete ? "ON" : "OFF"}\nUsage: ,antidelete on|off`);
            return;
        }

        if (!["on", "off"].includes(state)) {
            await m.reply("Usage: ,antidelete on|off");
            return;
        }

        if (state === "on") mantra.settings.antidelete = true;
        if (state === "off") mantra.settings.antidelete = false;

        mantra.saveSettings();
        await m.reply(`AntiDelete is now ${mantra.settings.antidelete ? "ON" : "OFF"}`);
    },

    onMessageUpdate: async (sock, updates, mantra) => {
        if (!mantra.settings.antidelete) return;

        for (const update of updates) {
            const deletedMessageId = pickDeletedMessageId(update);
            if (!deletedMessageId) continue;

            const cached = mantra.messageStore.get(deletedMessageId);
            if (!cached) continue;
            if (cached?.fromMe || cached?.raw?.key?.fromMe) continue;

            const targetJid = getSelfJid(sock.user?.id);
            if (!targetJid) continue;

            const originalChat = normalizeJid(cached?.from) || "unknown";
            const text = [
                "🗑️ *Deleted Message Detected*",
                "",
                `*From:* ${cached.sender}`,
                `*Chat:* ${originalChat}`,
                "",
                "*Message:*",
                describeDeletedContent(cached)
            ].join("\n");

            await sock.sendMessage(targetJid, { text });

            try {
                await resendDeletedMedia(sock, targetJid, cached);
            } catch (mediaError) {
                console.error("antidelete media resend error:", mediaError?.message || mediaError);
            }
        }
    }
};