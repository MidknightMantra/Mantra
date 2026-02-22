module.exports = {
    name: "autofollow",
    react: "📢",
    category: "owner",
    description: "Manage auto-follow channels. Add/remove WhatsApp channel links that the bot will automatically follow on startup.",
    usage: ",autofollow on|off|add <link>|remove <link>|list|run",
    aliases: ["af", "autofollowchannel"],

    execute: async (sock, m, mantra) => {
        if (!m.isOwner) {
            await m.reply("Owner only command.");
            return;
        }

        const args = m.args || [];
        const action = String(args[0] || "").trim().toLowerCase();
        const value = args.slice(1).join(" ").trim();

        if (!mantra.settings.autofollow) {
            mantra.settings.autofollow = { enabled: true, channels: [] };
        }

        const autofollow = mantra.settings.autofollow;

        if (!action) {
            const status = autofollow.enabled ? "ON" : "OFF";
            const count = autofollow.channels.length;
            await m.reply(
                `📢 *Auto-Follow Channels*\n\n` +
                `Status: ${status}\n` +
                `Saved channels: ${count}\n\n` +
                `Usage:\n` +
                `${m.prefix}autofollow on/off\n` +
                `${m.prefix}autofollow add <channel link>\n` +
                `${m.prefix}autofollow remove <channel link>\n` +
                `${m.prefix}autofollow list\n` +
                `${m.prefix}autofollow run`
            );
            return;
        }

        if (action === "on" || action === "off") {
            autofollow.enabled = action === "on";
            mantra.saveSettings();
            await m.reply(`Auto-Follow is now ${autofollow.enabled ? "ON" : "OFF"}`);
            return;
        }

        if (action === "add") {
            if (!value) {
                await m.reply(`Provide a channel link or newsletter JID.\nExample: ${m.prefix}autofollow add https://whatsapp.com/channel/xxxx`);
                return;
            }

            const link = value.replace(/^["'`]|["'`]$/g, "").trim();
            const existing = autofollow.channels.map(c => c.toLowerCase());
            if (existing.includes(link.toLowerCase())) {
                await m.reply("This channel is already in the auto-follow list.");
                return;
            }

            autofollow.channels.push(link);
            mantra.saveSettings();
            await m.reply(`Added to auto-follow list.\nTotal: ${autofollow.channels.length} channel(s)`);
            return;
        }

        if (action === "remove" || action === "rm" || action === "del") {
            if (!value) {
                await m.reply(`Provide the channel link to remove or use a number from the list.\nExample: ${m.prefix}autofollow remove https://whatsapp.com/channel/xxxx\nExample: ${m.prefix}autofollow remove 1`);
                return;
            }

            const index = parseInt(value, 10);
            if (!isNaN(index) && index >= 1 && index <= autofollow.channels.length) {
                const removed = autofollow.channels.splice(index - 1, 1)[0];
                mantra.saveSettings();
                await m.reply(`Removed from auto-follow list:\n${removed}\nRemaining: ${autofollow.channels.length} channel(s)`);
                return;
            }

            const lowerValue = value.toLowerCase();
            const matchIndex = autofollow.channels.findIndex(c => c.toLowerCase() === lowerValue);
            if (matchIndex === -1) {
                await m.reply("That channel was not found in the auto-follow list.");
                return;
            }

            autofollow.channels.splice(matchIndex, 1);
            mantra.saveSettings();
            await m.reply(`Removed from auto-follow list.\nRemaining: ${autofollow.channels.length} channel(s)`);
            return;
        }

        if (action === "list" || action === "ls") {
            if (!autofollow.channels.length) {
                await m.reply("No channels in the auto-follow list.\nAdd one with: " + m.prefix + "autofollow add <link>");
                return;
            }

            const lines = autofollow.channels.map((c, i) => `${i + 1}. ${c}`);
            await m.reply(
                `📢 *Auto-Follow Channels* (${autofollow.enabled ? "ON" : "OFF"})\n\n` +
                lines.join("\n")
            );
            return;
        }

        if (action === "run" || action === "follow") {
            if (!autofollow.channels.length) {
                await m.reply("No channels in the auto-follow list to follow.");
                return;
            }

            if (!autofollow.enabled) {
                await m.reply("Auto-Follow is currently OFF. Turn it on first with: " + m.prefix + "autofollow on");
                return;
            }

            await m.reply(`Following ${autofollow.channels.length} channel(s)...`);

            let success = 0;
            let failed = 0;
            let already = 0;
            const errors = [];

            for (const link of autofollow.channels) {
                try {
                    await mantra.followChannel(link);
                    success++;
                } catch (err) {
                    const msg = String(err?.message || err);
                    if (/already|followed|subscribed/i.test(msg)) {
                        already++;
                    } else {
                        failed++;
                        errors.push(`${link}: ${msg}`);
                    }
                }
            }

            let result = `*Auto-Follow Results*\n\nFollowed: ${success}\nAlready following: ${already}\nFailed: ${failed}`;
            if (errors.length) {
                result += "\n\nErrors:\n" + errors.slice(0, 5).join("\n");
            }
            await m.reply(result);
            return;
        }

        await m.reply(
            `Unknown action: ${action}\n\nUsage:\n` +
            `${m.prefix}autofollow on/off\n` +
            `${m.prefix}autofollow add <channel link>\n` +
            `${m.prefix}autofollow remove <link or number>\n` +
            `${m.prefix}autofollow list\n` +
            `${m.prefix}autofollow run`
        );
    }
};
