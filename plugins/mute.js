const { getGroupAdminState } = require("../lib/groupTools");
const { getGroupSetting, setGroupSetting } = require("../lib/groupSettings");

const COMMAND_MUTE_UNTIL_KEY = "COMMAND_MUTE_UNTIL";
const MAX_MINUTES = 24 * 60;

function formatRemaining(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

module.exports = {
    name: "mute",
    react: "🔇",
    category: "group",
    description: "Temporarily mute command usage in group",
    usage: ",mute <minutes> | ,unmute",
    aliases: ["unmute", "mutecmd"],

    execute: async (sock, m) => {
        const state = await getGroupAdminState(sock, m);
        if (!state.ok) return m.reply(state.error);
        if (!state.senderIsAdmin && !m.isOwner) return m.reply("Admin/owner only command.");

        const command = String(m.command || "").toLowerCase();
        if (command === "unmute") {
            setGroupSetting(m.from, COMMAND_MUTE_UNTIL_KEY, 0);
            await m.reply("Group commands are now unmuted.");
            return;
        }

        const firstArg = String(m.args?.[0] || "").trim().toLowerCase();
        const currentUntil = Number(getGroupSetting(m.from, COMMAND_MUTE_UNTIL_KEY, 0) || 0);
        if (!firstArg) {
            const isMuted = Number.isFinite(currentUntil) && currentUntil > Date.now();
            if (!isMuted) {
                await m.reply(`Commands are currently unmuted.\nUsage: ${m.prefix}mute <minutes>`);
                return;
            }
            await m.reply(`Commands are muted for another ${formatRemaining(currentUntil - Date.now())}.`);
            return;
        }

        if (["off", "0"].includes(firstArg)) {
            setGroupSetting(m.from, COMMAND_MUTE_UNTIL_KEY, 0);
            await m.reply("Group commands are now unmuted.");
            return;
        }

        const minutes = Number(firstArg);
        if (!Number.isFinite(minutes) || minutes < 1 || minutes > MAX_MINUTES) {
            await m.reply(`Enter minutes between 1 and ${MAX_MINUTES}.\nUsage: ${m.prefix}mute <minutes>`);
            return;
        }

        const muteUntil = Date.now() + Math.floor(minutes * 60 * 1000);
        setGroupSetting(m.from, COMMAND_MUTE_UNTIL_KEY, muteUntil);
        await m.reply(`Commands muted for ${Math.floor(minutes)} minute(s). Use ${m.prefix}unmute to remove early.`);
    }
};
