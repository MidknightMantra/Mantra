function toUserJid(input) {
    const raw = String(input || "").trim();
    if (!raw) return "";
    if (/@s\.whatsapp\.net$/i.test(raw)) return raw.toLowerCase();
    const digits = raw.replace(/\D/g, "");
    return digits ? `${digits}@s.whatsapp.net` : "";
}

function getTargetJid(m) {
    const fromQuoted =
        m.quotedKey?.participant ||
        (m.quotedKey?.remoteJid?.endsWith("@s.whatsapp.net") ? m.quotedKey.remoteJid : "");
    if (fromQuoted) return fromQuoted;

    const arg = String(m.args?.[0] || "");
    return toUserJid(arg);
}

module.exports = {
    name: "block",
    react: "🚫",
    category: "owner",
    description: "Block a user",
    usage: ",block <number> or reply to user message",
    aliases: [],

    execute: async (sock, m) => {
        if (!m.isOwner) {
            await m.reply("You are not the owner.");
            return;
        }

        const target = getTargetJid(m);
        if (!target) {
            await m.reply("Reply to a user message or provide a number to block.");
            return;
        }

        try {
            await sock.updateBlockStatus(target, "block");
            await m.reply(`User blocked: ${target}`);
        } catch (error) {
            console.error("block error:", error?.message || error);
            await m.reply(`Error blocking user: ${error?.message || error}`);
        }
    }
};
