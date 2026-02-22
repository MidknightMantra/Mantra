const { delay } = require("../lib/helper");

const pendingConfirm = new Map();

module.exports = {
    name: "broadcast",
    react: "📢",
    category: "owner",
    description: "Broadcast a message to all joined groups",
    usage: ",broadcast <message>",
    aliases: ["bc", "gcast"],

    execute: async (sock, m) => {
        if (!m.isOwner) {
            await m.reply("Owner only command.");
            return;
        }

        const text = String(m.args?.join(" ") || "").trim();
        const botName = process.env.BOT_NAME || "MANTRA";

        if (text.toLowerCase() === "confirm") {
            const pending = pendingConfirm.get(m.sender);
            if (!pending || Date.now() - pending.time > 60000) {
                pendingConfirm.delete(m.sender);
                await m.reply("No pending broadcast. Use the command with a message first.");
                return;
            }

            pendingConfirm.delete(m.sender);
            const groupIds = pending.groupIds;
            await m.reply(`📢 Broadcasting to ${groupIds.length} groups...`);

            let sent = 0;
            for (const groupId of groupIds) {
                try {
                    await sock.sendMessage(groupId, { text: pending.text });
                    sent++;
                    await delay(250);
                } catch (err) {
                    console.error(`broadcast send failed ${groupId}:`, err?.message || err);
                }
            }

            await m.reply(
                `╭─ 📢 *Broadcast Complete* ─\n` +
                `│\n` +
                `│  Sent: ${sent}/${groupIds.length} groups\n` +
                `│\n` +
                `╰──────────────\n\n` +
                `> *${botName}*`
            );
            return;
        }

        if (!text) {
            await m.reply(
                `╭─ 📢 *Broadcast* ─\n` +
                `│\n` +
                `│  Send a message to all groups.\n` +
                `│\n` +
                `│  Usage: ${m.prefix}broadcast <message>\n` +
                `│\n` +
                `╰──────────────\n\n` +
                `> *${botName}*`
            );
            return;
        }

        let groups = {};
        try {
            groups = await sock.groupFetchAllParticipating();
        } catch (err) {
            console.error("broadcast fetch groups error:", err?.message || err);
            await m.reply("Failed to fetch groups.");
            return;
        }

        const groupIds = Object.keys(groups || {});
        if (!groupIds.length) {
            await m.reply("No groups found for broadcast.");
            return;
        }

        pendingConfirm.set(m.sender, { text, groupIds, time: Date.now() });

        await m.reply(
            `╭─ ⚠️ *Confirm Broadcast* ─\n` +
            `│\n` +
            `│  This will send to *${groupIds.length}* groups.\n` +
            `│\n` +
            `│  Message preview:\n` +
            `│  _${text.slice(0, 100)}${text.length > 100 ? "..." : ""}_\n` +
            `│\n` +
            `│  Reply with: ${m.prefix}broadcast confirm\n` +
            `│  _(expires in 60 seconds)_\n` +
            `│\n` +
            `╰──────────────`
        );
    }
};
