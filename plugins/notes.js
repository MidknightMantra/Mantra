import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import {
    initNotesDB,
    addNote,
    getNote,
    getAllNotes,
    updateNote,
    deleteNote,
    deleteAllNotes
} from '../lib/database.js';
import { react, withReaction } from '../src/utils/messaging.js';

// Initialize DB on load
initNotesDB();

/**
 * HELP COMMAND
 */
addCommand({
    pattern: 'notes',
    alias: ['notemenu'],
    category: 'notes',
    react: '📝',
    desc: 'Show all notes commands',
    handler: async (m, { conn }) => {
        const helpText = `✧ *${global.botName} NOTES SYSTEM* ✧\n${global.divider}\n` +
            `*Commands:* \n` +
            `▫️ .addnote <text> | Create a new note\n` +
            `▫️ .getnotes        | List all your notes\n` +
            `▫️ .getnote <num>   | View full content of a note\n` +
            `▫️ .updatenote <num> <text> | Edit a note\n` +
            `▫️ .delnote <num>    | Delete a specific note\n` +
            `▫️ .delallnotes     | Wipe all your notes\n\n` +
            `_Notes are personal and stored securely._`;

        await conn.sendMessage(m.chat, { text: helpText }, { quoted: m });
        await react(conn, m, '✅');
    }
});

/**
 * ADD NOTE
 */
addCommand({
    pattern: 'addnote',
    alias: ['newnote', 'makenote', 'createnote'],
    category: 'notes',
    react: '✏️',
    desc: 'Add a new private note',
    handler: async (m, { conn, text, quoted }) => {
        let content = text?.trim();

        // Handle quoted message content
        if (!content && quoted) {
            content = quoted.body || quoted.caption || '';
        }

        if (!content) return m.reply(`${global.emojis.warning} Usage: .addnote <text> or reply to a message.`);

        try {
            const note = await addNote(m.sender, content);
            await m.reply(`✅ *Note #${note.noteNumber} Saved!*\n\n"${note.content.length > 100 ? note.content.slice(0, 100) + '...' : note.content}"`);
            await react(conn, m, '✅');
        } catch (e) {
            log.error('AddNote failed', e);
            m.reply(UI.error('Notes Error', 'Failed to save note', e.message));
        }
    }
});

/**
 * GET ALL NOTES
 */
addCommand({
    pattern: 'getnotes',
    alias: ['listnotes', 'mynotes', 'allnotes'],
    category: 'notes',
    react: '📋',
    desc: 'View list of all your notes',
    handler: async (m, { conn }) => {
        try {
            const notes = await getAllNotes(m.sender);
            if (notes.length === 0) return m.reply('📭 You have no notes yet. Create one with .addnote');

            let txt = `📋 *YOUR NOTES (${notes.length})*\n${global.divider}\n`;
            notes.forEach(note => {
                const preview = note.content.length > 40 ? note.content.slice(0, 40) + '...' : note.content;
                txt += `*#${note.noteNumber}* | ${preview}\n`;
            });
            txt += `\n_Use .getnote <number> to see full content_`;

            await m.reply(txt);
            await react(conn, m, '✅');
        } catch (e) {
            log.error('GetNotes failed', e);
            m.reply(UI.error('Notes Error', 'Failed to list notes', e.message));
        }
    }
});

/**
 * GET SPECIFIC NOTE
 */
addCommand({
    pattern: 'getnote',
    alias: ['viewnote', 'shownote'],
    category: 'notes',
    react: '📄',
    desc: 'View full content of a note',
    handler: async (m, { conn, args }) => {
        if (!args[0] || isNaN(args[0])) return m.reply(`${global.emojis.warning} Usage: .getnote <number>`);

        const num = parseInt(args[0]);
        try {
            const note = await getNote(m.sender, num);
            if (!note) return m.reply(`❌ Note #${num} not found.`);

            const txt = `📄 *NOTE #${note.noteNumber}*\n${global.divider}\n` +
                `${note.content}\n\n` +
                `🕒 _Created: ${new Date(note.createdAt).toLocaleString()}_`;

            await m.reply(txt);
            await react(conn, m, '✅');
        } catch (e) {
            log.error('GetNote failed', e);
            m.reply(UI.error('Notes Error', 'Failed to fetch note', e.message));
        }
    }
});

/**
 * UPDATE NOTE
 */
addCommand({
    pattern: 'updatenote',
    alias: ['editnote'],
    category: 'notes',
    react: '✏️',
    desc: 'Update an existing note',
    handler: async (m, { conn, text, args }) => {
        const num = parseInt(args[0]);
        const newContent = text.split(' ').slice(1).join(' ');

        if (isNaN(num) || !newContent) return m.reply(`${global.emojis.warning} Usage: .updatenote <num> <new text>`);

        try {
            const note = await updateNote(m.sender, num, newContent);
            if (!note) return m.reply(`❌ Note #${num} not found.`);

            await m.reply(`✅ *Note #${num} Updated!*`);
            await react(conn, m, '✅');
        } catch (e) {
            log.error('UpdateNote failed', e);
            m.reply(UI.error('Notes Error', 'Failed to update note', e.message));
        }
    }
});

/**
 * DELETE NOTE
 */
addCommand({
    pattern: 'delnote',
    alias: ['rmnote', 'removenote'],
    category: 'notes',
    react: '🗑️',
    desc: 'Delete a specific note',
    handler: async (m, { conn, args }) => {
        if (!args[0] || isNaN(args[0])) return m.reply(`${global.emojis.warning} Usage: .delnote <number>`);

        const num = parseInt(args[0]);
        try {
            const deleted = await deleteNote(m.sender, num);
            if (!deleted) return m.reply(`❌ Note #${num} not found.`);

            await m.reply(`✅ *Note #${num} Deleted.*`);
            await react(conn, m, '✅');
        } catch (e) {
            log.error('DeleteNote failed', e);
            m.reply(UI.error('Notes Error', 'Failed to delete note', e.message));
        }
    }
});

/**
 * DELETE ALL NOTES
 */
addCommand({
    pattern: 'delallnotes',
    alias: ['clearnotes'],
    category: 'notes',
    react: '🗑️',
    desc: 'Delete all your notes',
    handler: async (m, { conn }) => {
        try {
            const count = await deleteAllNotes(m.sender);
            if (count === 0) return m.reply('📭 You have no notes to delete.');

            await m.reply(`✅ Successfully deleted all *${count}* notes.`);
            await react(conn, m, '✅');
        } catch (e) {
            log.error('DelAllNotes failed', e);
            m.reply(UI.error('Notes Error', 'Failed to clear notes', e.message));
        }
    }
});

log.info('Notes plugin loaded');
