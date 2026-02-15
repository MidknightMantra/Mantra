const { downloadMediaMessage } = require('gifted-baileys');
const { sendButtons, sendInteractiveMessage } = require('gifted-btns');

function jidUser(jid) {
    return String(jid || '').split('@')[0].split(':')[0];
}

function getConfiguredOwnerUsers() {
    const keys = ['BOT_OWNER_NUMBER', 'OWNER_NUMBER'];
    const owners = new Set();

    for (const key of keys) {
        const raw = String(process.env[key] || '').trim();
        if (!raw) continue;

        const parts = raw
            .split(/[\s,\n]+/)
            .map((value) => String(value || '').trim())
            .filter(Boolean);

        for (const part of parts) {
            const userFromJid = jidUser(part);
            if (userFromJid) owners.add(userFromJid);

            const digits = part.replace(/\D+/g, '');
            if (digits) owners.add(digits);
        }
    }

    return owners;
}

function toSelfUserJid(userId) {
    const raw = String(userId || '').trim();
    if (!raw) return '';

    const [left = '', right = 's.whatsapp.net'] = raw.split('@');
    const user = left.split(':')[0];
    if (!user) return '';
    return `${user}@${right || 's.whatsapp.net'}`;
}

function unwrapMessageContent(message) {
    let current = message && typeof message === 'object' ? message : {};
    let guard = 0;

    while (current && guard < 12) {
        guard += 1;

        if (current.ephemeralMessage?.message) {
            current = current.ephemeralMessage.message;
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
        if (current.documentWithCaptionMessage?.message) {
            current = current.documentWithCaptionMessage.message;
            continue;
        }

        break;
    }

    return current && typeof current === 'object' ? current : {};
}

function readButtonCommand(content) {
    const legacyId = content?.buttonsResponseMessage?.selectedButtonId;
    if (legacyId) return String(legacyId);

    const templateId = content?.templateButtonReplyMessage?.selectedId;
    if (templateId) return String(templateId);

    const interactiveJson = content?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
    if (interactiveJson) {
        try {
            const parsed = JSON.parse(interactiveJson);
            if (parsed?.id) return String(parsed.id);
            if (parsed?.selectedId) return String(parsed.selectedId);
        } catch {}
    }

    return '';
}

function readContextInfo(content) {
    return (
        content?.extendedTextMessage?.contextInfo ||
        content?.imageMessage?.contextInfo ||
        content?.videoMessage?.contextInfo ||
        content?.documentMessage?.contextInfo ||
        content?.buttonsResponseMessage?.contextInfo ||
        content?.templateButtonReplyMessage?.contextInfo ||
        content?.interactiveResponseMessage?.contextInfo ||
        null
    );
}

module.exports = async function handler(sock, msg, mantra) {
    const m = {};

    m.raw = msg;
    m.key = msg.key;
    const rawTimestamp = Number(msg.messageTimestamp || 0);
    m.timestamp = rawTimestamp > 0 ? rawTimestamp * 1000 : Date.now();
    m.from = msg.key.remoteJid;
    m.sender = msg.key.participant || msg.key.remoteJid;
    m.isGroup = m.from.endsWith('@g.us');
    const configuredOwners = getConfiguredOwnerUsers();
    const senderUser = jidUser(m.sender);
    const fromUser = jidUser(m.from);
    const selfUser = jidUser(sock.user?.id);
    m.isOwner =
        Boolean(msg.key.fromMe) ||
        (Boolean(selfUser) && (senderUser === selfUser || fromUser === selfUser)) ||
        configuredOwners.has(senderUser) ||
        configuredOwners.has(fromUser);
    const selfDirectJid = toSelfUserJid(sock.user?.id);
    // If the message is from our own account (linked device), reply only to "Saved Messages"
    // to avoid posting bot responses into DMs/groups unintentionally.
    // When the chat is already "Saved Messages", this still replies in the same place.
    const preferredReplyJid = (msg.key?.fromMe && selfDirectJid) ? selfDirectJid : m.from;

    const rawContent = msg.message || {};
    const content = unwrapMessageContent(rawContent);
    m.messageRaw = rawContent;
    m.message = content;
    const contextInfo = readContextInfo(content) || readContextInfo(rawContent);
    const type = Object.keys(content)[0];
    const body =
        readButtonCommand(content) ||
        content.conversation ||
        content.extendedTextMessage?.text ||
        content.buttonsResponseMessage?.selectedDisplayText ||
        content.templateButtonReplyMessage?.selectedDisplayText ||
        content.interactiveResponseMessage?.nativeFlowResponseMessage?.name ||
        content.imageMessage?.caption ||
        content.videoMessage?.caption ||
        '';

    m.body = body.trim();
    m.prefix = mantra.prefix;

    if (m.body.startsWith(m.prefix)) {
        const args = m.body.slice(1).trim().split(/\s+/);
        m.command = args.shift().toLowerCase();
        m.args = args;
    }

    m.reply = async (text) => {
        try {
            await mantra.safeSend(sock, preferredReplyJid, { text }, msg);
        } catch (err) {
            if (preferredReplyJid !== m.from) {
                await mantra.safeSend(sock, m.from, { text }, msg);
                return;
            }
            throw err;
        }
    };

    m.react = (emoji) =>
        sock.sendMessage(m.from, {
            react: { text: emoji, key: msg.key }
        });

    m.buttons = (opts) =>
        mantra.safeButtons(sock, m.from, opts);

    m.interactive = (opts) =>
        mantra.safeInteractive(sock, m.from, opts);

    m.quoted = contextInfo?.quotedMessage || null;
    m.mentionedJid = Array.isArray(contextInfo?.mentionedJid) ? contextInfo.mentionedJid : [];
    m.mentioned = m.mentionedJid;
    m.quotedKey = contextInfo?.stanzaId
        ? {
            id: contextInfo.stanzaId,
            remoteJid: m.from,
            fromMe: jidUser(contextInfo.participant) === jidUser(sock.user.id),
            participant: contextInfo.participant || undefined
        }
        : null;

    m.downloadQuoted = async () => {
        if (!m.quoted) throw new Error('No quoted message found');
        return await downloadMediaMessage(
            { key: m.quotedKey || msg.key, message: m.quoted },
            'buffer',
            {},
            { reuploadRequest: sock.updateMediaMessage }
        );
    };

    m.download = async () => {
        return await downloadMediaMessage(
            msg,
            'buffer',
            {},
            { reuploadRequest: sock.updateMediaMessage }
        );
    };

    return m;
};
