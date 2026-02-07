import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';
import { react, withReaction } from '../src/utils/messaging.js';
import { getAllUsersNotes, deleteNoteById, updateNoteById, deleteAllNotes } from '../lib/database.js';
import { normalizeUserJid } from '../src/utils/jidHelper.js';

/**
 * VIEW ALL NOTES (ADMIN)
 */
addCommand({
    pattern: 'allnotes',
    alias: ['viewallnotes'],
    desc: 'View notes from all users across the bot',
    category: 'owner',
    handler: async (m, { conn, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');

        await withReaction(conn, m, '📋', async () => {
            const notes = await getAllUsersNotes();
            if (!notes || notes.length === 0) return m.reply('📭 No notes found in the database.');

            // Group by user
            const grouped = notes.reduce((acc, note) => {
                const user = note.userJid.split('@')[0];
                if (!acc[user]) acc[user] = [];
                acc[user].push(note);
                return acc;
            }, {});

            let txt = `📋 *GLOBAL SYSTEM NOTES*\n${global.divider}\n`;
            txt += `Total: *${notes.length}* notes from *${Object.keys(grouped).length}* users\n\n`;

            for (const [user, userNotes] of Object.entries(grouped)) {
                txt += `👤 *@${user}* (${userNotes.length})\n`;
                userNotes.forEach(n => {
                    const content = n.content.length > 30 ? n.content.slice(0, 30) + '...' : n.content;
                    txt += `  ▫️ ID: \`${n._id || n.id}\` | ${content}\n`;
                });
                txt += '\n';
            }

            txt += `${global.divider}\n_Use .admindelnote <id> to delete_`;
            await conn.sendMessage(m.chat, { text: txt, mentions: notes.map(n => n.userJid) }, { quoted: m });
        });
    }
});

/**
 * DELETE NOTE BY ID
 */
addCommand({
    pattern: 'admindelnote',
    desc: 'Force delete a specific note by its unique ID',
    category: 'owner',
    handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');
        if (!text) return m.reply('❌ Usage: .admindelnote <note_id>');

        await withReaction(conn, m, '🗑️', async () => {
            const success = await deleteNoteById(text.trim());
            if (success) {
                await m.reply(`✅ Note \`${text.trim()}\` has been deleted.`);
            } else {
                await m.reply('❌ Note not found or invalid ID.');
            }
        });
    }
});

/**
 * CLEAR ALL NOTES FOR A USER
 */
addCommand({
    pattern: 'adminclearnotes',
    desc: 'Wipe all notes for a specific user',
    category: 'owner',
    handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');
        if (!text) return m.reply('❌ Usage: .adminclearnotes <number>');

        const target = normalizeUserJid(text.trim());
        await withReaction(conn, m, '🗑️', async () => {
            const count = await deleteAllNotes(target);
            await m.reply(`✅ Deleted ${count} notes for user @${target.split('@')[0]}`, { mentions: [target] });
        });
    }
});

log.info('Notes Admin plugin loaded');
