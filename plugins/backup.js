const fs = require("fs");
const path = require("path");

const GROUP_SETTINGS_PATH = path.resolve("./group-settings.json");

function timestampForFile() {
    const now = new Date();
    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const h = String(now.getHours()).padStart(2, "0");
    const mi = String(now.getMinutes()).padStart(2, "0");
    const s = String(now.getSeconds()).padStart(2, "0");
    return `${y}${mo}${d}-${h}${mi}${s}`;
}

module.exports = {
    name: "backup",
    react: "💾",
    category: "owner",
    description: "Export bot settings backup JSON",
    usage: ",backup",
    aliases: ["exportbackup"],

    execute: async (sock, m, mantra) => {
        if (!m.isOwner) {
            await m.reply("Owner only command.");
            return;
        }

        const groupSettings = fs.existsSync(GROUP_SETTINGS_PATH)
            ? JSON.parse(fs.readFileSync(GROUP_SETTINGS_PATH, "utf8"))
            : { settings: {}, counters: {} };

        const payload = {
            version: 1,
            createdAt: new Date().toISOString(),
            settings: mantra?.settings || {},
            groupSettings
        };

        const fileName = `mantra-backup-${timestampForFile()}.json`;
        await sock.sendMessage(
            m.from,
            {
                document: Buffer.from(JSON.stringify(payload, null, 2), "utf8"),
                mimetype: "application/json",
                fileName,
                caption: "MANTRA backup file"
            },
            { quoted: m.raw }
        );
    }
};
