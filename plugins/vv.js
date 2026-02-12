const { downloadMediaMessage, downloadContentFromMessage } = require("gifted-baileys");

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

    if (image) {
        return {
            type: "image",
            mediaNode: image,
            caption: String(image.caption || ""),
            isViewOnce: Boolean(image.viewOnce || wrappedByViewOnce)
        };
    }

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

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

async function downloadCandidateByStream(mediaNode, type) {
    const stream = await downloadContentFromMessage(mediaNode, type);
    return streamToBuffer(stream);
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

function buildDeliveryTargets(sock, m) {
    const targets = [];
    const seen = new Set();

    const add = (jid) => {
        const value = String(jid || "").trim();
        if (!value || seen.has(value)) return;
        seen.add(value);
        targets.push(value);
    };

    // In self/private chats this is often the most reliable return destination.
    if (!m.isGroup && m.key?.fromMe) {
        add(m.from);
    }

    add(m.sender);
    add(sock.user?.id);
    add(getSelfJid(sock.user?.id));

    return targets;
}

async function sendToBestTarget(sock, m, payload) {
    const targets = buildDeliveryTargets(sock, m);
    let lastErr = null;

    for (const target of targets) {
        try {
            await sock.sendMessage(target, payload);
            return target;
        } catch (err) {
            lastErr = err;
            console.error(`[vv] send target failed (${target}): ${err?.message || err}`);
        }
    }

    if (lastErr) throw lastErr;
    throw new Error("No valid delivery targets for vv");
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

            let selectedViewOnce = null;
            let selectedAnyMedia = null;
            for (const candidate of candidates) {
                const media = detectViewOnceMedia(candidate.message);
                if (!media) continue;
                if (!selectedAnyMedia) {
                    selectedAnyMedia = { candidate, media };
                }
                if (media.isViewOnce) {
                    selectedViewOnce = { candidate, media };
                    break;
                }
            }
            const selected = selectedViewOnce || selectedAnyMedia;

            if (!selected) {
                const firstKeys = Object.keys(candidates[0]?.message || {});
                console.error(`[vv] no view-once media found; firstCandidateKeys=${firstKeys.join(",") || "none"}`);
                await m.reply("No image/video media found in that reply.");
                return;
            }

            let buffer;
            try {
                if (m.quoted && typeof m.downloadQuoted === "function") {
                    try {
                        buffer = await m.downloadQuoted();
                    } catch {}
                }
                if (!Buffer.isBuffer(buffer) || !buffer.length) {
                    try {
                        buffer = await downloadCandidateBuffer(sock, selected.candidate);
                    } catch {}
                }
                if (!Buffer.isBuffer(buffer) || !buffer.length) {
                    if (selected.media.mediaNode) {
                        buffer = await downloadCandidateByStream(
                            selected.media.mediaNode,
                            selected.media.type
                        );
                    }
                }
            } catch (err) {
                console.error(`[vv] download failed: ${err?.message || err}`);
                await m.reply("Failed to download quoted view-once media.");
                return;
            }

            if (!Buffer.isBuffer(buffer) || !buffer.length) {
                await m.reply("Could not read media content from quoted message.");
                return;
            }

            try {
                const sentTo = await sendToBestTarget(
                    sock,
                    m,
                    buildPayload(selected.media.type, buffer, selected.media.caption)
                );
                console.log(`[vv] success; mediaType=${selected.media.type}; sentTo=${sentTo}; viewOnce=${selected.media.isViewOnce}`);
            } catch (err) {
                console.error(`[vv] sending to self failed: ${err?.message || err}`);
                await m.reply("Failed to send media to your saved messages.");
                return;
            }

            await m.reply(
                selected.media.isViewOnce
                    ? "View-once media sent to your chat."
                    : "Media sent to your chat (note: source was not marked view-once)."
            );
        } catch (err) {
            console.error(`[vv] unexpected error: ${err?.message || err}`);
            await m.reply("vv command failed unexpectedly.");
        }
    }
};
