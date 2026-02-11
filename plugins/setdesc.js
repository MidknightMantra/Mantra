const { getGroupAdminState } = require("../lib/groupTools");

module.exports = {
    name: "setdesc",
    react: "\u{1F4DD}",
    category: "group",
    description: "Change or clear group description",
    usage: ",setdesc <new description> | ,setdesc clear",
    aliases: ["setdescription", "desc", "gcdesc", "groupdesc", "setgcdesc", "setgroupdesc", "description"],

    execute: async (sock, m) => {
        try {
            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return m.reply(state.error);
            if (!state.botIsAdmin) return m.reply("Bot must be an admin to use this command.");
            if (!state.senderIsAdmin) return m.reply("You must be an admin to use this command.");

            const input = String(m.args?.join(" ") || "").trim();
            if (!input) {
                await m.reply("Please provide a description or use `,setdesc clear`.");
                return;
            }

            const clearRequested = ["clear", "none", "off", "-"].includes(input.toLowerCase());
            if (clearRequested) {
                await sock.groupUpdateDescription(m.from, "");
                await m.reply("\u{2705} Group description cleared.");
                return;
            }

            if (input.length > 512) {
                await m.reply("Description is too long. Keep it under 512 characters.");
                return;
            }

            await sock.groupUpdateDescription(m.from, input);
            await m.reply("\u{2705} Group description updated.");
        } catch (e) {
            console.error("setdesc error:", e?.message || e);
            await m.reply(`${e?.message || e}`);
        }
    }
};
