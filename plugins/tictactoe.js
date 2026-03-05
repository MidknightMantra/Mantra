const sessions = new Map();

const WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
    [0, 4, 8], [2, 4, 6]             // Diagonals
];

function checkWinner(board) {
    for (let line of WIN_LINES) {
        if (board[line[0]] !== '⬛' &&
            board[line[0]] === board[line[1]] &&
            board[line[1]] === board[line[2]]) {
            return board[line[0]]; // '❌' or '⭕'
        }
    }
    if (!board.includes('⬛')) return 'DRAW';
    return null;
}

function renderBoard(board) {
    return `
${board[0]} | ${board[1]} | ${board[2]}
${board[3]} | ${board[4]} | ${board[5]}
${board[6]} | ${board[7]} | ${board[8]}
`.trim();
}

module.exports = {
    name: "tictactoe",
    react: "🎮",
    category: "game",
    description: "Play Tic-Tac-Toe with someone in the group",
    usage: ",ttt @user (to start) | ,ttt <1-9> (to play)",
    aliases: ["ttt", "tic"],

    execute: async (_sock, m) => {
        if (!m.isGroup) {
            return m.reply("Tic-Tac-Toe can only be played in groups.");
        }

        const chatId = m.from;
        const senderId = m.sender;
        const arg = m.args?.[0]?.toLowerCase();

        // Check if there's an active session in this group
        let session = sessions.get(chatId);

        if (arg === "del" || arg === "stop") {
            if (!session) return m.reply("No active Tic-Tac-Toe game in this group.");
            if (session.playerX !== senderId && session.playerO !== senderId && !m.isGroupAdmin && !m.isOwner) {
                return m.reply("Only the players or admins can stop the game.");
            }
            sessions.delete(chatId);
            return m.reply("🛑 Tic-Tac-Toe game stopped.");
        }

        // Handle making a move (1-9)
        const move = parseInt(arg);
        if (!isNaN(move) && move >= 1 && move <= 9) {
            if (!session) return m.reply(`No active game. Start one with ${m.prefix}ttt @user`);

            if (session.turn !== senderId) {
                return m.reply("It's not your turn!");
            }

            const index = move - 1;
            if (session.board[index] !== '⬛') {
                return m.reply("That spot is already taken! Choose another number (1-9).");
            }

            const symbol = session.turn === session.playerX ? '❌' : '⭕';
            session.board[index] = symbol;

            const winner = checkWinner(session.board);

            if (winner) {
                sessions.delete(chatId);
                const boardStr = renderBoard(session.board);

                if (winner === 'DRAW') {
                    return m.reply(`*🏁 GAME OVER - IT'S A DRAW!*\n\n${boardStr}`);
                } else {
                    return m.reply(`*🏆 GAME OVER!*\n\n${boardStr}\n\n🎉 Winner: @${senderId.split('@')[0]}`, { mentions: [senderId] });
                }
            }

            // Switch turn
            session.turn = session.turn === session.playerX ? session.playerO : session.playerX;
            const nextSymbol = session.turn === session.playerX ? '❌' : '⭕';

            return m.reply(`*🎮 Tic-Tac-Toe*\n\n${renderBoard(session.board)}\n\nNext Turn: @${session.turn.split('@')[0]} (${nextSymbol})\nUse ${m.prefix}ttt <1-9> to move.`, { mentions: [session.turn] });
        }

        // Start a new game
        if (session) {
            return m.reply(`There is already an active game between @${session.playerX.split('@')[0]} and @${session.playerO.split('@')[0]}.\nUse ${m.prefix}ttt stop to end it.`, { mentions: [session.playerX, session.playerO] });
        }

        const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
        if (!mentioned) {
            return m.reply(`Mention a user to challenge them!\nExample: ${m.prefix}ttt @user`);
        }
        if (mentioned === senderId) {
            return m.reply("You cannot play against yourself.");
        }

        sessions.set(chatId, {
            playerX: senderId,
            playerO: mentioned,
            turn: senderId, // X goes first
            board: Array(9).fill('⬛')
        });

        const initialBoard = renderBoard(sessions.get(chatId).board);
        await m.reply(`*🎮 Tic-Tac-Toe CHALLENGE!*\n\n@${senderId.split('@')[0]} (❌) vs @${mentioned.split('@')[0]} (⭕)\n\n${initialBoard}\n\nIt is @${senderId.split('@')[0]}'s turn.\nReply with ${m.prefix}ttt <1-9> to make your move!`, { mentions: [senderId, mentioned] });
    }
};
