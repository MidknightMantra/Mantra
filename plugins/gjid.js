module.exports = {
    name: "gjid",
    react: "📝",
    category: "owner",
    description: "List all group JIDs",
    usage: ",gjid",
    aliases: ["groupjids"],

    execute: async (sock, m) => {
        if (!m.isOwner) {
            await m.reply("You are not the owner.");
            return;
        }

        try {
            const groups = await sock.groupFetchAllParticipating();
            const groupIds = Object.keys(groups || {});

            if (!groupIds.length) {
                await m.reply("No groups found.");
                return;
            }

            await m.reply(`Group JIDs:\n\n${groupIds.join("\n")}`);
        } catch (error) {
            console.error("gjid error:", error?.message || error);
            await m.reply(`Error fetching group JIDs: ${error?.message || error}`);
        }
    }
};
