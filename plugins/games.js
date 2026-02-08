import { addCommand } from '../lib/plugins.js';
import {
    createGame,
    joinGame,
    getActiveGame,
    getWaitingGame,
    makeMove,
    endGame,
    createWcgGame,
    joinWcgGame,
    startWcgGame,
    getActiveWcgGame,
    getWaitingWcgGame,
    submitWord,
    endWcgGame,
    createDiceGame,
    joinDiceGame,
    getActiveDiceGame,
    getWaitingDiceGame,
    playerRoll,
    endDiceGame,
    renderBoard,
    getPlayerName,
    formatScores,
    getDiceEmoji
} from '../lib/games.js';
import {
    clearGameTimeout,
    clearWcgTimeout,
    clearDiceTimeout,
    setMoveTimeout,
    setWcgTurnTimeout,
    setDiceTurnTimeout,
    handleAiTttMove,
    handleAiWcgMove,
    handleAiDiceRoll
} from '../lib/gameHandler.js';
import { log } from '../src/utils/logger.js';

/**
 * 🎮 GAMES MENU
 */
addCommand({
    pattern: "games",
    alias: ["game", "gamelist"],
    react: "🎮",
    category: "game",
    desc: "Show all available games",
    handler: async (m, { conn }) => {
        const helpText = `🎮 *MANTRA GAMES*

╭━━━━━━━━━━━━━━━━━╮
│ ❌⭕ *TIC TAC TOE*
├━━━━━━━━━━━━━━━━━┤
│ .ttt - Start (vs player)
│ .tttai - Play vs AI 🤖
│ .tttend - End game
│ _Type "join" to join_
│ _Type "1-9" to move_
╰━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━╮
│ 🔤 *WORD CHAIN*
├━━━━━━━━━━━━━━━━━┤
│ .wcg - Start (multiplayer)
│ .wcgai - Play vs AI 🤖
│ .wcgbegin - Start (host)
│ .wcgend - End game
│ .wcgscores - Scores
╰━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━╮
│ 🎲 *DICE GAME*
├━━━━━━━━━━━━━━━━━┤
│ .dice [rounds] - Start
│ .diceai [rounds] - vs AI 🤖
│ .diceend - End game
│ _Type ".roll" to roll_
╰━━━━━━━━━━━━━━━━━╯`;
        await conn.sendMessage(m.chat, { text: helpText }, { quoted: m });
    }
});

/**
 * ❌⭕ TIC-TAC-TOE
 */
addCommand({
    pattern: "ttt",
    alias: ["tictactoe"],
    react: "🎮",
    category: "game",
    desc: "Start TicTacToe",
    handler: async (m, { conn, isGroup }) => {
        if (!isGroup) return m.reply(global.messages.group);

        if (await getActiveGame(m.chat) || await getWaitingGame(m.chat)) {
            return m.reply("❌ Game already active! Use .tttend to stop.");
        }

        await createGame(m.chat, m.sender, m.key);

        await conn.sendMessage(m.chat, {
            text: `🎮 *TIC TAC TOE*\n\n@${getPlayerName(m.sender)} wants to play!\nType *join* within 30s to play!\n\n${renderBoard([1, 2, 3, 4, 5, 6, 7, 8, 9])}`,
            mentions: [m.sender]
        });

        // Set join timeout
        const timeout = setTimeout(async () => {
            if (await getWaitingGame(m.chat)) {
                await endGame(m.chat);
                await conn.sendMessage(m.chat, { text: "⏰ TTT Join Timeout! Game cancelled." });
            }
        }, 30000);
        // We'd normally store this in gameTimeouts but gameHandler handles turn timeouts
    }
});

addCommand({
    pattern: "tttai",
    react: "🤖",
    category: "game",
    desc: "Play TTT vs AI",
    handler: async (m, { conn, isGroup }) => {
        if (!isGroup) return m.reply(global.messages.group);
        if (await getActiveGame(m.chat)) return m.reply("❌ Game active!");

        await createGame(m.chat, m.sender, m.key, true);
        const game = await getActiveGame(m.chat);

        await conn.sendMessage(m.chat, {
            text: `🤖 *TTT vs AI STARTED!*\n\n${renderBoard(JSON.parse(game.board))}\n\n@${getPlayerName(m.sender)}, your move! (1-9)`,
            mentions: [m.sender]
        });
    }
});

// Listener for TTT moves & joins (on body)
addCommand({
    on: "body",
    handler: async (m, { conn, body, isGroup }) => {
        if (!isGroup) return;
        const text = body.toLowerCase().trim();

        // JOIN TTT
        if (text === 'join') {
            const result = await joinGame(m.chat, m.sender);
            if (result) {
                if (result.error) return m.reply(result.error === 'same_player' ? "❌ Play with someone else!" : "");

                await conn.sendMessage(m.chat, {
                    text: `🎮 *GAME STARTED!*\n\n❌ @${getPlayerName(result.player1)}\n⭕ @${getPlayerName(result.player2)}\n\n${renderBoard(JSON.parse(result.board))}\n\n@${getPlayerName(result.player1)}'s turn!`,
                    mentions: [result.player1, result.player2]
                });
                setMoveTimeout(m.chat, conn, result.player1);
                return;
            }
        }

        // TTT MOVE (1-9)
        if (/^[1-9]$/.test(text)) {
            const game = await getActiveGame(m.chat);
            if (!game || game.currentTurn !== m.sender) return;

            const result = await makeMove(m.chat, m.sender, text);
            if (result.error) return m.reply("❌ Invalid move!");

            clearGameTimeout(m.chat);
            const board = JSON.parse(result.board);

            if (result.winner) {
                let msg = `🎮 *TIC TAC TOE*\n\n${renderBoard(board)}\n\n`;
                msg += result.winner === 'draw' ? "🤝 *It's a draw!*" : `🏆 @${getPlayerName(result.winner)} WINS!`;
                await conn.sendMessage(m.chat, { text: msg, mentions: [result.winner] });
                return;
            }

            // AI Move
            if (game.isAi && result.currentTurn === 'bot') {
                await conn.sendMessage(m.chat, { text: `${renderBoard(board)}\n\n🤖 AI is thinking...` });
                await handleAiTttMove(m.chat, conn, result);
                return;
            }

            await conn.sendMessage(m.chat, {
                text: `${renderBoard(board)}\n\n@${getPlayerName(result.currentTurn)}'s turn!`,
                mentions: [result.currentTurn]
            });
            setMoveTimeout(m.chat, conn, result.currentTurn);
        }
    }
});

addCommand({
    pattern: "tttend",
    alias: ["stoptictactoe"],
    react: "🛑",
    category: "game",
    desc: "End TTT game",
    handler: async (m) => {
        const game = await getActiveGame(m.chat) || await getWaitingGame(m.chat);
        if (!game) return m.reply("❌ No game active.");
        clearGameTimeout(m.chat);
        await endGame(m.chat);
        m.reply("🛑 Game ended.");
    }
});

/**
 * 🔤 WORD CHAIN GAME
 */
addCommand({
    pattern: "wcg",
    react: "🔤",
    category: "game",
    desc: "Start Word Chain",
    handler: async (m, { conn, isGroup }) => {
        if (!isGroup) return m.reply(global.messages.group);
        if (await getActiveWcgGame(m.chat)) return m.reply("❌ Word Chain active!");

        await createWcgGame(m.chat, m.sender);
        await conn.sendMessage(m.chat, {
            text: `🔤 *WORD CHAIN*\n\n@${getPlayerName(m.sender)} started a game!\nType *.wcgjoin* to join.\nHost type *.wcgbegin* to start.`,
            mentions: [m.sender]
        });
    }
});

addCommand({
    pattern: "wcgjoin",
    react: "✅",
    category: "game",
    desc: "Join WCG",
    handler: async (m) => {
        const res = await joinWcgGame(m.chat, m.sender);
        if (res.error) return m.reply(`❌ ${res.error}`);
        m.reply(`✅ Joined! Total players: ${res.players.length}`);
    }
});

addCommand({
    pattern: "wcgbegin",
    react: "🚀",
    category: "game",
    desc: "Start WCG turns",
    handler: async (m, { conn }) => {
        const res = await startWcgGame(m.chat);
        if (res.error) return m.reply(`❌ ${res.error}`);

        await conn.sendMessage(m.chat, {
            text: `🚀 *WORD CHAIN STARTED!*\n\n@${getPlayerName(res.currentTurn)}, start with any word!\n⏰ 30s per turn.`,
            mentions: [res.currentTurn]
        });
        setWcgTurnTimeout(m.chat, conn, res.currentTurn);
    }
});

addCommand({
    pattern: "w",
    alias: ["word"],
    category: "game",
    desc: "Submit word in WCG",
    handler: async (m, { conn, text }) => {
        if (!text) return;
        const res = await submitWord(m.chat, m.sender, text);
        if (res.error) return m.reply(`❌ ${res.error}`);

        clearWcgTimeout(m.chat);
        await conn.sendMessage(m.chat, {
            text: `✅ *${res.word.toUpperCase()}*\n\n🔄 @${getPlayerName(res.nextPlayer)}'s turn\nLast letter: *${res.word.slice(-1).toUpperCase()}*`,
            mentions: [res.nextPlayer]
        });
        setWcgTurnTimeout(m.chat, conn, res.nextPlayer);
    }
});

addCommand({
    pattern: "wcgscores",
    react: "📊",
    category: "game",
    desc: "Show WCG scores",
    handler: async (m) => {
        const game = await getActiveWcgGame(m.chat);
        if (!game) return m.reply("❌ No active WCG.");
        m.reply(`📊 *SCORES*\n\n${formatScores(game.scores)}`);
    }
});

addCommand({
    pattern: "wcgend",
    react: "🛑",
    category: "game",
    handler: async (m) => {
        clearWcgTimeout(m.chat);
        const scores = await endWcgGame(m.chat);
        m.reply(`🛑 WCG Ended.\n\n📊 *Final Scores:*\n${formatScores(scores)}`);
    }
});

/**
 * 🎲 DICE GAME
 */
addCommand({
    pattern: "dice",
    react: "🎲",
    category: "game",
    desc: "Start Dice game",
    handler: async (m, { conn, text, isGroup }) => {
        if (!isGroup) return m.reply(global.messages.group);
        const rounds = parseInt(text) || 3;
        await createDiceGame(m.chat, m.sender, rounds);
        m.reply(`🎲 *DICE GAME*\n\n@${getPlayerName(m.sender)} wants to play ${rounds} rounds!\nType *.dicejoin* to join.`);
    }
});

addCommand({
    pattern: "dicejoin",
    react: "✅",
    category: "game",
    handler: async (m, { conn }) => {
        const res = await joinDiceGame(m.chat, m.sender);
        if (res.error) return m.reply(`❌ ${res.error}`);

        await conn.sendMessage(m.chat, {
            text: `🎲 *GAME STARTED!*\n\n@${getPlayerName(res.player1)} vs @${getPlayerName(res.player2)}\n\n@${getPlayerName(res.player1)}, type *.roll*!`,
            mentions: [res.player1, res.player2]
        });
        setDiceTurnTimeout(m.chat, conn, res.player1);
    }
});

addCommand({
    pattern: "roll",
    react: "🎲",
    category: "game",
    handler: async (m, { conn }) => {
        const res = await playerRoll(m.chat, m.sender);
        if (res.error) return; // Silent error for wrong turn

        clearDiceTimeout(m.chat);

        if (res.roundComplete) {
            let text = `🎲 *Round ${res.currentRound} Results*\n\n` +
                `👤 @${getPlayerName(res.player1)}: ${getDiceEmoji(res.player1Roll)} ${res.player1Roll}\n` +
                `👤 @${getPlayerName(res.player2)}: ${getDiceEmoji(res.player2Roll)} ${res.player2Roll}\n\n`;

            if (res.roundWinner) text += `🏆 @${getPlayerName(res.roundWinner)} wins round!`;
            else text += "🤝 Tie!";

            text += `\n📊 Score: ${res.player1Score} - ${res.player2Score}`;

            if (res.gameFinished) {
                text += `\n\n🎮 *GAME OVER!*\nWinner: @${getPlayerName(res.gameWinner || 'Draw')}`;
                await endDiceGame(m.chat);
            } else {
                text += `\n\n*Round ${res.nextRound}*\n@${getPlayerName(res.player1)}, roll!`;
                setDiceTurnTimeout(m.chat, conn, res.player1);
            }
            await conn.sendMessage(m.chat, { text, mentions: [res.player1, res.player2, res.roundWinner, res.gameWinner].filter(Boolean) });
        } else {
            await conn.sendMessage(m.chat, {
                text: `🎲 @${getPlayerName(m.sender)} rolled ${getDiceEmoji(res.roll)} ${res.roll}!\n\n@${getPlayerName(res.waitingFor)}, your turn!`,
                mentions: [res.waitingFor]
            });
            setDiceTurnTimeout(m.chat, conn, res.waitingFor);
        }
    }
});

addCommand({
    pattern: "diceend",
    react: "🛑",
    category: "game",
    handler: async (m) => {
        clearDiceTimeout(m.chat);
        await endDiceGame(m.chat);
        m.reply("🛑 Dice game ended.");
    }
});
