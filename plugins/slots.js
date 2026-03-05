const { getUser, updateUser } = require('../lib/db');

const EMOJIS = ['🍎', '💎', '🎰', '🔔', '🍋', '🍒'];

module.exports = {
    name: "slots",
    react: "🎰",
    category: "game",
    description: "Bet money on the slot machine",
    usage: ",slots <amount>",
    aliases: ["slot"],

    execute: async (_sock, m) => {
        const jid = m.sender;
        const arg = m.args?.[0];

        if (!arg) {
            return m.reply(`Usage: ${m.prefix}slots <amount>\nExample: ${m.prefix}slots 100 or ${m.prefix}slots all`);
        }

        const user = getUser(jid);
        let amount = parseInt(arg);
        if (arg.toLowerCase() === 'all') amount = user.wallet;

        if (isNaN(amount) || amount <= 0) {
            return m.reply("Please enter a valid amount to bet.");
        }

        if (user.wallet < amount) {
            return m.reply(`You don't have enough money in your wallet. (Balance: $${user.wallet.toLocaleString()})`);
        }

        // Spin the reels
        const reels = [
            EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
            EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
            EMOJIS[Math.floor(Math.random() * EMOJIS.length)]
        ];

        let resultText = `🎰 *SLOT MACHINE* 🎰\n\n`;
        resultText += `  [ ${reels[0]} | ${reels[1]} | ${reels[2]} ]\n\n`;

        let won = false;
        let multiplier = 0;

        if (reels[0] === reels[1] && reels[1] === reels[2]) {
            won = true;
            // Jackpot!
            if (reels[0] === '💎') multiplier = 10;
            else if (reels[0] === '🎰') multiplier = 7;
            else multiplier = 5;
        } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
            won = true;
            multiplier = 2;
        }

        if (won) {
            const reward = amount * multiplier;
            updateUser(jid, { wallet: user.wallet + (reward - amount) }); // Add the profit
            resultText += `🎉 *WINNER!*\nYou won $${reward.toLocaleString()}! (${multiplier}x)`;
        } else {
            updateUser(jid, { wallet: user.wallet - amount });
            resultText += `💀 *LOST*\nYou lost $${amount.toLocaleString()}.\nBetter luck next time!`;
        }

        await m.reply(resultText);
    }
};
