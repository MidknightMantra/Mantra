const { getGroupAdminState, mentionTag } = require("../lib/groupTools");

function formatCreation(tsSeconds) {
    const ts = Number(tsSeconds || 0);
    if (!Number.isFinite(ts) || ts <= 0) return "Unknown";
    return new Date(ts * 1000).toLocaleString();
}

module.exports = {
    name: "groupinfo",
    react: "\u{1F4CB}",
    category: "group",
    description: "Show group metadata and settings",
    usage: ",groupinfo",
    aliases: ["ginfo", "gcinfo", "met"],

    execute: async (sock, m) => {
        try {
            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return m.reply(state.error);

            const meta = state.metadata || {};
            const adminsCount = state.participants.filter((p) => p?.admin).length;
            const owner = meta.owner || "";

            const text = [
                "\u{1F4CB} *Group Information*",
                "",
                `*Name:* ${meta.subject || "Unknown"}`,
                `*JID:* ${meta.id || m.from}`,
                `*Created:* ${formatCreation(meta.creation)}`,
                `*Members:* ${state.participants.length}`,
                `*Admins:* ${adminsCount}`,
                `*Announcements:* ${meta.announce ? "ON (admins only)" : "OFF (everyone)"}`,
                `*Edit Group Info:* ${meta.restrict ? "Admins only" : "Everyone"}`,
                `*Join Approval:* ${meta.joinApprovalMode ? "ON" : "OFF"}`,
                owner ? `*Owner:* ${mentionTag(owner)}` : "*Owner:* Unknown"
            ].join("\n");

            await sock.sendMessage(m.from, {
                text,
                mentions: owner ? [owner] : []
            });
        } catch (e) {
            console.error("groupinfo error:", e?.message || e);
            await m.reply(`${e?.message || e}`);
        }
    }
};
