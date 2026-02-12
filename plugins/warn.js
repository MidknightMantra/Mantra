const { getGroupAdminState, resolveTargetFromInput, mentionTag } = require("../lib/groupTools");
const { getGroupCounter, setGroupCounter, incrementGroupCounter } = require("../lib/groupSettings");

const WARN_BUCKET = "warnings";
const DEFAULT_WARN_LIMIT = 3;

module.exports = {
    name: "warn",
    react: "⚠️",
    category: "group",
    description: "Warn users and check warning counts",
    usage: ",warn @user | ,warnings [@user] | ,clearwarn @user",
    aliases: ["warnings", "clearwarn"],

    execute: async (sock, m) => {
        const state = await getGroupAdminState(sock, m);
        if (!state.ok) return m.reply(state.error);

        const command = String(m.command || "").toLowerCase();
        const adminAllowed = state.senderIsAdmin || m.isOwner;
        if (!adminAllowed) {
            await m.reply("Admin/owner only command.");
            return;
        }

        let target = resolveTargetFromInput(m, state);
        if (!target && command === "warnings") {
            target = state.senderJid;
        }
        if (!target) {
            await m.reply(`Mention/reply a user or pass number.\nUsage: ${m.prefix}${command} @user`);
            return;
        }

        if (command === "warnings") {
            const count = getGroupCounter(m.from, WARN_BUCKET, target);
            await m.reply(`${mentionTag(target)} has *${count}* warning(s).`);
            return;
        }

        if (command === "clearwarn") {
            setGroupCounter(m.from, WARN_BUCKET, target, 0);
            await m.reply(`Warnings cleared for ${mentionTag(target)}.`);
            return;
        }

        const count = incrementGroupCounter(m.from, WARN_BUCKET, target, 1);
        const limit = DEFAULT_WARN_LIMIT;
        const remaining = Math.max(0, limit - count);

        if (count >= limit) {
            if (!state.botIsAdmin) {
                await m.reply(
                    `${mentionTag(target)} reached ${count}/${limit} warns, but bot is not admin to remove them.`
                );
                return;
            }

            try {
                await sock.groupParticipantsUpdate(m.from, [target], "remove");
                setGroupCounter(m.from, WARN_BUCKET, target, 0);
                await sock.sendMessage(m.from, {
                    text: `${mentionTag(target)} removed after reaching ${limit} warnings.`,
                    mentions: [target]
                });
            } catch (err) {
                await m.reply(`Failed to remove ${mentionTag(target)}: ${err?.message || err}`);
            }
            return;
        }

        await m.reply(
            `${mentionTag(target)} warned.\n` +
            `Count: *${count}/${limit}*\n` +
            `Remaining before kick: *${remaining}*`
        );
    }
};
