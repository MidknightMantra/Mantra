import {
    gameTimeouts,
    diceTimeouts,
    wcgTimeouts,
    renderBoard,
    getPlayerName,
    makeMove,
    endGame,
    submitWord,
    endWcgGame,
    playerRoll,
    endDiceGame,
    findBestTttMove,
    findWcgWord,
    getDiceEmoji
} from './games.js';
import { log } from '../src/utils/logger.js';

const BOT_JID = 'bot'; // Using 'bot' as internal ID for AI

/**
 * CLEAR TIMEOUTS
 */
export const clearGameTimeout = (chatId) => {
    if (gameTimeouts.has(chatId)) {
        clearTimeout(gameTimeouts.get(chatId));
        gameTimeouts.delete(chatId);
    }
};

export const clearWcgTimeout = (chatId) => {
    if (wcgTimeouts.has(chatId)) {
        clearTimeout(wcgTimeouts.get(chatId));
        wcgTimeouts.delete(chatId);
    }
};

export const clearDiceTimeout = (chatId) => {
    if (diceTimeouts.has(chatId)) {
        clearTimeout(diceTimeouts.get(chatId));
        diceTimeouts.delete(chatId);
    }
};

/**
 * SET TIMEOUTS
 */
export const setMoveTimeout = (chatId, conn, currentTurn, player1, player2) => {
    clearGameTimeout(chatId);
    const timeout = setTimeout(async () => {
        await endGame(chatId);
        await conn.sendMessage(chatId, {
            text: `⏰ *TIC TAC TOE - TIMEOUT*\n\n@${getPlayerName(currentTurn)} failed to move! Game ended.`,
            mentions: [currentTurn]
        });
    }, 30000);
    gameTimeouts.set(chatId, timeout);
};

export const setWcgTurnTimeout = (chatId, conn, currentTurn) => {
    clearWcgTimeout(chatId);
    const timeout = setTimeout(async () => {
        const scores = await endWcgGame(chatId);
        await conn.sendMessage(chatId, {
            text: `⏰ *WORD CHAIN - TIMEOUT*\n\n@${getPlayerName(currentTurn)} failed to reply! Game ended.`,
            mentions: [currentTurn]
        });
    }, 30000);
    wcgTimeouts.set(chatId, timeout);
};

export const setDiceTurnTimeout = (chatId, conn, currentTurn) => {
    clearDiceTimeout(chatId);
    const timeout = setTimeout(async () => {
        await endDiceGame(chatId);
        await conn.sendMessage(chatId, {
            text: `⏰ *DICE GAME - TIMEOUT*\n\n@${getPlayerName(currentTurn)} failed to roll! Game ended.`,
            mentions: [currentTurn]
        });
    }, 30000);
    diceTimeouts.set(chatId, timeout);
};

/**
 * AI MOVE HANDLERS
 */
export async function handleAiTttMove(chatId, conn, game) {
    const board = JSON.parse(game.board);
    const move = findBestTttMove(board);

    // Simulate thinking
    await new Promise(r => setTimeout(r, 1500));

    const result = await makeMove(chatId, 'bot', move);
    if (result.error) return;

    const newBoard = JSON.parse(result.board);
    if (result.winner) {
        let text = `🤖 AI moved to ${move}!\n\n${renderBoard(newBoard)}\n\n`;
        text += result.winner === 'draw' ? "🤝 *It's a draw!*" : "🤖 *AI Wins!* Hard luck next time.";
        await conn.sendMessage(chatId, { text });
        return;
    }

    await conn.sendMessage(chatId, {
        text: `🤖 AI moved to ${move}!\n\n${renderBoard(newBoard)}\n\n@${getPlayerName(result.player1)}'s turn (❌)`,
        mentions: [result.player1]
    });
}

export async function handleAiWcgMove(chatId, conn, game) {
    const aiWord = findWcgWord(game.lastWord, game.usedWords);

    await new Promise(r => setTimeout(r, 1500));

    if (!aiWord) {
        const scores = await endWcgGame(chatId);
        await conn.sendMessage(chatId, { text: `🎉 *YOU WIN!* 🤖 AI couldn't find a word!` });
        return;
    }

    const result = await submitWord(chatId, 'bot', aiWord);
    if (result.error) return;

    await conn.sendMessage(chatId, {
        text: `🤖 AI says: *${result.word.toUpperCase()}*\n\n🔄 @${getPlayerName(result.nextPlayer)}'s turn\nNext word starts with: *${result.word.slice(-1).toUpperCase()}*`,
        mentions: [result.nextPlayer]
    });
}

export async function handleAiDiceRoll(chatId, conn, game) {
    await new Promise(r => setTimeout(r, 1500));

    const result = await playerRoll(chatId, 'bot');
    if (result.error) return;

    let text = `🤖 AI rolled: ${getDiceEmoji(result.roll)} *${result.roll}*\n\n`;

    if (result.roundComplete) {
        text = `🎲 *Round ${result.currentRound} Results*\n\n` +
            `👤 @${getPlayerName(result.player1)}: ${getDiceEmoji(result.player1Roll)} ${result.player1Roll}\n` +
            `🤖 AI: ${getDiceEmoji(result.player2Roll)} ${result.player2Roll}\n\n`;

        if (result.roundWinner) {
            text += result.roundWinner === 'bot' ? "🤖 *AI wins this round!*" : `🏆 *You win this round!*`;
        } else {
            text += "🤝 *It's a tie!*";
        }

        text += `\n📊 *Score:* You ${result.player1Score} - ${result.player2Score} AI`;

        if (result.gameFinished) {
            text += `\n\n🎮 *GAME OVER!*\n`;
            text += result.player1Score > result.player2Score ? "🏆 *CONGRATULATIONS! You won!*" : (result.player2Score > result.player1Score ? "🤖 *AI WON!* Better luck next time." : "🤝 *It's a Draw!*");
            await endDiceGame(chatId);
        } else {
            text += `\n\n*Round ${result.nextRound}*\n@${getPlayerName(result.player1)}, your turn! Type *.roll*`;
            setDiceTurnTimeout(chatId, conn, result.player1);
        }
    } else {
        text += `@${getPlayerName(result.waitingFor)}, your turn! Type *.roll*`;
        setDiceTurnTimeout(chatId, conn, result.waitingFor);
    }

    await conn.sendMessage(chatId, { text, mentions: [result.player1] });
}

