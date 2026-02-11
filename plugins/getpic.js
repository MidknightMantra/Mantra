module.exports = {
    name: "getpic",
    react: "🖼️",
    category: "group",
    description: "Get the group profile picture",
    usage: ",getpic",
    aliases: ["gpp"],

    execute: async (sock, m) => {
        try {
            if (!m.isGroup) {
                await m.reply("This command can only be used in a group.");
                return;
            }

            const groupPic = await sock.profilePictureUrl(m.from, "image");
            await sock.sendMessage(m.from, {
                image: { url: groupPic },
                caption: "Group Profile Picture"
            });
        } catch (e) {
            console.error("getpic error:", e?.message || e);
            await m.reply("Could not fetch group profile picture.");
        }
    }
};
