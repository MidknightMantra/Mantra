const { WAProto } = require("gifted-baileys");

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

function resolveTargetJid(update, cached, ownJid) {
    const own = normalizeJid(ownJid);
    const candidates = [
        normalizeJid(update?.key?.remoteJid),
        normalizeJid(update?.update?.key?.remoteJid),
        normalizeJid(cached?.from)
    ].filter(Boolean);

    const nonStatus = candidates.filter((jid) => jid !== "status@broadcast");
    const nonSelf = nonStatus.filter((jid) => jid !== own);

    return nonSelf[0] || nonStatus[0] || "";
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

    const msg = cached?.raw?.message || {};
    if (msg.imageMessage) return "[image]";
    if (msg.videoMessage) return "[video]";
    if (msg.audioMessage) return "[audio]";
    if (msg.stickerMessage) return "[sticker]";
    if (msg.documentMessage) return "[document]";
    return "[media]";
}

module.exports = {
    name: "antidelete",
    react: "🧹",
    category: "security",
    description: "Toggle anti-delete to restore revoked messages",
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

        if (state === "on") mantra.settings.antidelete = true;
        if (state === "off") mantra.settings.antidelete = false;

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

            const targetJid = resolveTargetJid(update, cached, sock.user?.id);
            if (!targetJid || targetJid === "status@broadcast") continue;

            const text = [
                "🗑️ *Deleted Message Detected*",
                "",
                `*From:* ${cached.sender}`,
                `*Chat:* ${targetJid}`,
                "",
                "*Message:*",
                describeDeletedContent(cached)
            ].join("\n");

            await sock.sendMessage(targetJid, { text });
        }
    }
};
