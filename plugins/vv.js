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

function unwrapContainers(message) {
    let current = message && typeof message === "object" ? message : {};
    let wrappedByViewOnce = false;
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
            wrappedByViewOnce = true;
            continue;
        }
        if (current.viewOnceMessageV2?.message) {
            current = current.viewOnceMessageV2.message;
            wrappedByViewOnce = true;
            continue;
        }
        if (current.viewOnceMessageV2Extension?.message) {
            current = current.viewOnceMessageV2Extension.message;
            wrappedByViewOnce = true;
            continue;
        }
        break;
    }

    return { message: current, wrappedByViewOnce };
}

function detectMedia(message) {
    const { message: normalized, wrappedByViewOnce } = unwrapContainers(message);
    if (!normalized || typeof normalized !== "object") return null;

    const image = normalized.imageMessage;
    if (image) {
        return {
            type: "image",
            mediaNode: image,
            caption: String(image.caption || ""),
            isViewOnce: Boolean(image.viewOnce || wrappedByViewOnce)
        };
    }

    const video = normalized.videoMessage;
    if (video) {
        return {
            type: "video",
            mediaNode: video,
            caption: String(video.caption || ""),
            isViewOnce: Boolean(video.viewOnce || wrappedByViewOnce)
        };
    }

    return null;
}

function getCandidates(m, mantra) {
    const candidates = [];
    const seen = new Set();

    const addCandidate = (key, message) => {
        if (!message || typeof message !== "object") return;
        const media = detectMedia(message);
        if (!media) return;

        const dedupe = String(key?.id || "") || JSON.stringify(Object.keys(message).sort());
        if (seen.has(dedupe)) return;
        seen.add(dedupe);
        candidates.push({ key, message, media });
    };

    addCandidate(m.quotedKey || m.key, m.quoted);

    const quotedId = String(m.quotedKey?.id || "");
    if (quotedId && mantra?.messageStore?.has(quotedId)) {
        const cached = mantra.messageStore.get(quotedId)?.raw;
        if (cached?.key && cached?.message) {
            addCandidate(cached.key, cached.message);
        }
    }

    // iPhone/LID sessions sometimes miss quoted payload on self-sent commands.
    // Fallback to recent media in the same chat to keep vv usable.
    if (!candidates.length && Boolean(m.key?.fromMe) && mantra?.messageStore instanceof Map) {
        const now = Date.now();
        const entries = Array.from(mantra.messageStore.values()).reverse();

        for (const entry of entries) {
            const timestamp = Number(entry?.timestamp || 0);
            if (Number.isFinite(timestamp) && now - timestamp > 5 * 60 * 1000) {
                break;
            }

            const raw = entry?.raw;
            if (!raw?.message || !raw?.key) continue;
            if (String(raw.key.remoteJid || "") !== String(m.from || "")) continue;
            if (String(raw.key.id || "") === String(m.key?.id || "")) continue;

            addCandidate(raw.key, raw.message);
            if (candidates.length >= 2) break;
        }
    }

    return candidates;
}

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

async function downloadFromCandidate(sock, m, candidate) {
    if (m.quoted && typeof m.downloadQuoted === "function") {
        try {
            return await m.downloadQuoted();
        } catch {}
    }

    try {
        return await downloadMediaMessage(
            { key: candidate.key, message: candidate.message },
            "buffer",
            {},
            { reuploadRequest: sock.updateMediaMessage }
        );
    } catch {}

    if (candidate?.media?.mediaNode) {
        const stream = await downloadContentFromMessage(candidate.media.mediaNode, candidate.media.type);
        return streamToBuffer(stream);
    }

    throw new Error("Failed to download quoted media");
}

function buildSendPayload(media, buffer) {
    if (media.type === "image") {
        return {
            image: buffer,
            caption: media.caption || undefined
        };
    }

    return {
        video: buffer,
        caption: media.caption || undefined
    };
}

function buildSavedTargets(sock, m) {
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

    // In companion mode, private self chat JID can be different from canonical JID.
    if (!m.isGroup && m.key?.fromMe) {
        add(m.from);
    }

    return targets;
}

async function sendToSavedMessages(sock, m, payload) {
    const targets = buildSavedTargets(sock, m);
    let lastError = null;

    for (const target of targets) {
        try {
            await sock.sendMessage(target, payload, { quoted: m.raw });
            return target;
        } catch (err) {
            lastError = err;
            console.error(`[vv] send target failed (${target}): ${err?.message || err}`);
        }
    }

    throw lastError || new Error("No saved-messages target available");
}

module.exports = {
    name: "vv",
    react: "👁️",
    category: "convert",
    description: "Forward quoted view-once image/video to saved messages",
    usage: ",vv (reply to view-once image/video)",
    aliases: ["viewviewonce", "viewonce"],

    execute: async (sock, m, mantra) => {
        try {
            console.log(
                `[vv] invoked from=${m.sender} chat=${m.from} fromMe=${Boolean(m.key?.fromMe)} quoted=${Boolean(m.quoted)}`
            );

            const candidates = getCandidates(m, mantra);
            if (!candidates.length) {
                try { await m.react("❌"); } catch {}
                await sock.sendMessage(
                    m.from,
                    { text: `Reply to a view-once image/video.\nUsage: ${m.prefix}vv` },
                    { quoted: m.raw }
                );
                return;
            }

            const selected = candidates.find((entry) => entry.media.isViewOnce) || candidates[0];
            const buffer = await downloadFromCandidate(sock, m, selected);
            if (!Buffer.isBuffer(buffer) || !buffer.length) {
                throw new Error("Downloaded media buffer is empty");
            }

            const sentTo = await sendToSavedMessages(sock, m, buildSendPayload(selected.media, buffer));
            try { await m.react("✅"); } catch {}
            console.log(
                `[vv] success mediaType=${selected.media.type} viewOnce=${selected.media.isViewOnce} bytes=${buffer.length} sentTo=${sentTo}`
            );
        } catch (err) {
            try { await m.react("❌"); } catch {}
            console.error(`[vv] failed: ${err?.message || err}`);
            await sock.sendMessage(
                m.from,
                { text: `vv failed: ${err?.message || "unknown error"}` },
                { quoted: m.raw }
            );
        }
    }
};
