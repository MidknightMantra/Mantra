const { getGroupAdminState } = require("../lib/groupTools");

module.exports = {
    name: "setsubject",
    react: "\u{1F3F7}",
    category: "group",
    description: "Change group subject/title",
    usage: ",setsubject <new subject>",
    aliases: ["setname", "subject", "groupname", "gcname", "setgcname", "setgroupname", "gcsubject", "setgcsubject"],

    execute: async (sock, m) => {
        try {
            const state = await getGroupAdminState(sock, m);
            if (!state.ok) return m.reply(state.error);
            if (!state.botIsAdmin) return m.reply("Bot must be an admin to use this command.");
            if (!state.senderIsAdmin) return m.reply("You must be an admin to use this command.");

            const subject = String(m.args?.join(" ") || "").trim();
            if (!subject) return m.reply("Please provide a new group subject.");
            if (subject.length > 100) return m.reply("Group subject is too long. Keep it under 100 characters.");

            await sock.groupUpdateSubject(m.from, subject);
            await m.reply(`\u{2705} Group subject updated to:\n*${subject}*`);
        } catch (e) {
            console.error("setsubject error:", e?.message || e);
            await m.reply(`${e?.message || e}`);
        }
    }
};
