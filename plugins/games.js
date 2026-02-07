import { addCommand } from '../lib/plugins.js';
import {
    createGame, joinGame, getActiveGame, getWaitingGame, makeMove, endGame,
    createWcgGame, joinWcgGame, startWcgGame, getActiveWcgGame, getWaitingWcgGame, submitWord, endWcgGame,
    createDiceGame, joinDiceGame, getActiveDiceGame, getWaitingDiceGame, playerRoll, endDiceGame,
    renderBoard, getPlayerName, findWcgWord, findBestTttMove, getDiceEmoji, formatScores,
    gameTimeouts, diceTimeouts, wcgTimeouts
} from '../lib/games.js';
import { UI } from '../src/utils/design.js';
import { react } from '../src/utils/messaging.js';

const BOT_JID = 'bot'; // Logical ID for bot in AI games

/**
 * GAMES MENU
 */
addCommand({
    pattern: 'games',
    alias: ['game', 'gamelist'],
    category: 'game',
    desc: 'Show available games and commands',
    handler: async (m, { conn }) => {
        const helpText = `🎮 *MANTRA GAMES MENU*\n${global.divider}\n\n` +
            `❌⭕ *TIC TAC TOE*\n` +
            `✦ .ttt - Start game (multiplayer)\n` +
            `✦ .tttai - Play vs AI 🤖\n` +
            `✦ .tttend - End game\n` +
            `_Type *join* & *1-9* to play_\n\n` +
            `🔤 *WORD CHAIN*\n` +
            `✦ .wcg - Start game (multiplayer)\n` +
            `✦ .wcgai - Play vs AI 🤖\n` +
            `✦ .wcgend - End game\n\n` +
            `🎲 *DICE GAME*\n` +
            `✦ .dice [rounds] - Start game\n` +
            `✦ .diceai - vs AI 🤖\n\n` +
            `> AI modes let you play solo!`;

        await m.reply(helpText);
    }
});

// --- TIC TAC TOE ---

addCommand({
    pattern: 'ttt',
    alias: ['tictactoe'],
    category: 'game',
    desc: 'Play TicTacToe with a friend',
    handler: async (m, { conn }) => {
        if (await getActiveGame(m.chat)) return m.reply(UI.error('Active Game', 'A game is already in progress. Use .tttend to end it.'));
        if (await getWaitingGame(m.chat)) return m.reply(UI.error('Waiting', 'A game is waiting for a player. Type "join" to play.'));

        await createGame(m.chat, m.sender, m.key.id);
        await m.reply(`🎮 *TIC TAC TOE*\n\n@${m.sender.split('@')[0]} wants to play!\n\n*Type "join" within 30s to play!*\n\n${renderBoard([1, 2, 3, 4, 5, 6, 7, 8, 9])}`);

        const timeout = setTimeout(async () => {
            if (await getWaitingGame(m.chat)) {
                await endGame(m.chat);
                await conn.sendMessage(m.chat, { text: `⏰ *TTT THREAD EXPIRED*\nNo one joined. Game cancelled.` });
            }
        }, 30000);
        gameTimeouts.set(m.chat, timeout);
    }
});

addCommand({
    pattern: 'tttai',
    category: 'game',
    desc: 'Play TicTacToe vs AI',
    handler: async (m, { conn }) => {
        if (await getActiveGame(m.chat)) return m.reply(UI.error('Active Game', 'A game is already in progress.'));
        await createGame(m.chat, m.sender, m.key.id, true);
        await m.reply(`🤖 *TTT vs AI*\n\nPlayer: @${m.sender.split('@')[0]} (❌)\nAI: Mantra 🤖 (⭕)\n\n${renderBoard([1, 2, 3, 4, 5, 6, 7, 8, 9])}\n\n*Your move (1-9)!*`);
    }
});

addCommand({
    pattern: 'tttend',
    category: 'game',
    desc: 'End active TicTacToe game',
    handler: async (m, { conn }) => {
        const game = await getActiveGame(m.chat) || await getWaitingGame(m.chat);
        if (!game) return m.reply(UI.error('No Game', 'No TicTacToe game active here.'));

        await endGame(m.chat);
        await m.reply(`🛑 Game terminated by @${m.sender.split('@')[0]}`);
    }
});

// --- WORD CHAIN ---

addCommand({
    pattern: 'wcg',
    alias: ['wordchain'],
    category: 'game',
    desc: 'Start Word Chain game',
    handler: async (m, { conn }) => {
        if (await getActiveWcgGame(m.chat)) return m.reply(UI.error('Active Game', 'WCG in progress.'));
        await createWcgGame(m.chat, m.sender);
        await m.reply(`🔤 *WORD CHAIN*\n\n@${m.sender.split('@')[0]} started a lobby.\n\n*Type .wcgjoin to join!*\n*Host types .wcgbegin to start!*`);
    }
});

addCommand({
    pattern: 'wcgjoin',
    category: 'game',
    desc: 'Join Word Chain game',
    handler: async (m, { conn }) => {
        const res = await joinWcgGame(m.chat, m.sender);
        if (res.error) return m.reply(UI.error('Join Failed', res.error.replace(/_/g, ' ')));
        await m.reply(`✅ @${m.sender.split('@')[0]} joined! Total players: ${res.players.length}`);
    }
});

addCommand({
    pattern: 'wcgbegin',
    category: 'game',
    desc: 'Start the WCG lobby',
    handler: async (m, { conn }) => {
        const res = await startWcgGame(m.chat);
        if (res.error) return m.reply(UI.error('Start Failed', res.error.replace(/_/g, ' ')));
        await m.reply(`🚀 *WORD CHAIN STARTED!*\n\n🔄 @${res.currentTurn.split('@')[0]}'s turn!\n*Say any word to start!*`);
    }
});

addCommand({
    pattern: 'wcgend',
    category: 'game',
    desc: 'End WCG game',
    handler: async (m, { conn }) => {
        const scores = await endWcgGame(m.chat);
        await m.reply(`🛑 Game Over!\n\n📊 *Final Scores:*\n${formatScores(scores)}`);
    }
});

// --- DICE GAME ---

addCommand({
    pattern: 'dice',
    category: 'game',
    desc: 'Start a Dice game',
    handler: async (m, { conn, args }) => {
        if (await getActiveDiceGame(m.chat)) return m.reply(UI.error('Active Game', 'Dice game in progress.'));
        const rounds = parseInt(args[0]) || 3;
        await createDiceGame(m.chat, m.sender, rounds);
        await m.reply(`🎲 *DICE GAME*\n\n@${m.sender.split('@')[0]} wants to roll! (${rounds} rounds)\n\n*Type .dicejoin to play!*`);
    }
});

addCommand({
    pattern: 'dicejoin',
    category: 'game',
    desc: 'Join dice game',
    handler: async (m, { conn }) => {
        const game = await joinDiceGame(m.chat, m.sender);
        if (game.error) return m.reply(UI.error('Join Failed', game.error));
        await m.reply(`🎲 *DICE STARTED!*\n\n👤 @${game.player1.split('@')[0]} vs @${game.player2.split('@')[0]}\n\n*Round 1*\n@${game.player1.split('@')[0]}, type .roll!`);
    }
});

addCommand({
    pattern: 'roll',
    category: 'game',
    desc: 'Roll in dice game',
    handler: async (m, { conn }) => {
        const res = await playerRoll(m.chat, m.sender);
        if (res.error) return m.reply(UI.error('Invalid Roll', res.error.replace(/_/g, ' ')));

        if (res.roundComplete) {
            let msg = `🎲 *Round ${res.currentRound} Results*\n\n` +
                `${getDiceEmoji(res.player1Roll)} @${res.player1.split('@')[0]}: ${res.player1Roll}\n` +
                `${getDiceEmoji(res.player2Roll)} @${res.player2.split('@')[0]}: ${res.player2Roll}\n\n`;

            if (res.roundWinner) msg += `🏆 @${res.roundWinner.split('@')[0]} wins round!\n`;
            else msg += `🤝 Draw!\n`;

            msg += `\n📊 *Score:* ${res.player1Score} - ${res.player2Score}`;

            if (res.gameFinished) {
                msg += `\n\n🎮 *GAME OVER!*\n` + (res.gameWinner ? `🏆 WINNER: @${res.gameWinner.split('@')[0]}` : `🤝 It's a tie!`);
                await endDiceGame(m.chat);
            } else {
                msg += `\n\n*Round ${res.nextRound}*\n@${res.player1.split('@')[0]}, it's your turn!`;
            }
            await m.reply(msg);
        } else {
            await m.reply(`🎲 @${m.sender.split('@')[0]} rolled: ${getDiceEmoji(res.roll)} *${res.roll}*\n\n@${res.waitingFor.split('@')[0]}, your turn!`);
        }
    }
});

// --- HOOK INTO CORE FOR GAMEPLAY (Auto-join/moves) ---
// This would usually be in listeners.js, but since it's game specific, 
// we register a generic word/number handler in lib/games.js logic if possible
// or expect the user to use commands. For now, we support .roll, .w (for wcg), and numbers via a global catch-all.
// Note: In Mantra, we'll keep it via commands for cleaner architecture.

addCommand({
    pattern: 'w',
    alias: ['word'],
    category: 'game',
    desc: 'Submit word in WCG',
    handler: async (m, { conn, text }) => {
        const res = await submitWord(m.chat, m.sender, text);
        if (res.error) return m.reply(UI.error('Invalid Word', res.error.replace(/_/g, ' ')));

        const nextLetter = res.word.slice(-1).toUpperCase();
        await m.reply(`✅ *${res.word.toUpperCase()}* (+${res.word.length} pts)\n\n🔄 @${res.nextPlayer.split('@')[0]}'s turn\nNext word starts with: *${nextLetter}*`);
    }
});

addCommand({
    pattern: 'move',
    alias: ['m'],
    category: 'game',
    desc: 'Make move in TTT',
    handler: async (m, { conn, text }) => {
        const res = await makeMove(m.chat, m.sender, text);
        if (res.error) return m.reply(UI.error('Invalid Move', res.error.replace(/_/g, ' ')));

        const board = JSON.parse(res.board);
        if (res.winner) {
            const msg = `🎮 *TIC TAC TOE*\n\n${renderBoard(board)}\n\n` +
                (res.winner === 'draw' ? `🤝 *DRAW!*` : `🏆 *WINNER:* @${res.winner.split('@')[0]}!`);
            await m.reply(msg);
        } else {
            await m.reply(`🎮 *TIC TAC TOE*\n\n${renderBoard(board)}\n\n🔄 @${res.currentTurn.split('@')[0]}'s turn!`);

            // AI Move
            if (res.isAi && res.currentTurn === 'bot') {
                const aiMove = findBestTttMove(board);
                const aiRes = await makeMove(m.chat, 'bot', aiMove);
                const aiBoard = JSON.parse(aiRes.board);

                let aiMsg = `🤖 AI moves to ${aiMove}...\n\n${renderBoard(aiBoard)}\n\n`;
                if (aiRes.winner) {
                    aiMsg += (aiRes.winner === 'draw' ? `🤝 *DRAW!*` : `🏆 *AI WINS!* Better luck next time.`);
                } else {
                    aiMsg += `🔄 Your turn @${m.sender.split('@')[0]}!`;
                }
                await m.reply(aiMsg);
            }
        }
    }
});
