const { getGroupAdminState, mentionTag } = require("../lib/groupTools");

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
    name: "online",
    react: "🟢",
    category: "group",
    description: "List members currently typing/recording",
    usage: ",online",
    aliases: ["listonline", "whosonline"],

    execute: async (sock, m) => {
        try {
            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return m.reply(state.error);

            const participants = state.participants.map((p) => p.id).filter(Boolean);
            if (!participants.length) return m.reply("No members found.");

            const presenceData = new Map();
            const onPresence = (update) => {
                if (!update?.presences) return;
                for (const [jid, presence] of Object.entries(update.presences)) {
                    presenceData.set(jid, presence);
                    presenceData.set(String(jid).split("@")[0], presence);
                }
            };

            sock.ev.on("presence.update", onPresence);
            try {
                const batchSize = 6;
                for (let i = 0; i < participants.length; i += batchSize) {
                    const batch = participants.slice(i, i + batchSize);
                    await Promise.all(
                        batch.map(async (jid) => {
                            try {
                                await sock.presenceSubscribe(jid);
                            } catch {}
                        })
                    );
                    await sleep(350);
                }

                await sleep(1800);
            } finally {
                sock.ev.off("presence.update", onPresence);
            }

            const active = participants.filter((jid) => {
                const presence = presenceData.get(jid) || presenceData.get(String(jid).split("@")[0]);
                const status = String(presence?.lastKnownPresence || "").toLowerCase();
                return status === "composing" || status === "recording";
            });

            if (!active.length) {
                await m.reply("😴 No members are currently typing or recording.");
                return;
            }

            const lines = active.map((jid, i) => `${i + 1}. ${mentionTag(jid)}`);
            await sock.sendMessage(m.from, {
                text: `🟢 *Active Members* (${active.length})\n\n${lines.join("\n")}`,
                mentions: active
            });
        } catch (e) {
            console.error("online error:", e?.message || e);
            await m.reply(`❌ Failed to check online members: ${e?.message || e}`);
        }
    }
};

