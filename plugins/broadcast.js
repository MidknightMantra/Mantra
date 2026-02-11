function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
    name: "broadcast",
    react: "📢",
    category: "owner",
    description: "Broadcast a message to all joined groups",
    usage: ",broadcast <message>",
    aliases: ["bc", "gcast"],

    execute: async (sock, m) => {
        if (!m.isOwner) {
            await m.reply("You are not the owner.");
            return;
        }

        const text = String(m.args?.join(" ") || "").trim();
        if (!text) {
            await m.reply(`Please provide a message.\nUsage: ${m.prefix}broadcast <message>`);
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

        let sent = 0;
        for (const groupId of groupIds) {
            try {
                await sock.sendMessage(groupId, { text });
                sent += 1;
                await delay(250);
            } catch (err) {
                console.error(`broadcast send failed ${groupId}:`, err?.message || err);
            }
        }

        await m.reply(`Broadcast done. Sent to ${sent}/${groupIds.length} groups.`);
    }
};
