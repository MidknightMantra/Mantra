const { getGroupAdminState, mentionTag } = require("../lib/groupTools");

module.exports = {
    name: "admins",
    react: "\u{1F451}",
    category: "group",
    description: "List all admins in the current group",
    usage: ",admins",
    aliases: ["adminlist", "gadmins"],

    execute: async (sock, m) => {
        try {
            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return m.reply(state.error);

            const admins = state.participants
                .filter((p) => p?.admin === "admin" || p?.admin === "superadmin")
                .map((p) => p.id);

            if (!admins.length) {
                await m.reply("No admins were found in this group.");
                return;
            }

            const lines = admins.map((jid, index) => `${index + 1}. ${mentionTag(jid)}`);
            await sock.sendMessage(m.from, {
                text: `\u{1F451} *Group Admins*\n\n${lines.join("\n")}`,
                mentions: admins
            });
        } catch (e) {
            console.error("admins error:", e?.message || e);
            await m.reply(`${e?.message || e}`);
        }
    }
};

