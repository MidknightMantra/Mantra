const { getGroupAdminState, isSuperAdminParticipant } = require("../lib/groupTools");

module.exports = {
    name: "killgc",
    react: "💀",
    category: "group",
    description: "Remove members and leave group (owner only)",
    usage: ",killgc",
    aliases: ["terminategc", "destroygc", "nukegc"],

    execute: async (sock, m) => {
        try {
            if (!m.isOwner) return m.reply("Owner only command.");

            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return m.reply(state.error);
            if (!state.botIsAdmin) return m.reply("Bot must be an admin to use this command.");
            if (!state.senderIsAdmin) return m.reply("You must be an admin to use this command.");

            await m.reply("💀 Terminating group: removing members, then leaving...");

            const removable = state.participants
                .filter((p) => p?.id && p.id !== state.botJid && p.id !== state.senderJid)
                .filter((p) => !isSuperAdminParticipant(p))
                .map((p) => p.id);

            if (removable.length) {
                try {
                    await sock.groupParticipantsUpdate(m.from, removable, "remove");
                } catch (e) {
                    console.error("killgc remove batch error:", e?.message || e);
                }
            }

            await sock.groupLeave(m.from);
        } catch (e) {
            console.error("killgc error:", e?.message || e);
            await m.reply(`❌ Failed to terminate group: ${e?.message || e}`);
        }
    }
};

