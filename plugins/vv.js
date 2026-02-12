const { downloadMediaMessage } = require("gifted-baileys");

function getSelfJid(userId) {
    const raw = String(userId || "").trim();
    if (!raw) return "";
    const [left = "", right = "s.whatsapp.net"] = raw.split("@");
    const user = left.split(":")[0];
    if (!user) return "";
    return `${user}@${right || "s.whatsapp.net"}`;
}

function unwrapContainers(message) {
    let current = message || null;
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

function detectViewOnceMedia(message) {
    const { message: normalized, wrappedByViewOnce } = unwrapContainers(message);
    if (!normalized || typeof normalized !== "object") return null;

    const image = normalized.imageMessage;
    const video = normalized.videoMessage;

    if (image && (image.viewOnce || wrappedByViewOnce)) {
        return { type: "image", caption: String(image.caption || "") };
    }

    if (video && (video.viewOnce || wrappedByViewOnce)) {
        return { type: "video", caption: String(video.caption || "") };
    }

    return null;
}

function getCandidateMessages(m, mantra) {
    const candidates = [];
    const seen = new Set();

    const add = (candidate) => {
        const keyId = String(candidate?.key?.id || "");
        const payload = candidate?.message;
        if (!payload || typeof payload !== "object") return;

        const dedupe = keyId || JSON.stringify(Object.keys(payload).sort());
        if (seen.has(dedupe)) return;
        seen.add(dedupe);
        candidates.push(candidate);
    };

    if (m.quoted) {
        add({
            key: m.quotedKey || m.key,
            message: m.quoted
        });
    }

    const quotedId = String(m.quotedKey?.id || "");
    if (quotedId && mantra?.messageStore?.has(quotedId)) {
        const cached = mantra.messageStore.get(quotedId);
        const cachedMsg = cached?.raw;
        if (cachedMsg?.key && cachedMsg?.message) {
            add({
                key: cachedMsg.key,
                message: cachedMsg.message
            });
        }
    }

    return candidates;
}

async function downloadCandidateBuffer(sock, candidate) {
    return downloadMediaMessage(
        {
            key: candidate.key,
            message: candidate.message
        },
        "buffer",
        {},
        { reuploadRequest: sock.updateMediaMessage }
    );
}

function buildPayload(type, buffer, caption) {
    if (type === "image") {
        return {
            image: buffer,
            caption: caption || undefined
        };
    }

    return {
        video: buffer,
        caption: caption || undefined
    };
}

module.exports = {
    name: "vv",
    react: "👁️",
    category: "media",
    description: "Forward quoted view-once media to your saved messages",
    usage: ",vv (reply to view-once image/video)",
    aliases: ["viewviewonce", "viewonce"],

    execute: async (sock, m, mantra) => {
        try {
            const candidates = getCandidateMessages(m, mantra);
            if (!candidates.length) {
                await m.reply(`Reply to a view-once image/video.\nUsage: ${m.prefix}vv`);
                return;
            }

            let selected = null;
            for (const candidate of candidates) {
                const media = detectViewOnceMedia(candidate.message);
                if (!media) continue;
                selected = { candidate, media };
                break;
            }

            if (!selected) {
                const firstKeys = Object.keys(candidates[0]?.message || {});
                console.error(`[vv] no view-once media found; firstCandidateKeys=${firstKeys.join(",") || "none"}`);
                await m.reply("No view-once image/video found in that reply.");
                return;
            }

            let buffer;
            try {
                buffer = await downloadCandidateBuffer(sock, selected.candidate);
            } catch (err) {
                console.error(`[vv] download failed: ${err?.message || err}`);
                await m.reply("Failed to download quoted view-once media.");
                return;
            }

            if (!Buffer.isBuffer(buffer) || !buffer.length) {
                await m.reply("Could not read media content from quoted message.");
                return;
            }

            const selfJid = getSelfJid(sock.user?.id);
            if (!selfJid) {
                console.error("[vv] unable to resolve self JID");
                await m.reply("Could not resolve your saved-messages JID.");
                return;
            }

            try {
                await sock.sendMessage(selfJid, buildPayload(selected.media.type, buffer, selected.media.caption));
            } catch (err) {
                console.error(`[vv] sending to self failed: ${err?.message || err}`);
                await m.reply("Failed to send media to your saved messages.");
                return;
            }

            console.log(`[vv] success; mediaType=${selected.media.type}; sentTo=${selfJid}`);
            await m.reply("View-once media sent to your saved messages.");
        } catch (err) {
            console.error(`[vv] unexpected error: ${err?.message || err}`);
            await m.reply("vv command failed unexpectedly.");
        }
    }
};
