const { getGroupAdminState, mentionTag } = require("../lib/groupTools");

module.exports = {
    name: "tagall",
    react: "\u{1F4E3}",
    category: "group",
    description: "Mention all group members",
    usage: ",tagall [optional message]",
    aliases: ["all", "hidetagall", "everyone", "mentionall", "mention"],

    execute: async (sock, m) => {
        try {
            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return m.reply(state.error);
            if (!state.senderIsAdmin) return m.reply("You must be an admin to use this command.");

            const mentions = state.participants.map((p) => p.id).filter(Boolean);
            if (!mentions.length) {
                await m.reply("No members found in this group.");
                return;
            }

            const customText = String(m.args?.join(" ") || "").trim();
            const header = customText || "Attention everyone.";
            const roster = mentions.map((jid, index) => `${index + 1}. ${mentionTag(jid)}`).join("\n");

            await sock.sendMessage(m.from, {
                text: `\u{1F4E2} *Tag All*\n\n${header}\n\n${roster}`,
                mentions
            });
        } catch (e) {
            console.error("tagall error:", e?.message || e);
            await m.reply(`${e?.message || e}`);
        }
    }
};
