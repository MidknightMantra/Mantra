module.exports = {
    name: "setpp",
    react: "🖼️",
    category: "owner",
    description: "Set bot profile picture from a quoted image",
    usage: ",setpp (reply to image)",
    aliases: ["setprofile", "setpfp"],

    execute: async (sock, m) => {
        if (!m.isOwner) {
            await m.reply("You are not the owner.");
            return;
        }

        const quoted = m.quoted || {};
        const hasImage =
            Boolean(quoted.imageMessage) ||
            Boolean(quoted.viewOnceMessage?.message?.imageMessage) ||
            Boolean(quoted.viewOnceMessageV2?.message?.imageMessage) ||
            Boolean(quoted.viewOnceMessageV2Extension?.message?.imageMessage);

        if (!hasImage) {
            await m.reply("Please reply to an image.");
            return;
        }

        try {
            const mediaBuffer = await m.downloadQuoted();
            await sock.updateProfilePicture(sock.user.id, mediaBuffer);
            await m.reply("Profile picture updated successfully.");
        } catch (error) {
            console.error("setpp error:", error?.message || error);
            await m.reply(`Error updating profile picture: ${error?.message || error}`);
        }
    }
};
