function normalizeJid(jid) {
    const raw = String(jid || "").trim();
    if (!raw) return "";
    const noDevice = raw.split(":")[0];
    return noDevice.includes("@") ? noDevice.toLowerCase() : `${noDevice.toLowerCase()}@s.whatsapp.net`;
}

function isAdminParticipant(participant) {
    return participant?.admin === "admin" || participant?.admin === "superadmin";
}

function toUserJid(input) {
    const raw = String(input || "").trim();
    if (!raw) return "";
    if (raw.includes("@")) return normalizeJid(raw);
    const digits = raw.replace(/\D/g, "");
    return digits ? `${digits}@s.whatsapp.net` : "";
}

function getTargetFromMentionOrQuote(m) {
    const mention = Array.isArray(m.mentionedJid) ? m.mentionedJid[0] : "";
    if (mention) return normalizeJid(mention);
    if (m.quotedKey?.participant) return normalizeJid(m.quotedKey.participant);
    return "";
}

function mentionTag(jid) {
    return `@${normalizeJid(jid).split("@")[0]}`;
}

async function getGroupAdminState(sock, m) {
    if (!m.isGroup) {
        return { ok: false, error: "This command can only be used in a group." };
    }

    const metadata = await sock.groupMetadata(m.from);
    const participants = Array.isArray(metadata?.participants) ? metadata.participants : [];
    const byJid = new Map(participants.map((p) => [normalizeJid(p.id), p]));

    const senderJid = normalizeJid(m.sender);
    const botJid = normalizeJid(sock.user?.id);

    const senderEntry = byJid.get(senderJid);
    const botEntry = byJid.get(botJid);

    return {
        ok: true,
        metadata,
        participants,
        byJid,
        senderJid,
        botJid,
        senderIsAdmin: isAdminParticipant(senderEntry),
        botIsAdmin: isAdminParticipant(botEntry)
    };
}

module.exports = {
    normalizeJid,
    toUserJid,
    getTargetFromMentionOrQuote,
    mentionTag,
    getGroupAdminState
};
