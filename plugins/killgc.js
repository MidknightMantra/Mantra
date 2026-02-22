const { getGroupAdminState, isSuperAdminParticipant } = require("../lib/groupTools");

const pendingConfirm = new Map();

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

            const arg = String(m.args?.[0] || "").trim().toLowerCase();

            if (arg === "confirm") {
                const pending = pendingConfirm.get(m.from);
                if (!pending || Date.now() - pending.time > 60000) {
                    pendingConfirm.delete(m.from);
                    await m.reply("No pending killgc. Run the command first.");
                    return;
                }

                pendingConfirm.delete(m.from);
                await m.reply("💀 Terminating group...");

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
                return;
            }

            const memberCount = state.participants.filter(
                (p) => p?.id && p.id !== state.botJid && p.id !== state.senderJid && !isSuperAdminParticipant(p)
            ).length;

            pendingConfirm.set(m.from, { time: Date.now() });

            await m.reply(
                `╭─ ⚠️ *Confirm Kill Group* ─\n` +
                `│\n` +
                `│  This will remove *${memberCount}* members\n` +
                `│  and the bot will leave.\n` +
                `│\n` +
                `│  This action cannot be undone.\n` +
                `│\n` +
                `│  Reply: ${m.prefix}killgc confirm\n` +
                `│  _(expires in 60 seconds)_\n` +
                `│\n` +
                `╰──────────────`
            );
        } catch (e) {
            console.error("killgc error:", e?.message || e);
            await m.reply("Failed to terminate group.");
        }
    }
};
