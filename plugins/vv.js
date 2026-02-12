const { downloadMediaMessage, downloadContentFromMessage } = require("gifted-baileys");

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

module.exports = {
    name: "vv",
    react: "👁️",
    category: "convert",
    description: "Reveal quoted view-once image/video in the same chat",
    usage: ",vv (reply to view-once image/video)",
    aliases: ["viewviewonce", "viewonce"],

    execute: async (sock, m, mantra) => {
        try {
            console.log(
                `[vv] invoked from=${m.sender} chat=${m.from} fromMe=${Boolean(m.key?.fromMe)} quoted=${Boolean(m.quoted)}`
            );

            const candidates = getCandidates(m, mantra);
            if (!candidates.length) {
                await m.reply(`Reply to a view-once image/video.\nUsage: ${m.prefix}vv`);
                return;
            }

            const selected = candidates.find((entry) => entry.media.isViewOnce) || candidates[0];
            const buffer = await downloadFromCandidate(sock, m, selected);
            if (!Buffer.isBuffer(buffer) || !buffer.length) {
                throw new Error("Downloaded media buffer is empty");
            }

            await sock.sendMessage(m.from, buildSendPayload(selected.media, buffer), { quoted: m.raw });
            console.log(
                `[vv] success mediaType=${selected.media.type} viewOnce=${selected.media.isViewOnce} bytes=${buffer.length}`
            );
        } catch (err) {
            console.error(`[vv] failed: ${err?.message || err}`);
            await m.reply(`vv failed: ${err?.message || "unknown error"}`);
        }
    }
};
