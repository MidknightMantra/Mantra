const { getUser, updateUser, addXP } = require('../lib/db');

// In-memory sessions for active wordle games per user per group
const wordleSessions = new Map();

const WORDS = [
    'APPLE', 'BRAIN', 'CLOUD', 'DRIVE', 'EARTH', 'FLAME', 'GHOST', 'HEART', 'INDEX', 'JUICE',
    'KNIFE', 'LEMON', 'MUSIC', 'NIGHT', 'OCEAN', 'PHONE', 'QUEEN', 'RIVER', 'STORM', 'TABLE',
    'VOICE', 'WATER', 'YOUNG', 'ZEBRA', 'WAFER', 'BOARD', 'STICK', 'CLICK', 'DREAM', 'PIXEL'
];

module.exports = {
    name: "wordle",
    react: "🔡",
    category: "game",
    description: "Play a 5-letter word guessing game",
    usage: ",wordle (to start) | ,wordle <guess>",
    aliases: ["w"],

    execute: async (_sock, m) => {
        const chatId = m.from;
        const senderId = m.sender;
        const input = (m.args?.[0] || "").toUpperCase();

        const sessionKey = `${chatId}_${senderId}`;
        let session = wordleSessions.get(sessionKey);

        // Start new game
        if (!input || !session) {
            if (session) {
                return m.reply(`You already have a Wordle game in progress! Guess a 5-letter word.`);
            }
            const word = WORDS[Math.floor(Math.random() * WORDS.length)];
            const newSession = {
                word: word,
                attempts: 0,
                maxAttempts: 6,
                history: []
            };
            wordleSessions.set(sessionKey, newSession);
            return m.reply(`🔡 *Wordle Started!*\nI've picked a 5-letter word. You have 6 attempts to guess it.\n\nUsage: ${m.prefix}wordle <guess>`);
        }

        // Validate guess
        if (input.length !== 5) {
            return m.reply("Please guess exactly 5 letters.");
        }

        session.attempts++;
        const target = session.word;
        let result = "";
        let correctCount = 0;

        // Simple Wordle logic
        for (let i = 0; i < 5; i++) {
            if (input[i] === target[i]) {
                result += "🟩";
                correctCount++;
            } else if (target.includes(input[i])) {
                result += "🟨";
            } else {
                result += "⬜";
            }
        }

        session.history.push(`${input} -> ${result}`);

        let statusText = `🔡 *WORDLE* (${session.attempts}/${session.maxAttempts})\n\n`;
        statusText += session.history.join("\n") + "\n\n";

        if (correctCount === 5) {
            wordleSessions.delete(sessionKey);
            const reward = 500;
            const xpReward = 100;
            updateUser(senderId, { wallet: getUser(senderId).wallet + reward });
            addXP(senderId, xpReward);
            return m.reply(`${statusText}🎉 *CONGRATULATIONS!*\nYou guessed the word: *${target}*\n💰 Reward: $${reward} | ✨ XP: ${xpReward}`);
        }

        if (session.attempts >= session.maxAttempts) {
            wordleSessions.delete(sessionKey);
            return m.reply(`${statusText}💀 *GAME OVER*\nYou ran out of attempts. The word was: *${target}*`);
        }

        await m.reply(`${statusText}Keep going! Use ${m.prefix}wordle <guess>`);
    }
};
