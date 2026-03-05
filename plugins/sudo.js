module.exports = {
    name: "sudo",
    react: "👑",
    category: "owner",
    description: "Manage sudo users who can use owner-level commands",
    usage: ",sudo add|remove|list <number>",
    aliases: ["addsudo", "delsudo", "sudolist"],

    execute: async (_sock, m, mantra) => {
        if (!m.isOwner) {
            await m.reply("Owner only command.");
            return;
        }

        const sub = String(m.args?.[0] || "").trim().toLowerCase();
        const sudoList = Array.isArray(mantra.settings.sudo) ? mantra.settings.sudo : [];

        if (!sub || sub === "list") {
            if (!sudoList.length) {
                return m.reply("👑 No sudo users configured.\nAdd with: " + m.prefix + "sudo add <number>");
            }
            const lines = sudoList.map((jid, i) => `${i + 1}. @${jid.split("@")[0]}`);
            return m.reply(`👑 *Sudo Users* (${sudoList.length})\n\n${lines.join("\n")}`);
        }

        // Parse target: from args, mention, or reply
        let target = String(m.args?.[1] || "").trim();
        if (!target && m.mentionedJid?.length) {
            target = m.mentionedJid[0];
        }
        if (!target && m.quoted) {
            target = String(m.raw?.message?.extendedTextMessage?.contextInfo?.participant || "").trim();
        }

        if (sub === "add") {
            if (!target) return m.reply(`Usage: ${m.prefix}sudo add <number|@mention>`);

            const jid = target.includes("@") ? target : `${target.replace(/\D/g, "")}@s.whatsapp.net`;
            if (sudoList.includes(jid)) {
                return m.reply(`@${jid.split("@")[0]} is already a sudo user.`);
            }

            sudoList.push(jid);
            mantra.settings.sudo = sudoList;
            mantra.saveSettings();
            return m.reply(`👑 Added @${jid.split("@")[0]} as sudo user.`);
        }

        if (sub === "remove" || sub === "del" || sub === "rm") {
            if (!target) return m.reply(`Usage: ${m.prefix}sudo remove <number|@mention>`);

            const jid = target.includes("@") ? target : `${target.replace(/\D/g, "")}@s.whatsapp.net`;
            const idx = sudoList.indexOf(jid);
            if (idx === -1) {
                return m.reply(`@${jid.split("@")[0]} is not a sudo user.`);
            }

            sudoList.splice(idx, 1);
            mantra.settings.sudo = sudoList;
            mantra.saveSettings();
            return m.reply(`👑 Removed @${jid.split("@")[0]} from sudo users.`);
        }

        await m.reply(`Usage: ${m.prefix}sudo add|remove|list <number|@mention>`);
    }
};
