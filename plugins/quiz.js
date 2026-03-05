const axios = require("axios");

const TRIVIA_API = "https://opentdb.com/api.php?amount=1&type=multiple";
const GIFTED_TRIVIA = "https://api.giftedtech.co.ke/api/fun/trivia?apikey=gifted";

// Active games: jid -> { question, answer, options, timeout }
const activeGames = new Map();
const ANSWER_TIMEOUT_MS = 30000;

// Letter keys for options
const KEYS = ["A", "B", "C", "D"];

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function decodeHtml(text) {
    return String(text || "")
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&ldquo;/g, "\u201c")
        .replace(/&rdquo;/g, "\u201d");
}

async function fetchTrivia() {
    // Provider 1: Open Trivia DB
    try {
        const res = await axios.get(TRIVIA_API, { timeout: 10000 });
        const item = res.data?.results?.[0];
        if (!item) throw new Error("No result");

        const correct = decodeHtml(item.correct_answer);
        const all = shuffle([correct, ...item.incorrect_answers.map(decodeHtml)]);

        return {
            question: decodeHtml(item.question),
            answer: correct,
            options: all,
            category: decodeHtml(item.category),
            difficulty: item.difficulty
        };
    } catch { }

    // Provider 2: Gifted API
    try {
        const res = await axios.get(GIFTED_TRIVIA, { timeout: 10000 });
        const item = res.data?.result || res.data;
        if (!item?.question) throw new Error("No question");

        const correct = decodeHtml(item.answer || item.correct_answer || "");
        const options = item.options
            ? item.options.map(decodeHtml)
            : shuffle([correct, "Option B", "Option C", "Option D"]);

        return {
            question: decodeHtml(item.question),
            answer: correct,
            options: options.slice(0, 4),
            category: item.category || "General",
            difficulty: item.difficulty || "medium"
        };
    } catch { }

    throw new Error("Could not fetch a trivia question. Try again.");
}

module.exports = {
    name: "quiz",
    react: "🎯",
    category: "fun",
    description: "Start a trivia quiz game in any chat",
    usage: ",quiz | ,answer <A|B|C|D>",
    aliases: ["trivia", "startquiz"],

    onMessage: async (sock, m) => {
        // Handle answer checking passively
        const game = activeGames.get(m.from);
        if (!game) return;

        const body = String(m.body || "").trim().toUpperCase();
        // Accept "A", "B", "C", "D" or ".answer A" style
        const letter = body.replace(/^[.,!]?answer\s*/i, "").trim();
        if (!KEYS.includes(letter)) return;

        const optionIndex = KEYS.indexOf(letter);
        const chosen = game.options[optionIndex];
        if (!chosen) return;

        clearTimeout(game.timeout);
        activeGames.delete(m.from);

        const correct = chosen.toLowerCase() === game.answer.toLowerCase();

        if (correct) {
            await sock.sendMessage(m.from, {
                text: `🎉 *Correct!* Well done @${m.sender.split("@")[0]}!\n\nAnswer: *${game.answer}*\n\n> *Mantra*`,
                mentions: [m.sender]
            });
        } else {
            await m.reply(
                `❌ *Wrong!*\n\nYou chose: *${letter}. ${chosen}*\nCorrect answer: *${game.answer}*\n\n> *Mantra*`
            );
        }
    },

    execute: async (sock, m) => {
        const sub = String(m.args?.[0] || "").trim().toLowerCase();

        // Manual answer via ,answer / ,quiz A
        if (KEYS.includes(sub.toUpperCase()) || sub === "answer") {
            const letter = (sub === "answer"
                ? String(m.args?.[1] || "").trim()
                : sub).toUpperCase();

            const game = activeGames.get(m.from);
            if (!game) return m.reply("No active quiz! Start one with " + m.prefix + "quiz");
            if (!KEYS.includes(letter)) return m.reply("Answer with A, B, C, or D.");

            const optionIndex = KEYS.indexOf(letter);
            const chosen = game.options[optionIndex];
            clearTimeout(game.timeout);
            activeGames.delete(m.from);

            const correct = chosen?.toLowerCase() === game.answer.toLowerCase();
            return m.reply(
                correct
                    ? `🎉 *Correct!* Answer: *${game.answer}*\n> *Mantra*`
                    : `❌ *Wrong!* You chose *${chosen}*\nCorrect: *${game.answer}*\n> *Mantra*`
            );
        }

        // Stop command
        if (sub === "stop" || sub === "end") {
            const game = activeGames.get(m.from);
            if (!game) return m.reply("No active quiz.");
            clearTimeout(game.timeout);
            activeGames.delete(m.from);
            return m.reply(`⏹️ Quiz ended.\nAnswer was: *${game.answer}*`);
        }

        // Already a game running?
        if (activeGames.has(m.from)) {
            const game = activeGames.get(m.from);
            const opts = game.options.map((o, i) => `${KEYS[i]}. ${o}`).join("\n");
            return m.reply(
                `⚠️ A quiz is already running!\n\n` +
                `❓ *${game.question}*\n\n${opts}\n\n` +
                `Reply *A / B / C / D*  _(${m.prefix}quiz stop to cancel)_`
            );
        }

        // Start a new quiz
        await m.react("⏳");
        let data;
        try {
            data = await fetchTrivia();
        } catch (err) {
            await m.react("❌");
            return m.reply(`❌ ${err.message}`);
        }

        const opts = data.options.map((o, i) => `${KEYS[i]}. ${o}`).join("\n");
        const diff = { easy: "🟢", medium: "🟡", hard: "🔴" }[data.difficulty] || "⚪";

        const questionText =
            `🎯 *Trivia Quiz!*\n\n` +
            `📚 Category: ${data.category}\n` +
            `${diff} Difficulty: ${data.difficulty}\n\n` +
            `❓ *${data.question}*\n\n` +
            `${opts}\n\n` +
            `Reply *A / B / C / D* within 30 seconds!\n> *Mantra*`;

        await sock.sendMessage(m.from, { text: questionText });
        await m.react("🎯");

        const timeoutHandle = setTimeout(async () => {
            if (activeGames.has(m.from)) {
                activeGames.delete(m.from);
                try {
                    await sock.sendMessage(m.from, {
                        text: `⏰ Time's up! The answer was: *${data.answer}*\n> *Mantra*`
                    });
                } catch { }
            }
        }, ANSWER_TIMEOUT_MS);

        activeGames.set(m.from, {
            question: data.question,
            answer: data.answer,
            options: data.options,
            timeout: timeoutHandle
        });
    }
};
