const pendingConfirm = new Map();

module.exports = {
    name: "clearchats",
    react: "🧹",
    category: "owner",
    description: "Delete all currently known chats from this account",
    usage: ",clearchats",
    aliases: ["clearallchats"],

    execute: async (sock, m, mantra) => {
        if (!m.isOwner) {
            await m.reply("Owner only command.");
            return;
        }

        const botName = process.env.BOT_NAME || "MANTRA";
        const arg = String(m.args?.[0] || "").trim().toLowerCase();

        if (arg === "confirm") {
            const pending = pendingConfirm.get(m.sender);
            if (!pending || Date.now() - pending.time > 60000) {
                pendingConfirm.delete(m.sender);
                await m.reply("No pending clear. Run the command first.");
                return;
            }

            pendingConfirm.delete(m.sender);

            const jids = new Set(
                Array.from(mantra?.messageStore?.values() || [])
                    .map((entry) => entry?.from)
                    .filter((jid) => jid && jid !== "status@broadcast")
            );

            let done = 0;
            let failed = 0;
            for (const jid of jids) {
                try {
                    await sock.chatModify({ delete: true }, jid);
                    done++;
                } catch (err) {
                    failed++;
                    console.error(`clearchats failed for ${jid}:`, err?.message || err);
                }
            }

            await m.reply(
                `╭─ 🧹 *Chats Cleared* ─\n` +
                `│\n` +
                `│  Cleared: ${done}\n` +
                `│  Failed: ${failed}\n` +
                `│\n` +
                `╰──────────────\n\n` +
                `> *${botName}*`
            );
            return;
        }

        const jids = new Set(
            Array.from(mantra?.messageStore?.values() || [])
                .map((entry) => entry?.from)
                .filter((jid) => jid && jid !== "status@broadcast")
        );

        if (jids.size === 0) {
            await m.reply("No known chats to clear yet.");
            return;
        }

        pendingConfirm.set(m.sender, { time: Date.now() });

        await m.reply(
            `╭─ ⚠️ *Confirm Clear Chats* ─\n` +
            `│\n` +
            `│  This will delete *${jids.size}* chat(s).\n` +
            `│  This action cannot be undone.\n` +
            `│\n` +
            `│  Reply: ${m.prefix}clearchats confirm\n` +
            `│  _(expires in 60 seconds)_\n` +
            `│\n` +
            `╰──────────────`
        );
    }
};
