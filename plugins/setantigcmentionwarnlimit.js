const { getGroupAdminState } = require("../lib/groupTools");
const { getGroupSetting, setGroupSetting } = require("../lib/groupSettings");

const WARN_LIMIT_KEY = "ANTIGROUPMENTION_WARN_COUNT";

function getWarnLimit(groupId) {
    const raw = Number(getGroupSetting(groupId, WARN_LIMIT_KEY, 3));
    if (!Number.isFinite(raw)) return 3;
    return Math.max(1, Math.min(50, Math.floor(raw)));
}

module.exports = {
    name: "setantigcmentionwarnlimit",
    react: "⚙️",
    category: "group",
    description: "Set anti-group-mention warn limit before kick",
    usage: ",setantigcmentionwarnlimit <1-50>",
    aliases: ["antigcmentionwarnlimit", "antigroupmentionwarnlimit", "setantigroupmentionwarn"],

    execute: async (sock, m) => {
        try {
            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return m.reply(state.error);
            if (!state.botIsAdmin) return m.reply("Bot must be an admin to use this command.");
            if (!state.senderIsAdmin) return m.reply("You must be an admin to use this command.");

            const arg = String(m.args?.[0] || "").trim();
            if (!arg) {
                const current = getWarnLimit(m.from);
                await m.reply(
                    `⚙️ Anti-Group-Mention warn limit is *${current}*.\nUsage: ,setantigcmentionwarnlimit <1-50>`
                );
                return;
            }

            const next = Number(arg);
            if (!Number.isFinite(next) || next < 1 || next > 50) {
                await m.reply("Please provide a valid number from 1 to 50.");
                return;
            }

            setGroupSetting(m.from, WARN_LIMIT_KEY, String(Math.floor(next)));
            await m.reply(`✅ Anti-Group-Mention warn limit set to *${Math.floor(next)}*.`);
        } catch (e) {
            console.error("setantigcmentionwarnlimit error:", e?.message || e);
            await m.reply(`${e?.message || e}`);
        }
    }
};

