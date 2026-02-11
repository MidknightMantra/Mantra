const { downloadMediaMessage } = require('gifted-baileys');
const { sendButtons, sendInteractiveMessage } = require('gifted-btns');

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

    m.key = msg.key;
    const rawTimestamp = Number(msg.messageTimestamp || 0);
    m.timestamp = rawTimestamp > 0 ? rawTimestamp * 1000 : Date.now();
    m.from = msg.key.remoteJid;
    m.sender = msg.key.participant || msg.key.remoteJid;
    m.isGroup = m.from.endsWith('@g.us');
    m.isOwner = m.sender === sock.user.id;

    const content = msg.message || {};
    const contextInfo = readContextInfo(content);
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

    m.reply = (text) => mantra.safeSend(sock, m.from, { text }, msg);

    m.react = (emoji) =>
        sock.sendMessage(m.from, {
            react: { text: emoji, key: msg.key }
        });

    m.buttons = (opts) =>
        mantra.safeButtons(sock, m.from, opts);

    m.interactive = (opts) =>
        mantra.safeInteractive(sock, m.from, opts);

    m.quoted = contextInfo?.quotedMessage || null;
    m.quotedKey = contextInfo?.stanzaId
        ? {
            id: contextInfo.stanzaId,
            remoteJid: m.from,
            fromMe: contextInfo.participant === sock.user.id,
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
