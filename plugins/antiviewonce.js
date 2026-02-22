const { downloadMediaMessage, downloadContentFromMessage } = require("gifted-baileys");

function toSelfJid(userId) {
    const raw = String(userId || "").trim();
    if (!raw) return "";
    const [left = "", right = "s.whatsapp.net"] = raw.split("@");
    const user = left.split(":")[0];
    if (!user) return "";
    return `${user}@${right || "s.whatsapp.net"}`;
}

function toSelfLid(userId) {
    const raw = String(userId || "").trim();
    if (!raw) return "";
    const [left = ""] = raw.split("@");
    const user = left.split(":")[0];
    if (!user) return "";
    return `${user}@lid`;
}

function unwrapViewOnce(message) {
    let current = message && typeof message === "object" ? message : {};
    let isViewOnce = false;
    let guard = 0;

    while (current && guard < 14) {
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
            isViewOnce = true;
            continue;
        }
        if (current.viewOnceMessageV2?.message) {
            current = current.viewOnceMessageV2.message;
            isViewOnce = true;
            continue;
        }
        if (current.viewOnceMessageV2Extension?.message) {
            current = current.viewOnceMessageV2Extension.message;
            isViewOnce = true;
            continue;
        }
        break;
    }

    return { message: current, isViewOnce };
}

function detectViewOnceMedia(rawMessage) {
    const { message, isViewOnce } = unwrapViewOnce(rawMessage);
    if (!isViewOnce || !message || typeof message !== "object") return null;

    const image = message.imageMessage;
    if (image) {
        return {
            type: "image",
            mediaNode: image,
            caption: String(image.caption || ""),
            viewOnce: true
        };
    }

    const video = message.videoMessage;
    if (video) {
        return {
            type: "video",
            mediaNode: video,
            caption: String(video.caption || ""),
            viewOnce: true
        };
    }

    const audio = message.audioMessage;
    if (audio) {
        return {
            type: "audio",
            mediaNode: audio,
            caption: "",
            viewOnce: true
        };
    }

    return null;
}

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

async function downloadMedia(sock, msg, media) {
    try {
        return await downloadMediaMessage(
            msg,
            "buffer",
            {},
            { reuploadRequest: sock.updateMediaMessage }
        );
    } catch {}

    if (media?.mediaNode) {
        const stream = await downloadContentFromMessage(media.mediaNode, media.type);
        return streamToBuffer(stream);
    }

    throw new Error("Failed to download view-once media");
}

function buildSendPayload(media, buffer) {
    if (media.type === "image") {
        return {
            image: buffer,
            caption: media.caption || undefined
        };
    }

    if (media.type === "video") {
        return {
            video: buffer,
            caption: media.caption || undefined
        };
    }

    if (media.type === "audio") {
        return {
            audio: buffer,
            mimetype: String(media.mediaNode?.mimetype || "audio/ogg; codecs=opus"),
            ptt: Boolean(media.mediaNode?.ptt)
        };
    }

    return null;
}

function buildSavedTargets(sock) {
    const targets = [];
    const seen = new Set();

    const add = (jid) => {
        const value = String(jid || "").trim();
        if (!value || seen.has(value)) return;
        seen.add(value);
        targets.push(value);
    };

    add(toSelfLid(sock.user?.id));
    add(toSelfJid(sock.user?.id));
    add(sock.user?.id);

    return targets;
}

async function sendToSavedMessages(sock, payload, rawMsg) {
    const targets = buildSavedTargets(sock);
    let lastError = null;

    for (const target of targets) {
        try {
            await sock.sendMessage(target, payload, { quoted: rawMsg });
            return target;
        } catch (err) {
            lastError = err;
            console.error(`[antiviewonce] send target failed (${target}): ${err?.message || err}`);
        }
    }

    throw lastError || new Error("No saved-messages target available");
}

module.exports = {
    name: "antiviewonce",
    react: "👁️‍🗨️",
    category: "security",
    description: "Toggle anti-viewonce to automatically save view-once media to your saved messages",
    usage: ",antiviewonce on|off",
    aliases: ["avo", "antivo"],

    execute: async (_sock, m, mantra) => {
        const state = String(m.args?.[0] || "").trim().toLowerCase();

        if (!state) {
            await m.reply(`AntiViewOnce is ${mantra.settings.antiviewonce ? "ON" : "OFF"}\nUsage: ,antiviewonce on|off`);
            return;
        }

        if (!["on", "off"].includes(state)) {
            await m.reply("Usage: ,antiviewonce on|off");
            return;
        }

        mantra.settings.antiviewonce = state === "on";
        mantra.saveSettings();
        await m.reply(`AntiViewOnce is now ${mantra.settings.antiviewonce ? "ON" : "OFF"}`);
    },

    onMessage: async (sock, m, mantra) => {
        if (!mantra.settings.antiviewonce) return;

        const rawMessage = m.raw?.message;
        if (!rawMessage) return;

        if (m.raw?.key?.fromMe) return;

        const media = detectViewOnceMedia(rawMessage);
        if (!media) return;

        const sender = String(m.sender || m.raw?.key?.participant || m.raw?.key?.remoteJid || "unknown");
        const chat = String(m.from || m.raw?.key?.remoteJid || "unknown");
        const senderMention = `@${sender.split("@")[0]}`;

        console.log(`[antiviewonce] detected viewonce from=${sender} chat=${chat} type=${media.type}`);

        try {
            const buffer = await downloadMedia(sock, m.raw, media);
            if (!Buffer.isBuffer(buffer) || !buffer.length) {
                console.error("[antiviewonce] downloaded buffer is empty");
                return;
            }

            const payload = buildSendPayload(media, buffer);
            if (!payload) {
                console.error("[antiviewonce] unsupported media type:", media.type);
                return;
            }

            const notice = [
                "*View-Once Media Captured*",
                "",
                `From: ${senderMention}`,
                `Chat: ${chat}`,
                `Type: ${media.type}`,
                media.caption ? `Caption: ${media.caption}` : ""
            ].filter(Boolean).join("\n");

            const targets = buildSavedTargets(sock);
            for (const target of targets) {
                try {
                    await sock.sendMessage(target, { text: notice, mentions: [sender] });
                    await sock.sendMessage(target, payload);
                    console.log(`[antiviewonce] saved ${media.type} (${buffer.length} bytes) to ${target}`);
                    return;
                } catch (err) {
                    console.error(`[antiviewonce] send failed (${target}): ${err?.message || err}`);
                }
            }

            console.error("[antiviewonce] all send targets failed");
        } catch (err) {
            console.error(`[antiviewonce] failed: ${err?.message || err}`);
        }
    }
};
