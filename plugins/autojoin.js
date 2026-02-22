module.exports = {
    name: "autojoin",
    react: "🔗",
    category: "owner",
    description: "Manage auto-join groups. Add/remove group invite links that the bot will automatically join on startup.",
    usage: ",autojoin on|off|add <link>|remove <link>|list|run",
    aliases: ["aj", "autojoingroup"],

    execute: async (sock, m, mantra) => {
        if (!m.isOwner) {
            await m.reply("Owner only command.");
            return;
        }

        const args = m.args || [];
        const action = String(args[0] || "").trim().toLowerCase();
        const value = args.slice(1).join(" ").trim();

        if (!mantra.settings.autojoin) {
            mantra.settings.autojoin = { enabled: true, groups: [] };
        }

        const autojoin = mantra.settings.autojoin;

        if (!action) {
            const status = autojoin.enabled ? "ON" : "OFF";
            const count = autojoin.groups.length;
            await m.reply(
                `🔗 *Auto-Join Groups*\n\n` +
                `Status: ${status}\n` +
                `Saved groups: ${count}\n\n` +
                `Usage:\n` +
                `${m.prefix}autojoin on/off\n` +
                `${m.prefix}autojoin add <group link>\n` +
                `${m.prefix}autojoin remove <group link>\n` +
                `${m.prefix}autojoin list\n` +
                `${m.prefix}autojoin run`
            );
            return;
        }

        if (action === "on" || action === "off") {
            autojoin.enabled = action === "on";
            mantra.saveSettings();
            await m.reply(`Auto-Join is now ${autojoin.enabled ? "ON" : "OFF"}`);
            return;
        }

        if (action === "add") {
            if (!value) {
                await m.reply(`Provide a group invite link.\nExample: ${m.prefix}autojoin add https://chat.whatsapp.com/xxxx`);
                return;
            }

            const link = value.replace(/^["'`]|["'`]$/g, "").trim();
            const existing = autojoin.groups.map(g => g.toLowerCase());
            if (existing.includes(link.toLowerCase())) {
                await m.reply("This group link is already in the auto-join list.");
                return;
            }

            autojoin.groups.push(link);
            mantra.saveSettings();
            await m.reply(`Added to auto-join list.\nTotal: ${autojoin.groups.length} group(s)`);
            return;
        }

        if (action === "remove" || action === "rm" || action === "del") {
            if (!value) {
                await m.reply(`Provide the group link to remove or use a number from the list.\nExample: ${m.prefix}autojoin remove https://chat.whatsapp.com/xxxx\nExample: ${m.prefix}autojoin remove 1`);
                return;
            }

            const index = parseInt(value, 10);
            if (!isNaN(index) && index >= 1 && index <= autojoin.groups.length) {
                const removed = autojoin.groups.splice(index - 1, 1)[0];
                mantra.saveSettings();
                await m.reply(`Removed from auto-join list:\n${removed}\nRemaining: ${autojoin.groups.length} group(s)`);
                return;
            }

            const lowerValue = value.toLowerCase();
            const matchIndex = autojoin.groups.findIndex(g => g.toLowerCase() === lowerValue);
            if (matchIndex === -1) {
                await m.reply("That link was not found in the auto-join list.");
                return;
            }

            autojoin.groups.splice(matchIndex, 1);
            mantra.saveSettings();
            await m.reply(`Removed from auto-join list.\nRemaining: ${autojoin.groups.length} group(s)`);
            return;
        }

        if (action === "list" || action === "ls") {
            if (!autojoin.groups.length) {
                await m.reply("No groups in the auto-join list.\nAdd one with: " + m.prefix + "autojoin add <link>");
                return;
            }

            const lines = autojoin.groups.map((g, i) => `${i + 1}. ${g}`);
            await m.reply(
                `🔗 *Auto-Join Groups* (${autojoin.enabled ? "ON" : "OFF"})\n\n` +
                lines.join("\n")
            );
            return;
        }

        if (action === "run" || action === "join") {
            if (!autojoin.groups.length) {
                await m.reply("No groups in the auto-join list to join.");
                return;
            }

            if (!autojoin.enabled) {
                await m.reply("Auto-Join is currently OFF. Turn it on first with: " + m.prefix + "autojoin on");
                return;
            }

            await m.reply(`Joining ${autojoin.groups.length} group(s)...`);

            let success = 0;
            let failed = 0;
            let already = 0;
            const errors = [];

            for (const link of autojoin.groups) {
                try {
                    await mantra.joinGroup(link);
                    success++;
                } catch (err) {
                    const msg = String(err?.message || err);
                    if (/already|joined|participant|conflict/i.test(msg)) {
                        already++;
                    } else {
                        failed++;
                        errors.push(`${link}: ${msg}`);
                    }
                }
            }

            let result = `*Auto-Join Results*\n\nJoined: ${success}\nAlready in: ${already}\nFailed: ${failed}`;
            if (errors.length) {
                result += "\n\nErrors:\n" + errors.slice(0, 5).join("\n");
            }
            await m.reply(result);
            return;
        }

        await m.reply(
            `Unknown action: ${action}\n\nUsage:\n` +
            `${m.prefix}autojoin on/off\n` +
            `${m.prefix}autojoin add <group link>\n` +
            `${m.prefix}autojoin remove <link or number>\n` +
            `${m.prefix}autojoin list\n` +
            `${m.prefix}autojoin run`
        );
    }
};
