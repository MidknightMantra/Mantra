module.exports = {
    name: "clearchats",
    react: "🧹",
    category: "owner",
    description: "Delete all currently known chats from this account",
    usage: ",clearchats",
    aliases: ["clearallchats"],

    execute: async (sock, m, mantra) => {
        if (!m.isOwner) {
            await m.reply("You are not the owner.");
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

        let done = 0;
        let failed = 0;
        for (const jid of jids) {
            try {
                await sock.chatModify({ delete: true }, jid);
                done += 1;
            } catch (err) {
                failed += 1;
                console.error(`clearchats failed for ${jid}:`, err?.message || err);
            }
        }

        await m.reply(`Clear chats done. Success: ${done}, Failed: ${failed}`);
    }
};
