const { downloadMediaMessage, downloadContentFromMessage } = require("gifted-baileys");

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

function detectMedia(message) {
    if (!message || typeof message !== "object") return null;
    if (message.imageMessage) return { type: "image", node: message.imageMessage, caption: message.imageMessage.caption || "" };
    if (message.videoMessage) return { type: "video", node: message.videoMessage, caption: message.videoMessage.caption || "" };
    if (message.audioMessage) return { type: "audio", node: message.audioMessage, caption: "" };
    return null;
}

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

function buildSavedTargets(sock) {
    const targets = [];
    const seen = new Set();
    const add = (jid) => {
        const v = String(jid || "").trim();
        if (!v || seen.has(v)) return;
        seen.add(v);
        targets.push(v);
    };
    add(toSelfLid(sock.user?.id));
    add(toSelfJid(sock.user?.id));
    add(sock.user?.id);
    return targets;
}

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

async function downloadMedia(sock, msg, mediaNode, type) {
    try {
        return await downloadMediaMessage(msg, "buffer", {}, { reuploadRequest: sock.updateMediaMessage });
    } catch { }
    if (mediaNode) {
        const stream = await downloadContentFromMessage(mediaNode, type);
        return streamToBuffer(stream);
    }
    throw new Error("Failed to download view-once media");
}

function buildSendPayload(type, node, buffer, caption) {
    if (type === "image") return { image: buffer, caption: caption || undefined };
    if (type === "video") return { video: buffer, caption: caption || undefined };
    if (type === "audio") return { audio: buffer, mimetype: String(node?.mimetype || "audio/ogg; codecs=opus"), ptt: Boolean(node?.ptt) };
    return null;
}

module.exports = {
    name: "autoviewonce",
    react: "👁️",
    category: "owner",
    description: "Auto-open view-once media and optionally save the media to your saved messages",
    usage: ",autoviewonce on|off|save",
    aliases: ["viewonce", "avo2", "autoview1x"],

    execute: async (_sock, m, mantra) => {
        if (!m.isOwner) {
            await m.reply("Owner only command.");
            return;
        }

        const sub = String(m.args?.[0] || "").trim().toLowerCase();
        const config = mantra.settings.autoviewonce || { enabled: false, save: true };

        if (!sub) {
            await m.reply(
                `👁️ *Auto View Once*\n\n` +
                `• Status: ${config.enabled ? "✅ ON" : "❌ OFF"}\n` +
                `• Save media: ${config.save !== false ? "✅ Yes" : "❌ No"}\n\n` +
                `Usage:\n` +
                `• ${m.prefix}autoviewonce on — auto-open + save media\n` +
                `• ${m.prefix}autoviewonce off — disable\n` +
                `• ${m.prefix}autoviewonce save — toggle saving media to self\n\n` +
                `_When enabled, view-once messages are automatically "opened" (sender sees opened receipt) and optionally saved to your saved messages._`
            );
            return;
        }

        if (sub === "save") {
            const newSave = config.save === false;
            mantra.settings.autoviewonce = { ...config, save: newSave };
            mantra.saveSettings();
            return m.reply(`👁️ Auto View Once — save media is now ${newSave ? "✅ ON" : "❌ OFF"}`);
        }

        if (!["on", "off"].includes(sub)) {
            return m.reply(`Usage: ${m.prefix}autoviewonce on|off|save`);
        }

        mantra.settings.autoviewonce = { enabled: sub === "on", save: config.save !== false };
        mantra.saveSettings();
        await m.reply(`👁️ Auto View Once is now ${mantra.settings.autoviewonce.enabled ? "✅ ON" : "❌ OFF"}`);
    },

    onMessage: async (sock, m, mantra) => {
        const config = mantra.settings?.autoviewonce || {};
        if (!config.enabled) return;

        const rawMessage = m.raw?.message;
        if (!rawMessage) return;
        if (m.raw?.key?.fromMe) return;

        const { message, isViewOnce } = unwrapViewOnce(rawMessage);
        if (!isViewOnce) return;

        const media = detectMedia(message);
        if (!media) return;

        const sender = String(m.sender || m.raw?.key?.participant || m.raw?.key?.remoteJid || "unknown");
        const chat = String(m.from || m.raw?.key?.remoteJid || "unknown");
        const msgId = m.raw?.key?.id;

        console.log(`[autoviewonce] detected view-once from=${sender} chat=${chat} type=${media.type}`);

        // ── Step 1: Send read receipt so sender sees "opened" ──────────────
        try {
            let opened = false;

            // Method 1: sendReceipt with 'read' type
            if (!opened && typeof sock.sendReceipt === "function") {
                try {
                    await sock.sendReceipt(chat, sender, [msgId], "read");
                    opened = true;
                } catch { }
            }

            // Method 2: readMessages
            if (!opened && typeof sock.readMessages === "function") {
                try {
                    await sock.readMessages([m.raw.key]);
                    opened = true;
                } catch { }
            }

            // Method 3: chatModify
            if (!opened && typeof sock.chatModify === "function") {
                try {
                    await sock.chatModify(
                        { markRead: true, lastMessages: [{ key: m.raw.key, messageTimestamp: m.raw.messageTimestamp }] },
                        chat
                    );
                    opened = true;
                } catch { }
            }

            if (opened) {
                console.log(`[autoviewonce] marked as opened: ${msgId}`);
            }
        } catch (err) {
            console.error("[autoviewonce] read receipt failed:", err?.message || err);
        }

        // ── Step 2: Optionally save media to self ──────────────────────────
        if (config.save !== false) {
            try {
                const buffer = await downloadMedia(sock, m.raw, media.node, media.type);
                if (!Buffer.isBuffer(buffer) || !buffer.length) {
                    console.error("[autoviewonce] downloaded buffer is empty");
                    return;
                }

                const payload = buildSendPayload(media.type, media.node, buffer, media.caption);
                if (!payload) return;

                const senderTag = `@${sender.split("@")[0]}`;
                const notice = [
                    "👁️ *View-Once Auto-Opened & Saved*",
                    "",
                    `From: ${senderTag}`,
                    `Chat: ${chat}`,
                    `Type: ${media.type}`,
                    media.caption ? `Caption: ${media.caption}` : ""
                ].filter(Boolean).join("\n");

                const targets = buildSavedTargets(sock);
                for (const target of targets) {
                    try {
                        await sock.sendMessage(target, { text: notice, mentions: [sender] });
                        await sock.sendMessage(target, payload);
                        console.log(`[autoviewonce] saved ${media.type} (${buffer.length} bytes) to ${target}`);
                        return;
                    } catch (err) {
                        console.error(`[autoviewonce] send to ${target} failed: ${err?.message || err}`);
                    }
                }

                console.error("[autoviewonce] all save targets failed");
            } catch (err) {
                console.error(`[autoviewonce] media save failed: ${err?.message || err}`);
            }
        }
    }
};
