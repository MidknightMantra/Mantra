const { getUser, updateUser, getLeaderboard } = require('../lib/db');

module.exports = {
    name: "economy",
    react: "💰",
    category: "game",
    description: "Economy commands: wallet, deposit, withdraw, transfer, leaderboard",
    usage: ",eco <command>",
    aliases: ["eco", "wallet", "bal", "deposit", "dep", "withdraw", "with", "transfer", "pay", "leaderboard", "lb", "top"],

    execute: async (_sock, m) => {
        const jid = m.sender;
        const cmd = m.command.toLowerCase();

        let sub = m.args?.[0]?.toLowerCase() || "";

        // Handle aliases acting as subcommands
        if (cmd === "wallet" || cmd === "bal") sub = "wallet";
        else if (cmd === "deposit" || cmd === "dep") sub = "deposit";
        else if (cmd === "withdraw" || cmd === "with") sub = "withdraw";
        else if (cmd === "transfer" || cmd === "pay") sub = "transfer";
        else if (cmd === "leaderboard" || cmd === "lb" || cmd === "top") sub = "leaderboard";

        if (!sub) {
            await m.reply(`*💰 Mantra Economy System*\n\nUsage:\n${m.prefix}wallet - Check balance\n${m.prefix}deposit <amt>\n${m.prefix}withdraw <amt>\n${m.prefix}transfer @user <amt>\n${m.prefix}leaderboard`);
            return;
        }

        if (sub === "wallet" || sub === "bal") {
            const user = getUser(jid);
            const total = user.wallet + user.bank;
            await m.reply(`💰 *Balance*\n\n👛 Wallet: $${user.wallet.toLocaleString()}\n🏦 Bank: $${user.bank.toLocaleString()}\n\n📈 Net Worth: $${total.toLocaleString()}`);
            return;
        }

        if (sub === "deposit" || sub === "dep") {
            const arg = m.args?.[0] === "deposit" || m.args?.[0] === "dep" ? m.args?.[1] : m.args?.[0];
            const user = getUser(jid);

            if (!arg) return m.reply(`How much do you want to deposit?\nExample: ${m.prefix}deposit 100 or ${m.prefix}deposit all`);

            let amount = parseInt(arg);
            if (arg.toLowerCase() === 'all') amount = user.wallet;

            if (isNaN(amount) || amount <= 0) return m.reply("Please enter a valid amount.");
            if (user.wallet < amount) return m.reply(`You don't have enough money in your wallet. (Balance: $${user.wallet})`);

            updateUser(jid, {
                wallet: user.wallet - amount,
                bank: user.bank + amount
            });

            await m.reply(`✅ Successfully deposited $${amount.toLocaleString()} into your bank.`);
            return;
        }

        if (sub === "withdraw" || sub === "with") {
            const arg = m.args?.[0] === "withdraw" || m.args?.[0] === "with" ? m.args?.[1] : m.args?.[0];
            const user = getUser(jid);

            if (!arg) return m.reply(`How much do you want to withdraw?\nExample: ${m.prefix}withdraw 100 or ${m.prefix}withdraw all`);

            let amount = parseInt(arg);
            if (arg.toLowerCase() === 'all') amount = user.bank;

            if (isNaN(amount) || amount <= 0) return m.reply("Please enter a valid amount.");
            if (user.bank < amount) return m.reply(`You don't have enough money in your bank. (Bank: $${user.bank})`);

            updateUser(jid, {
                bank: user.bank - amount,
                wallet: user.wallet + amount
            });

            await m.reply(`✅ Successfully withdrew $${amount.toLocaleString()} from your bank.`);
            return;
        }

        if (sub === "transfer" || sub === "pay") {
            if (!m.isGroup) {
                return m.reply("This command can only be used in groups.");
            }

            const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
            if (!mentioned) return m.reply(`Please mention the user you want to transfer to.\nExample: ${m.prefix}pay @user 500`);

            const argsContent = m.args.join(" ");
            const amountMatch = argsContent.replace(/@\d+/g, '').trim().match(/\d+/);
            if (!amountMatch) return m.reply("Please specify the amount to transfer.");

            const amount = parseInt(amountMatch[0]);
            if (amount <= 0) return m.reply("Amount must be greater than zero.");
            if (mentioned === jid) return m.reply("You cannot pay yourself.");

            const sender = getUser(jid);
            if (sender.wallet < amount) return m.reply(`You don't have enough money in your wallet to transfer $${amount.toLocaleString()}.`);

            const receiver = getUser(mentioned);

            // Perform transaction
            updateUser(jid, { wallet: sender.wallet - amount });
            updateUser(mentioned, { wallet: receiver.wallet + amount });

            await m.reply(`💸 *Transfer Successful!*\n\nYou sent $${amount.toLocaleString()} to @${mentioned.split('@')[0]}`, { mentions: [mentioned] });
            return;
        }

        if (sub === "leaderboard" || sub === "lb" || sub === "top") {
            const topUsers = getLeaderboard(10);

            if (!topUsers.length) {
                return m.reply("The leaderboard is currently empty.");
            }

            let text = `🏆 *GLOBAL LEADERBOARD* 🏆\n\n`;

            for (let i = 0; i < topUsers.length; i++) {
                const u = topUsers[i];
                const total = u.wallet + u.bank;
                const emoji = i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : '👤';
                text += `${emoji} *${i + 1}.* @${u.jid.split('@')[0]}\n`;
                text += `   Lvl: ${u.level} | Net Worth: $${total.toLocaleString()}\n\n`;
            }

            const allJids = topUsers.map(u => u.jid);
            await _sock.sendMessage(m.from, { text: text.trim(), mentions: allJids });
            return;
        }
    }
};
