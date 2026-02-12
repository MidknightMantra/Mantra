const { WAProto, downloadMediaMessage } = require("gifted-baileys");
const fs = require("fs");
const path = require("path");

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

    if (message.imageMessage) return { type: "image", meta: message.imageMessage };
    if (message.videoMessage) return { type: "video", meta: message.videoMessage };
    if (message.ptvMessage) return { type: "video", meta: message.ptvMessage };
    if (message.audioMessage) return { type: "audio", meta: message.audioMessage };
    if (message.stickerMessage) return { type: "sticker", meta: message.stickerMessage };
    if (message.documentMessage) return { type: "document", meta: message.documentMessage };

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

function extFromMedia(type, meta) {
    const mime = String(meta?.mimetype || "").toLowerCase();
    if (type === "image") {
        if (mime.includes("png")) return ".png";
        if (mime.includes("webp")) return ".webp";
        return ".jpg";
    }
    if (type === "video") return ".mp4";
    if (type === "audio") return mime.includes("ogg") ? ".ogg" : ".mp3";
    if (type === "sticker") return ".webp";

    const name = String(meta?.fileName || "");
    const ext = path.extname(name);
    return ext || ".bin";
}

async function downloadDeletedMedia(sock, cached) {
    const media = getDeletedMediaMeta(cached);
    if (!media) return null;

    const sourceKey = cached?.raw?.key;
    const sourceMessage = cached?.raw?.message;
    if (!sourceKey || !sourceMessage) return { media, buffer: null };

    const buffer = await downloadMediaMessage(
        { key: sourceKey, message: sourceMessage },
        "buffer",
        {},
        { reuploadRequest: sock.updateMediaMessage }
    );

    if (!buffer || !Buffer.isBuffer(buffer) || !buffer.length) return { media, buffer: null };
    return { media, buffer };
}

function buildSendPayload(media, buffer) {
    const caption = String(media.meta?.caption || "").trim() || undefined;

    if (media.type === "image") return { image: buffer, caption };
    if (media.type === "video") return { video: buffer, caption };
    if (media.type === "audio") {
        return {
            audio: buffer,
            mimetype: String(media.meta?.mimetype || "audio/mpeg"),
            ptt: Boolean(media.meta?.ptt)
        };
    }
    if (media.type === "sticker") return { sticker: buffer };
    if (media.type === "document") {
        return {
            document: buffer,
            mimetype: String(media.meta?.mimetype || "application/octet-stream"),
            fileName: String(media.meta?.fileName || "deleted-document")
        };
    }

    return null;
}

function saveDeletedMediaFile(deletedMessageId, media, buffer) {
    if (!deletedMessageId || !media || !Buffer.isBuffer(buffer) || !buffer.length) return "";

    const dir = path.resolve("deleted_media");
    try {
        fs.mkdirSync(dir, { recursive: true });
    } catch {}

    const ext = extFromMedia(media.type, media.meta);
    const safeId = String(deletedMessageId).replace(/[^A-Za-z0-9_-]/g, "_");
    const filePath = path.join(dir, `${safeId}${ext}`);

    try {
        fs.writeFileSync(filePath, buffer);
        return filePath;
    } catch {
        return "";
    }
}

function buildTargets(sock, cached) {
    const originalChat = normalizeJid(cached?.from) || "unknown";
    const isGroupChat = originalChat.endsWith("@g.us");

    const targets = [];
    const selfJid = getSelfJid(sock.user?.id);
    if (selfJid) targets.push(selfJid);
    if (isGroupChat && originalChat !== "unknown") targets.push(originalChat);

    return { originalChat, isGroupChat, targets };
}

module.exports = {
    name: "antidelete",
    react: "🧹",
    category: "security",
    description: "Toggle anti-delete to restore revoked messages (logs to database.json)",
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

        mantra.settings.antidelete = state === "on";
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

            const { originalChat, targets } = buildTargets(sock, cached);
            if (!targets.length) continue;

            const body = describeDeletedContent(cached);

            let downloaded = null;
            try {
                downloaded = await downloadDeletedMedia(sock, cached);
            } catch (err) {
                console.error("[antidelete] media download error:", err?.message || err);
                downloaded = null;
            }

            const mediaType = downloaded?.media?.type || "";
            const mimetype = String(downloaded?.media?.meta?.mimetype || "");
            const filePath = downloaded?.buffer
                ? saveDeletedMediaFile(deletedMessageId, downloaded.media, downloaded.buffer)
                : "";

            if (typeof mantra?.logDeleted === "function") {
                try {
                    mantra.logDeleted({
                        id: deletedMessageId,
                        deletedAt: Date.now(),
                        from: originalChat,
                        sender: cached.sender,
                        body,
                        contentType: cached.contentType,
                        mediaType,
                        mimetype,
                        filePath
                    });
                } catch {}
            }

            const notice = [
                "*Deleted Message Detected*",
                "",
                `From: ${cached.sender}`,
                `Chat: ${originalChat}`,
                "",
                "Message:",
                body
            ].join("\n");

            const payload = downloaded?.media && Buffer.isBuffer(downloaded.buffer) && downloaded.buffer.length
                ? buildSendPayload(downloaded.media, downloaded.buffer)
                : null;

            for (const targetJid of targets) {
                try {
                    await sock.sendMessage(targetJid, { text: notice });
                } catch (err) {
                    console.error(`[antidelete] notice send failed (${targetJid}):`, err?.message || err);
                    continue;
                }

                if (!payload) continue;
                try {
                    await sock.sendMessage(targetJid, payload);
                } catch (err) {
                    console.error(`[antidelete] media resend failed (${targetJid}):`, err?.message || err);
                }
            }
        }
    }
};

