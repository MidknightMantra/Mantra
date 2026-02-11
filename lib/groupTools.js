function normalizeJid(jid) {
    const raw = String(jid || "").trim();
    if (!raw) return "";
    const noDevice = raw.split(":")[0];
    return noDevice.includes("@") ? noDevice.toLowerCase() : `${noDevice.toLowerCase()}@s.whatsapp.net`;
}

function isAdminParticipant(participant) {
    return participant?.admin === "admin" || participant?.admin === "superadmin";
}

function isSuperAdminParticipant(participant) {
    return participant?.admin === "superadmin";
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

function findParticipantByNumber(participants, numberDigits) {
    const digits = String(numberDigits || "").replace(/\D/g, "");
    if (!digits) return null;

    return (
        participants.find((p) => String(p?.id || "").split("@")[0] === digits) ||
        participants.find((p) => String(p?.pn || "").split("@")[0] === digits) ||
        participants.find((p) => String(p?.jid || "").split("@")[0] === digits) ||
        participants.find((p) => String(p?.phoneNumber || "").split("@")[0] === digits) ||
        null
    );
}

function resolveTargetFromInput(m, state) {
    const participants = Array.isArray(state?.participants) ? state.participants : [];

    const mention = Array.isArray(m?.mentionedJid) ? m.mentionedJid[0] : "";
    if (mention) return normalizeJid(mention);

    const quoted = m?.quotedKey?.participant;
    if (quoted) return normalizeJid(quoted);

    const rawArg = String(m?.args?.[0] || "").trim();
    if (!rawArg) return "";

    if (rawArg.includes("@")) {
        const direct = normalizeJid(rawArg);
        if (participants.length === 0) return direct;
        if (state?.byJid?.has(direct)) return direct;

        const num = direct.split("@")[0];
        const found = findParticipantByNumber(participants, num);
        return found ? normalizeJid(found.id || found.jid || found.pn || found.phoneNumber || "") : direct;
    }

    const digits = rawArg.replace(/\D/g, "");
    if (!digits) return "";

    const found = findParticipantByNumber(participants, digits);
    if (found) {
        return normalizeJid(found.id || found.jid || found.pn || found.phoneNumber || "");
    }

    return `${digits}@s.whatsapp.net`;
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
        senderEntry,
        botEntry,
        senderIsAdmin: isAdminParticipant(senderEntry),
        botIsAdmin: isAdminParticipant(botEntry),
        senderIsSuperAdmin: isSuperAdminParticipant(senderEntry),
        botIsSuperAdmin: isSuperAdminParticipant(botEntry)
    };
}

module.exports = {
    normalizeJid,
    isAdminParticipant,
    isSuperAdminParticipant,
    toUserJid,
    getTargetFromMentionOrQuote,
    resolveTargetFromInput,
    findParticipantByNumber,
    mentionTag,
    getGroupAdminState
};
