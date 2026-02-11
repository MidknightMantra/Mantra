const { getGroupAdminState, mentionTag } = require("../lib/groupTools");

module.exports = {
    name: "tagadmins",
    react: "👮",
    category: "group",
    description: "Mention all group admins",
    usage: ",tagadmins [optional message]",
    aliases: ["taggcadmins", "taggroupadmins"],

    execute: async (sock, m) => {
        try {
            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return m.reply(state.error);
            if (!state.senderIsAdmin && !m.isOwner) return m.reply("Admin/owner only command.");

            const admins = state.participants
                .filter((p) => p?.admin === "admin" || p?.admin === "superadmin")
                .map((p) => p.id)
                .filter(Boolean);

            if (!admins.length) return m.reply("No admins found in this group.");

            const header = String(m.args?.join(" ") || "").trim();
            const lines = admins.map((jid, i) => `${i + 1}. ${mentionTag(jid)}`);

            await sock.sendMessage(m.from, {
                text: `👮 *Tag Admins*\n\n${header || "Calling all admins."}\n\n${lines.join("\n")}`,
                mentions: admins
            });
        } catch (e) {
            console.error("tagadmins error:", e?.message || e);
            await m.reply(`❌ Failed to tag admins: ${e?.message || e}`);
        }
    }
};

