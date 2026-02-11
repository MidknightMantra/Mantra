const crypto = require("crypto");

module.exports = {
    name: "gpass",
    react: "🔐",
    category: "other",
    description: "Generate a strong password",
    usage: ",gpass [length]",
    aliases: ["genpass", "password"],

    execute: async (sock, m) => {
        try {
            const raw = String(m.args?.[0] || "").trim();
            const length = raw ? Number.parseInt(raw, 10) : 12;

            if (!Number.isFinite(length) || Number.isNaN(length) || length < 8 || length > 128) {
                await m.reply("Please provide a valid length (minimum 8, maximum 128).");
                return;
            }

            const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+[]{}|;:,.<>?";
            let password = "";
            for (let i = 0; i < length; i += 1) {
                const randomIndex = crypto.randomInt(0, charset.length);
                password += charset[randomIndex];
            }

            const message = "🔐 *Your Strong Password* 🔐\n\nPlease find your generated password below:\n\n> *Mantra*";
            await sock.sendMessage(m.from, { text: message });
            await sock.sendMessage(m.from, { text: password });
        } catch (e) {
            console.error("gpass error:", e?.message || e);
            await m.reply(`Error generating password: ${e?.message || "Unknown error"}`);
        }
    }
};
