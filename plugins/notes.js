import { addCommand } from '../lib/plugins.js';
import {
    initNotesDB,
    addNote,
    getNote,
    getAllNotes,
    updateNote,
    deleteNote,
    deleteAllNotes
} from '../lib/database.js';
import { getContextInfo } from '../src/utils/contextInfo.js';
import { log } from '../src/utils/logger.js';

initNotesDB();

function getUserName(jid) {
    return jid.split("@")[0];
}

// Help Command
addCommand({
    pattern: 'notes',
    react: '📝',
    category: 'notes',
    desc: 'Show all notes commands',
    handler: async (m, { conn }) => {
        const helpText = `📝 *NOTES COMMANDS*

*Add a note:*
.addnote <text>
.newnote <text>
.makenote <text>

*Get a specific note:*
.getnote <number>
.listnote <number>

*Get all your notes:*
.getnotes
.getallnotes
.listnotes

*Update a note:*
.updatenote <number> <new text>

*Delete a specific note:*
.delnote <number>
.deletenote <number>
.removenote <number>

*Delete all your notes:*
.delallnotes
.removeallnotes
.deleteallnotes

_Notes are personal and stored securely in the database._`;

        await conn.sendMessage(m.chat, {
            text: helpText,
            contextInfo: await getContextInfo(),
        }, { quoted: m });
    }
});

// Add Note
addCommand({
    pattern: 'addnote',
    alias: ['newnote', 'makenote', 'createnote'],
    react: '📝',
    category: 'notes',
    desc: 'Add a new note',
    handler: async (m, { text, conn }) => {
        let noteContent = text?.trim() || "";

        if (!noteContent && m.quoted) {
            const quotedMsg = m.quoted.msg || m.quoted;
            if (quotedMsg.caption) noteContent = quotedMsg.caption;
            else if (m.quoted.text) noteContent = m.quoted.text;
        }

        if (!noteContent) {
            return await conn.sendMessage(m.chat, {
                text: `❌ Hey @${getUserName(m.sender)}, provide content for your note.\n\nUsage: .addnote <your note text>\nOr reply to a message with .addnote`,
                contextInfo: await getContextInfo([m.sender]),
            }, { quoted: m });
        }

        try {
            const note = await addNote(m.sender, noteContent);
            await conn.sendMessage(m.chat, {
                text: `✅ Hey @${getUserName(m.sender)}, Note #${note.noteNumber} saved!\n\n📝 "${note.content}"`,
                contextInfo: await getContextInfo([m.sender]),
            }, { quoted: m });
        } catch (e) {
            console.error(e);
            m.reply("❌ Failed to save note.");
        }
    }
});

// Get Note
addCommand({
    pattern: 'getnote',
    alias: ['listnote', 'viewnote', 'shownote'],
    react: '📄',
    category: 'notes',
    desc: 'Get a specific note by number',
    handler: async (m, { text, conn }) => {
        if (!text || isNaN(parseInt(text))) {
            return await conn.sendMessage(m.chat, {
                text: `❌ Hey @${getUserName(m.sender)}, provide a note number.\n\nUsage: .getnote <number>`,
                contextInfo: await getContextInfo([m.sender]),
            }, { quoted: m });
        }

        const noteNumber = parseInt(text);
        const note = await getNote(m.sender, noteNumber);

        if (!note) {
            return await conn.sendMessage(m.chat, {
                text: `❌ Hey @${getUserName(m.sender)}, Note #${noteNumber} not found.`,
                contextInfo: await getContextInfo([m.sender]),
            }, { quoted: m });
        }

        await conn.sendMessage(m.chat, {
            text: `📝 Hey @${getUserName(m.sender)}, here's *Note #${note.noteNumber}*\n\n${note.content}\n\n_Created: ${new Date(note.createdAt).toLocaleString()}_`,
            contextInfo: await getContextInfo([m.sender]),
        }, { quoted: m });
    }
});

// Get All Notes
addCommand({
    pattern: 'getnotes',
    alias: ['getallnotes', 'listnotes', 'allnotes', 'mynotes', 'viewnotes'],
    react: '📋',
    category: 'notes',
    desc: 'Get all your notes',
    handler: async (m, { conn }) => {
        const notes = await getAllNotes(m.sender);

        if (notes.length === 0) {
            return await conn.sendMessage(m.chat, {
                text: `📭 Hey @${getUserName(m.sender)}, you have no notes yet.\n\nUse .addnote <text> to create one!`,
                contextInfo: await getContextInfo([m.sender]),
            }, { quoted: m });
        }

        let text = `📋 Hey @${getUserName(m.sender)}, here are *YOUR NOTES (${notes.length})*\n\n`;
        notes.forEach((note) => {
            const content = note.content || "";
            const preview = content.length > 50 ? content.substring(0, 50) + "..." : content;
            text += `*#${note.noteNumber}* - ${preview}\n`;
        });
        text += `\n_Use .getnote <number> to view full note_`;

        await conn.sendMessage(m.chat, {
            text,
            contextInfo: await getContextInfo([m.sender]),
        }, { quoted: m });
    }
});

// Update Note
addCommand({
    pattern: 'updatenote',
    alias: ['editnote', 'modifynote'],
    react: '✏️',
    category: 'notes',
    desc: 'Update an existing note',
    handler: async (m, { text, conn }) => {
        if (!text || text.trim() === "") {
            return await conn.sendMessage(m.chat, {
                text: `❌ Hey @${getUserName(m.sender)}, provide note number and new content.\n\nUsage: .updatenote <number> <new text>`,
                contextInfo: await getContextInfo([m.sender]),
            }, { quoted: m });
        }

        const parts = text.trim().split(/\s+/);
        const noteNumber = parseInt(parts[0]);

        if (isNaN(noteNumber)) {
            return await conn.sendMessage(m.chat, {
                text: `❌ Hey @${getUserName(m.sender)}, first argument must be a note number.\n\nUsage: .updatenote <number> <new text>`,
                contextInfo: await getContextInfo([m.sender]),
            }, { quoted: m });
        }

        const newContent = parts.slice(1).join(" ");
        if (!newContent) {
            return await conn.sendMessage(m.chat, {
                text: `❌ Hey @${getUserName(m.sender)}, provide new content for the note.\n\nUsage: .updatenote <number> <new text>`,
                contextInfo: await getContextInfo([m.sender]),
            }, { quoted: m });
        }

        const note = await updateNote(m.sender, noteNumber, newContent);

        if (!note) {
            return await conn.sendMessage(m.chat, {
                text: `❌ Hey @${getUserName(m.sender)}, Note #${noteNumber} not found.`,
                contextInfo: await getContextInfo([m.sender]),
            }, { quoted: m });
        }

        await conn.sendMessage(m.chat, {
            text: `✅ Hey @${getUserName(m.sender)}, Note #${note.noteNumber} updated!\n\n📝 "${note.content}"`,
            contextInfo: await getContextInfo([m.sender]),
        }, { quoted: m });
    }
});

// Delete Note
addCommand({
    pattern: 'delnote',
    alias: ['deletenote', 'removenote', 'rmnote'],
    react: '🗑️',
    category: 'notes',
    desc: 'Delete a specific note',
    handler: async (m, { text, conn }) => {
        if (!text || isNaN(parseInt(text))) {
            return await conn.sendMessage(m.chat, {
                text: `❌ Hey @${getUserName(m.sender)}, provide a note number to delete.\n\nUsage: .delnote <number>`,
                contextInfo: await getContextInfo([m.sender]),
            }, { quoted: m });
        }

        const noteNumber = parseInt(text);
        const deleted = await deleteNote(m.sender, noteNumber);

        if (!deleted) {
            return await conn.sendMessage(m.chat, {
                text: `❌ Hey @${getUserName(m.sender)}, Note #${noteNumber} not found.`,
                contextInfo: await getContextInfo([m.sender]),
            }, { quoted: m });
        }

        await conn.sendMessage(m.chat, {
            text: `✅ Hey @${getUserName(m.sender)}, Note #${noteNumber} deleted!`,
            contextInfo: await getContextInfo([m.sender]),
        }, { quoted: m });
    }
});

// Delete All Notes
addCommand({
    pattern: 'delallnotes',
    alias: ['deleteallnotes', 'removeallnotes', 'clearnotes', 'delnotes'],
    react: '🗑️',
    category: 'notes',
    desc: 'Delete all your notes',
    handler: async (m, { conn }) => {
        const count = await deleteAllNotes(m.sender);

        if (count === 0) {
            return await conn.sendMessage(m.chat, {
                text: `📭 Hey @${getUserName(m.sender)}, you have no notes to delete.`,
                contextInfo: await getContextInfo([m.sender]),
            }, { quoted: m });
        }

        await conn.sendMessage(m.chat, {
            text: `✅ Hey @${getUserName(m.sender)}, deleted ${count} note${count > 1 ? "s" : ""}!`,
            contextInfo: await getContextInfo([m.sender]),
        }, { quoted: m });
    }
});
