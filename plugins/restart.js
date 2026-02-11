const { exec } = require("child_process");

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
    name: "restart",
    react: "💢",
    category: "owner",
    description: "Restart the bot process via PM2",
    usage: ",restart",
    aliases: ["reboot"],

    execute: async (_sock, m) => {
        try {
            if (!m.isOwner) {
                await m.reply("Owner only command.");
                return;
            }

            await m.reply("Restarting MANTRA...");
            await sleep(1500);

            exec("pm2 restart all", async (error, stdout, stderr) => {
                if (error) {
                    console.error("restart error:", error.message);
                    await m.reply(`Failed to restart with PM2: ${error.message}`);
                    return;
                }

                const output = String(stdout || stderr || "").trim();
                if (output) {
                    console.log("pm2 restart output:", output);
                }
            });
        } catch (e) {
            console.error("restart command error:", e?.message || e);
            await m.reply(`${e?.message || e}`);
        }
    }
};
