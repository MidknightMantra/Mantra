/**
 * Game Engine for Mantra
 * Handles logic and state for TicTacToe, Word Chain, and Dice games
 */

import { log } from '../src/utils/logger.js';

// --- SHARED STATE ---
const gameStates = {
    ttt: new Map(), // TicTacToe
    wcg: new Map(), // Word Chain
    dice: new Map() // Dice
};

export const gameTimeouts = new Map();
export const diceTimeouts = new Map();
export const wcgTimeouts = new Map();

// --- HELPERS ---

export const getPlayerName = (jid) => jid ? jid.split('@')[0] : 'Unknown';

/**
 * Render TicTacToe Board
 */
export const renderBoard = (board) => {
    const b = board.map(val => typeof val === 'number' ? ` ${val} ` : (val === 'X' ? '❌' : '⭕'));
    return `   ${b[0]} | ${b[1]} | ${b[2]} \n` +
        `  ───┼───┼───\n` +
        `   ${b[3]} | ${b[4]} | ${b[5]} \n` +
        `  ───┼───┼───\n` +
        `   ${b[6]} | ${b[7]} | ${b[8]} `;
};

/**
 * Check TicTacToe Winner
 */
const checkTttWinner = (board) => {
    const wins = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
        [0, 4, 8], [2, 4, 6]             // Diagonals
    ];
    for (const [a, b, c] of wins) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    return board.every(val => typeof val !== 'number') ? 'draw' : null;
};

// --- TIC TAC TOE ENGINE ---

export async function createGame(chatId, player1, msgKey, isAi = false) {
    gameStates.ttt.set(chatId, {
        chatId,
        player1,
        player2: isAi ? 'bot' : null,
        board: [1, 2, 3, 4, 5, 6, 7, 8, 9],
        currentTurn: player1,
        status: isAi ? 'active' : 'waiting',
        isAi,
        msgKey
    });
}

export async function joinGame(chatId, player2) {
    const game = gameStates.ttt.get(chatId);
    if (!game || game.status !== 'waiting') return null;
    if (game.player1 === player2) return { error: 'same_player' };

    game.player2 = player2;
    game.status = 'active';
    return { ...game, board: JSON.stringify(game.board) };
}

export async function getActiveGame(chatId) {
    const game = gameStates.ttt.get(chatId);
    return (game && game.status === 'active') ? { ...game, board: JSON.stringify(game.board) } : null;
}

export async function getWaitingGame(chatId) {
    const game = gameStates.ttt.get(chatId);
    return (game && game.status === 'waiting') ? game : null;
}

export async function makeMove(chatId, player, position) {
    const game = gameStates.ttt.get(chatId);
    if (!game || game.status !== 'active' || game.currentTurn !== player) return { error: 'not_turn' };

    const idx = parseInt(position) - 1;
    if (isNaN(idx) || idx < 0 || idx > 8 || typeof game.board[idx] !== 'number') return { error: 'invalid_move' };

    const symbol = player === game.player1 ? 'X' : 'O';
    game.board[idx] = symbol;

    const winner = checkTttWinner(game.board);
    if (winner) {
        const result = { ...game, board: JSON.stringify(game.board), winner: winner === 'draw' ? 'draw' : player };
        gameStates.ttt.delete(chatId);
        return result;
    }

    game.currentTurn = (player === game.player1) ? game.player2 : game.player1;
    return { ...game, board: JSON.stringify(game.board) };
}

export async function endGame(chatId) {
    gameStates.ttt.delete(chatId);
}

// --- WORD CHAIN ENGINE ---

export async function createWcgGame(chatId, host) {
    gameStates.wcg.set(chatId, {
        chatId,
        players: [host],
        currentTurn: host,
        lastWord: null,
        usedWords: [],
        scores: { [host]: 0 },
        status: 'waiting',
        isAi: false
    });
}

export async function joinWcgGame(chatId, player) {
    const game = gameStates.wcg.get(chatId);
    if (!game || game.status !== 'waiting') return { error: 'no_game' };
    if (game.players.includes(player)) return { error: 'already_joined' };

    game.players.push(player);
    game.scores[player] = 0;
    return { players: game.players };
}

export async function startWcgGame(chatId) {
    const game = gameStates.wcg.get(chatId);
    if (!game || game.players.length < (game.isAi ? 1 : 2)) return { error: 'not_enough_players' };
    game.status = 'active';
    return { players: game.players, currentTurn: game.currentTurn, game };
}

export async function submitWord(chatId, player, word) {
    const game = gameStates.wcg.get(chatId);
    if (!game || game.status !== 'active' || game.currentTurn !== player) return { error: 'not_your_turn' };

    word = word.toLowerCase();
    if (word.length < 2) return { error: 'too_short' };
    if (game.usedWords.includes(word)) return { error: 'word_used' };

    if (game.lastWord) {
        const lastLetter = game.lastWord.slice(-1);
        if (word[0] !== lastLetter) return { error: 'wrong_letter', expected: lastLetter };
    }

    game.usedWords.push(word);
    game.lastWord = word;
    game.scores[player] += word.length;

    const currentIndex = game.players.indexOf(player);
    const nextIndex = (currentIndex + 1) % game.players.length;
    game.currentTurn = game.players[nextIndex];

    return {
        word,
        nextPlayer: game.currentTurn,
        wordCount: game.usedWords.length,
        game
    };
}

export async function endWcgGame(chatId) {
    const game = gameStates.wcg.get(chatId);
    const scores = game ? game.scores : {};
    gameStates.wcg.delete(chatId);
    return scores;
}

export async function getActiveWcgGame(chatId) {
    return gameStates.wcg.get(chatId) || null;
}

export async function getWaitingWcgGame(chatId) {
    const game = gameStates.wcg.get(chatId);
    return (game && game.status === 'waiting') ? game : null;
}

// --- DICE ENGINE ---

export async function createDiceGame(chatId, player1, rounds = 3) {
    gameStates.dice.set(chatId, {
        chatId,
        player1,
        player2: null,
        rounds,
        currentRound: 1,
        player1Score: 0,
        player2Score: 0,
        player1Roll: null,
        player2Roll: null,
        currentTurn: player1,
        status: 'waiting'
    });
}

export async function joinDiceGame(chatId, player2) {
    const game = gameStates.dice.get(chatId);
    if (!game || game.status !== 'waiting') return { error: 'no_game' };
    if (game.player1 === player2) return { error: 'same_player' };

    game.player2 = player2;
    game.status = 'active';
    return { ...game };
}

export async function playerRoll(chatId, player) {
    const game = gameStates.dice.get(chatId);
    if (!game || game.status !== 'active' || game.currentTurn !== player) return { error: 'not_your_turn' };

    const roll = Math.floor(Math.random() * 6) + 1;

    if (player === game.player1) {
        game.player1Roll = roll;
        game.currentTurn = game.player2;
        return { roll, waitingFor: game.player2 };
    } else {
        game.player2Roll = roll;
        const p1Roll = game.player1Roll;
        const p2Roll = roll;

        let roundWinner = null;
        if (p1Roll > p2Roll) {
            game.player1Score++;
            roundWinner = game.player1;
        } else if (p2Roll > p1Roll) {
            game.player2Score++;
            roundWinner = game.player2;
        }

        const result = {
            roundComplete: true,
            currentRound: game.currentRound,
            player1Roll: p1Roll,
            player2Roll: p2Roll,
            roundWinner,
            player1Score: game.player1Score,
            player2Score: game.player2Score,
            player1: game.player1,
            player2: game.player2
        };

        if (game.currentRound >= game.rounds) {
            result.gameFinished = true;
            result.gameWinner = game.player1Score > game.player2Score ? game.player1 : (game.player2Score > game.player1Score ? game.player2 : null);
        } else {
            game.currentRound++;
            game.player1Roll = null;
            game.player2Roll = null;
            game.currentTurn = game.player1;
            result.nextRound = game.currentRound;
        }
        return result;
    }
}

export async function endDiceGame(chatId) {
    gameStates.dice.delete(chatId);
}

export async function getActiveDiceGame(chatId) {
    return gameStates.dice.get(chatId) || null;
}

export async function getWaitingDiceGame(chatId) {
    const game = gameStates.dice.get(chatId);
    return (game && game.status === 'waiting') ? game : null;
}

// --- AI LOGIC ---

export const findBestTttMove = (board) => {
    // 1. Try to win
    for (let i = 0; i < 9; i++) {
        if (typeof board[i] === 'number') {
            const copy = [...board];
            copy[i] = 'O';
            if (checkTttWinner(copy) === 'O') return i + 1;
        }
    }
    // 2. Try to block player
    for (let i = 0; i < 9; i++) {
        if (typeof board[i] === 'number') {
            const copy = [...board];
            copy[i] = 'X';
            if (checkTttWinner(copy) === 'X') return i + 1;
        }
    }
    // 3. Center
    if (typeof board[4] === 'number') return 5;
    // 4. Corners
    const corners = [0, 2, 6, 8].filter(i => typeof board[i] === 'number');
    if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)] + 1;
    // 5. Random
    const available = board.filter(v => typeof v === 'number');
    return available.length > 0 ? available[Math.floor(Math.random() * available.length)] : null;
};

export const findWcgWord = (lastWord, usedWords) => {
    // Representative AI dictionary - in production use a real dictionary lib
    const words = ['apple', 'ant', 'bear', 'cat', 'dog', 'elephant', 'fish', 'goat', 'horse', 'ice', 'jump', 'kite', 'lion', 'monkey', 'nest', 'owl', 'pig', 'queen', 'rat', 'snake', 'tiger', 'umbrella', 'van', 'whale', 'x-ray', 'yak', 'zebra'];
    const letter = lastWord ? lastWord.slice(-1) : 'a';
    const possible = words.filter(w => w.startsWith(letter) && !usedWords.includes(w));
    return possible.length > 0 ? possible[Math.floor(Math.random() * possible.length)] : null;
};

export const getDiceEmoji = (num) => ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][num - 1] || '🎲';

export const formatScores = (scores) => {
    return Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .map(([jid, score]) => `👤 @${getPlayerName(jid)}: ${score} pts`)
        .join('\n');
};

// --- INITIALIZATION ---
export const initGamesDB = () => log.info('Games Engine Initialized');
export const initWcgDB = () => log.info('WCG Engine Initialized');
export const initDiceDB = () => log.info('Dice Engine Initialized');
