const fs = require("fs");
const path = require("path");
const { runtime } = require("../lib/helper");

const DEFAULT_ALIVE_IMAGE = "https://files.catbox.moe/2evo2f.jpg";
const DEFAULT_ALIVE_AUDIO = "https://files.catbox.moe/9h4ttf.mp3";

module.exports = {
    name: "alive",
    react: "🟢",
    category: "main",
    description: "Check whether the bot is online",
    usage: ",alive",
    aliases: ["botstatus"],

    execute: async (sock, m) => {
        try {
            const botName = process.env.BOT_NAME || "MANTRA";
            const ownerName = process.env.BOT_OWNER || "MidknightMantra";
            const github = process.env.BOT_GITHUB || "https://github.com/MidknightMantra/Mantra";

            const caption = [
                `╭─── *${botName}* ───`,
                `│`,
                `│  🟢 *Online & Running*`,
                `│  ⏱ Uptime: ${runtime(process.uptime())}`,
                `│  👤 Owner: ${ownerName}`,
                `│`,
                `├── *Features*`,
                `│  📥 Download songs & videos`,
                `│  📰 Fetch latest news`,
                `│  🎮 Fun commands`,
                `│  👥 Group management`,
                `│`,
                `╰── 🔗 ${github}`,
                ``,
                `> *${botName}*`
            ].join("\n");

            const voicePath = path.join(__dirname, "..", "media", "media_alive.mp3");
            const aliveAudio = String(process.env.ALIVE_AUDIO || "").trim() || DEFAULT_ALIVE_AUDIO;
            const aliveImg = String(process.env.ALIVE_IMG || "").trim() || DEFAULT_ALIVE_IMAGE;

            try {
                await sock.sendMessage(m.from, {
                    audio: fs.existsSync(voicePath) ? { url: voicePath } : { url: aliveAudio },
                    mimetype: "audio/mp4",
                    ptt: true
                });
            } catch (err) {
                console.error("alive voice send error:", err?.message || err);
            }

            await sock.sendMessage(m.from, {
                image: { url: aliveImg },
                caption
            });
        } catch (e) {
            console.error("alive error:", e?.message || e);
            await m.reply("Failed to send alive message.");
        }
    }
};
