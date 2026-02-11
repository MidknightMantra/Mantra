const { downloadContentFromMessage } = require('gifted-baileys');

function getSelfJid(userId) {
    const raw = String(userId || '');
    if (!raw) return '';
    const withoutDevice = raw.includes(':') ? raw.split(':')[0] : raw;
    return withoutDevice.includes('@') ? withoutDevice : `${withoutDevice}@s.whatsapp.net`;
}

function unwrapEphemeral(message) {
    let current = message || null;
    let guard = 0;
    while (current && guard < 10) {
        guard += 1;
        if (current.ephemeralMessage?.message) {
            current = current.ephemeralMessage.message;
            continue;
        }
        if (current.documentWithCaptionMessage?.message) {
            current = current.documentWithCaptionMessage.message;
            continue;
        }
        break;
    }
    return current;
}

function getQuotedViewOnceMedia(message) {
    const normalized = unwrapEphemeral(message);

    let quoted = normalized;
    let wrappedByViewOnce = false;
    if (quoted?.viewOnceMessage?.message) {
        quoted = quoted.viewOnceMessage.message;
        wrappedByViewOnce = true;
    } else if (quoted?.viewOnceMessageV2?.message) {
        quoted = quoted.viewOnceMessageV2.message;
        wrappedByViewOnce = true;
    } else if (quoted?.viewOnceMessageV2Extension?.message) {
        quoted = quoted.viewOnceMessageV2Extension.message;
        wrappedByViewOnce = true;
    }

    const quotedImage = quoted?.imageMessage;
    const quotedVideo = quoted?.videoMessage;

    if (quotedImage && (quotedImage.viewOnce || wrappedByViewOnce)) {
        return {
            type: 'image',
            media: quotedImage,
            caption: quotedImage.caption || ''
        };
    }

    if (quotedVideo && (quotedVideo.viewOnce || wrappedByViewOnce)) {
        return {
            type: 'video',
            media: quotedVideo,
            caption: quotedVideo.caption || ''
        };
    }

    return null;
}

async function streamToBuffer(stream) {
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
}

function buildPayload(type, buffer, caption) {
    if (type === 'image') {
        return {
            image: buffer,
            fileName: 'media.jpg',
            caption
        };
    }

    return {
        video: buffer,
        fileName: 'media.mp4',
        caption
    };
}

function getCandidateMessages(m, mantra) {
    const candidates = [];

    if (m.quoted) {
        candidates.push({
            key: m.quotedKey || m.key,
            message: m.quoted
        });
    }

    const quotedId = m.quotedKey?.id;
    if (quotedId && mantra?.messageStore?.has(quotedId)) {
        const cached = mantra.messageStore.get(quotedId);
        const cachedMsg = cached?.raw;
        if (cachedMsg?.message && cachedMsg?.key) {
            candidates.push({
                key: cachedMsg.key,
                message: cachedMsg.message
            });
        }
    }

    return candidates;
}

module.exports = {
    name: 'vv',
    category: 'media',
    description: 'Forward quoted view-once media to your saved messages',
    usage: ',vv',
    aliases: ['viewviewonce'],

    execute: async (sock, m, mantra) => {
        try {
            const candidates = getCandidateMessages(m, mantra);
            console.log(`[vv] received command from ${m.sender}; candidates=${candidates.length}; quotedId=${m.quotedKey?.id || 'none'}`);
            let extracted = null;

            for (const candidate of candidates) {
                const found = getQuotedViewOnceMedia(candidate.message);
                if (!found) continue;
                extracted = {
                    ...found,
                    target: candidate
                };
                break;
            }

            if (!extracted) {
                const firstCandidateKeys = Object.keys(candidates[0]?.message || {});
                console.error(`[vv] no view-once media found; firstCandidateKeys=${firstCandidateKeys.join(',') || 'none'}`);
                await m.react('❌');
                return;
            }

            let stream;
            try {
                stream = await downloadContentFromMessage(extracted.media, extracted.type);
            } catch (err) {
                console.error(`[vv] download failed: ${err?.message || err}`);
                await m.react('❌');
                return;
            }
            const buffer = await streamToBuffer(stream);

            const selfJid = getSelfJid(sock.user?.id);
            if (!selfJid) {
                console.error('[vv] unable to resolve self JID from sock.user.id');
                await m.react('❌');
                return;
            }

            try {
                await sock.sendMessage(selfJid, buildPayload(extracted.type, buffer, extracted.caption));
            } catch (err) {
                console.error(`[vv] sending to self failed: ${err?.message || err}`);
                await m.react('❌');
                return;
            }

            console.log(`[vv] success; mediaType=${extracted.type}; sentTo=${selfJid}`);
            await m.react('✅');
        } catch (err) {
            console.error(`[vv] unexpected error: ${err?.message || err}`);
            try {
                await m.react('❌');
            } catch {}
        }
    }
};
