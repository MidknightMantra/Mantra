const { getGroupAdminState } = require("../lib/groupTools");
const { getGroupSetting, setGroupSetting } = require("../lib/groupSettings");

module.exports = {
    name: "goodbye",
    react: "👋",
    category: "group",
    description: "Toggle goodbye messages for leave events",
    usage: ",goodbye on|off",
    aliases: ["goodbyetoggle", "bye"],

    execute: async (sock, m) => {
        const state = await getGroupAdminState(sock, m);
        if (!state.ok) return m.reply(state.error);
        if (!state.senderIsAdmin && !m.isOwner) return m.reply("Admin/owner only command.");

        const arg = String(m.args?.[0] || "").trim().toLowerCase();
        const current = Boolean(getGroupSetting(m.from, "GOODBYE_ENABLED", false));

        if (!arg) {
            await m.reply(
                `Goodbye is ${current ? "ON" : "OFF"}\n` +
                `Usage: ${m.prefix}goodbye on|off`
            );
            return;
        }

        if (!["on", "off"].includes(arg)) {
            await m.reply(`Usage: ${m.prefix}goodbye on|off`);
            return;
        }

        setGroupSetting(m.from, "GOODBYE_ENABLED", arg === "on");
        await m.reply(`Goodbye is now ${arg.toUpperCase()}`);
    }
};
