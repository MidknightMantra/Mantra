const { getGroupAdminState } = require("../lib/groupTools");
const { getGroupSetting, setGroupSetting } = require("../lib/groupSettings");

module.exports = {
    name: "welcome",
    react: "👋",
    category: "group",
    description: "Toggle welcome messages for join events",
    usage: ",welcome on|off",
    aliases: ["welcometoggle"],

    execute: async (sock, m) => {
        const state = await getGroupAdminState(sock, m);
        if (!state.ok) return m.reply(state.error);
        if (!state.senderIsAdmin && !m.isOwner) return m.reply("Admin/owner only command.");

        const arg = String(m.args?.[0] || "").trim().toLowerCase();
        const current = Boolean(getGroupSetting(m.from, "WELCOME_ENABLED", false));

        if (!arg) {
            await m.reply(
                `Welcome is ${current ? "ON" : "OFF"}\n` +
                `Usage: ${m.prefix}welcome on|off`
            );
            return;
        }

        if (!["on", "off"].includes(arg)) {
            await m.reply(`Usage: ${m.prefix}welcome on|off`);
            return;
        }

        setGroupSetting(m.from, "WELCOME_ENABLED", arg === "on");
        await m.reply(`Welcome is now ${arg.toUpperCase()}`);
    }
};
