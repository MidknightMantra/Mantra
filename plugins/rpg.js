const { getUser, updateUser, addXP } = require('../lib/db');

module.exports = {
    name: "rpg",
    react: "⚔️",
    category: "game",
    description: "RPG System: profile, daily, mine",
    usage: ",rpg <profile|daily|mine>",
    aliases: ["game", "r", "level", "daily", "mine", "profile"],

    execute: async (_sock, m) => {
        const jid = m.sender;
        const cmd = m.command.toLowerCase();

        let sub = m.args?.[0]?.toLowerCase() || "";

        // Handle aliases acting as subcommands
        if (cmd === "daily") sub = "daily";
        else if (cmd === "mine") sub = "mine";
        else if (cmd === "profile" || cmd === "level") sub = "profile";

        if (!sub) {
            await m.reply(`*⚔️ Mantra RPG System*\n\nUsage:\n${m.prefix}profile - View your stats\n${m.prefix}daily - Claim daily rewards\n${m.prefix}mine - Mine for resources`);
            return;
        }

        if (sub === "profile" || sub === "stats") {
            const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            const targetJid = mentioned || jid;
            const user = getUser(targetJid);

            const nextLevelXp = user.level * 100;
            const progress = Math.floor((user.xp / nextLevelXp) * 10);
            const bar = '█'.repeat(progress) + '░'.repeat(10 - progress);

            const text = `
👤 *RPG PROFILE*

🔖 *Role:* ${user.role}
🎖️ *Level:* ${user.level}
✨ *XP:* ${user.xp}/${nextLevelXp}
[${bar}]

💰 *Wallet:* $${user.wallet.toLocaleString()}
🏦 *Bank:* $${user.bank.toLocaleString()}
`.trim();

            await m.reply(text);
            return;
        }

        if (sub === "daily") {
            const now = Date.now();
            const user = getUser(jid);
            const cooldown = 24 * 60 * 60 * 1000; // 24 hours

            if (now - user.last_daily < cooldown) {
                const msLeft = cooldown - (now - user.last_daily);
                const hrs = Math.floor(msLeft / (1000 * 60 * 60));
                const mins = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
                await m.reply(`⏳ You already claimed your daily reward!\nWait *${hrs}h ${mins}m* before claiming again.`);
                return;
            }

            const reward = Math.floor(Math.random() * 500) + 500; // 500 - 1000
            const xpReward = 50;

            updateUser(jid, {
                wallet: user.wallet + reward,
                last_daily: now
            });
            addXP(jid, xpReward);

            await m.reply(`🎁 *Daily Claimed!*\n\nYou received:\n+$${reward} added to your wallet.\n+${xpReward} XP.`);
            return;
        }

        if (sub === "mine") {
            const now = Date.now();
            const user = getUser(jid);
            const cooldown = 5 * 60 * 1000; // 5 minutes

            if (now - user.last_mine < cooldown) {
                const msLeft = cooldown - (now - user.last_mine);
                const mins = Math.floor(msLeft / (1000 * 60));
                const secs = Math.floor((msLeft % (1000 * 60)) / 1000);
                await m.reply(`⛏️ Your pickaxe is cooling down...\nWait *${mins}m ${secs}s* before mining again.`);
                return;
            }

            const success = Math.random() > 0.3; // 70% success rate

            if (success) {
                const ores = ['Coal', 'Iron', 'Gold', 'Diamond'];
                const weights = [0.5, 0.3, 0.15, 0.05];

                let roll = Math.random();
                let selectedIndex = 0;
                let sum = 0;
                for (let i = 0; i < weights.length; i++) {
                    sum += weights[i];
                    if (roll <= sum) {
                        selectedIndex = i;
                        break;
                    }
                }

                const minedOre = ores[selectedIndex];
                const values = { 'Coal': 100, 'Iron': 250, 'Gold': 500, 'Diamond': 1500 };
                const value = values[minedOre];
                const xpReward = selectedIndex * 15 + 10;

                updateUser(jid, {
                    wallet: user.wallet + value,
                    last_mine: now
                });
                addXP(jid, xpReward);

                await m.reply(`⛏️ *Mining Successful!*\n\nYou found a *${minedOre}* chunk and sold it for $${value}.\n+${xpReward} XP.`);
            } else {
                updateUser(jid, { last_mine: now });
                addXP(jid, 5); // Consolation XP
                await m.reply(`🪨 You swung your pickaxe but only found rocks... Maybe next time.\n+5 XP.`);
            }
            return;
        }

        await m.reply(`Invalid RPG command. Use ${m.prefix}rpg inside a valid group.`);
    }
};
