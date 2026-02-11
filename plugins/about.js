const DEFAULT_ABOUT_IMAGE = "https://files.catbox.moe/2evo2f.jpg";

module.exports = {
    name: "about",
    react: "ℹ️",
    category: "main",
    description: "Get bot information",
    usage: ",about",
    aliases: ["info"],

    execute: async (sock, m) => {
        try {
            const senderNumber = String(m.sender || "").split("@")[0];
            const botName = process.env.BOT_NAME || "MANTRA";
            const ownerName = process.env.BOT_OWNER || "MidknightMantra";
            const github = process.env.BOT_GITHUB || "https://github.com/MidknightMantra/Mantra";
            const aboutImg = String(process.env.ALIVE_IMG || "").trim() || DEFAULT_ABOUT_IMAGE;

            const about = `
HELLO THERE ${senderNumber}, I AM ${botName} WHATSAPP BOT
CREATED BY ${ownerName}.

> *© ${botName} - MD*
> *GITHUB:* ${github}

THANKS FOR USING ${botName}
`;

            await sock.sendMessage(m.from, {
                image: { url: aboutImg },
                caption: about.trim()
            });
        } catch (e) {
            console.error("about error:", e?.message || e);
            await m.reply("Failed to fetch about information.");
        }
    }
};
