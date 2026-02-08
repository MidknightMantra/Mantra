/**
 * Hybrid Database Adapter
 * Supports both MongoDB (production) and JSON file (development)
 * Automatically selects based on DATABASE_URL environment variable
 */

import mongoose from 'mongoose';
import path from 'path';
import _fs from 'fs';
const { promises: fs } = _fs;
import { log } from '../src/utils/logger.js';

const DB_FILE = './database.json';
const DATABASE_URL = process.env.DATABASE_URL;

// Determine database type
const useMongoDb = DATABASE_URL && DATABASE_URL.includes('mongodb');

// ============================================
// MongoDB Schema (if using MongoDB)
// ============================================
let SettingsModel, GroupModel, CachedMessageModel, TempMailModel, NoteModel;

if (useMongoDb) {
  const settingsSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: mongoose.Schema.Types.Mixed,
    updatedAt: { type: Date, default: Date.now }
  });

  const groupSchema = new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    antilink: { type: mongoose.Schema.Types.Mixed, default: 'off' }, // off, on, warn, kick
    antilinkWarnCount: { type: Number, default: 3 },
    welcome: { type: Boolean, default: false },
    welcomeText: { type: String, default: '' },
    goodbye: { type: Boolean, default: false },
    goodbyeText: { type: String, default: '' },
    groupEvents: { type: Boolean, default: false },
    antibad: { type: Boolean, default: false },
    badWords: { type: [String], default: [] },
    antibadWarnCount: { type: Number, default: 3 },
    antiGroupMention: { type: mongoose.Schema.Types.Mixed, default: 'off' }, // off, warn, kick
    antiGroupMentionWarnCount: { type: Number, default: 3 },
    updatedAt: { type: Date, default: Date.now }
  });

  const noteSchema = new mongoose.Schema({
    userJid: { type: String, required: true },
    noteNumber: { type: Number, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  });

  // Message cache schema for anti-delete (persistent storage)
  const cachedMessageSchema = new mongoose.Schema({
    messageId: { type: String, required: true },
    chatId: { type: String, required: true },
    sender: { type: String, required: true },
    message: mongoose.Schema.Types.Mixed, // The actual message content
    key: mongoose.Schema.Types.Mixed, // Message key for forwarding
    timestamp: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } // 7 days
  });

  const tempMailSchema = new mongoose.Schema({
    userJid: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true }
  });

  // TTL for tempmail - automatically delete expired emails
  tempMailSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

  // Create compound index for fast lookups
  cachedMessageSchema.index({ chatId: 1, messageId: 1 }, { unique: true });
  // TTL index - automatically delete messages after expiresAt
  cachedMessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

  SettingsModel = mongoose.model('Settings', settingsSchema);
  GroupModel = mongoose.model('Groups', groupSchema);
  CachedMessageModel = mongoose.model('CachedMessages', cachedMessageSchema);
  TempMailModel = mongoose.model('TempMail', tempMailSchema);
  NoteModel = mongoose.model('Notes', noteSchema);

  // Connect to MongoDB
  mongoose.connect(DATABASE_URL).then(() => {
    console.log('✅ MongoDB connected:', DATABASE_URL.split('@')[1]?.split('/')[0] || 'database');
    log.action('MongoDB connected', 'database');
  }).catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
    log.error('MongoDB connection failed', err);
  });
}

// ============================================
// JSON File Database (fallback)
// ============================================
class JsonDatabase {
  constructor(filepath) {
    this.file = path.resolve(filepath);
    this.data = { settings: {}, groups: {}, tempmail: {}, notes: [] };
    this._load();
  }

  _load() {
    try {
      if (_fs.existsSync(this.file)) {
        const content = _fs.readFileSync(this.file, 'utf-8');
        this.data = JSON.parse(content);
      } else {
        this._save();
      }
    } catch (error) {
      log.error('Failed to load JSON database', error);
      this.data = { settings: {}, groups: {}, tempmail: {}, notes: [] };
    }
  }

  _save() {
    try {
      _fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
    } catch (error) {
      log.error('Failed to save JSON database', error);
    }
  }

  async get(collection, key) {
    return this.data[collection]?.[key];
  }

  async set(collection, key, value) {
    if (!this.data[collection]) this.data[collection] = {};
    this.data[collection][key] = value;
    this._save();
  }

  async delete(collection, key) {
    if (this.data[collection]) {
      delete this.data[collection][key];
      this._save();
    }
  }
}

const jsonDb = !useMongoDb ? new JsonDatabase(DB_FILE) : null;

// ============================================
// Unified Database Interface
// ============================================

/**
 * Set antilink status for a group
 */
export async function setAntilink(groupId, enabled) {
  try {
    if (useMongoDb) {
      await GroupModel.findOneAndUpdate(
        { groupId },
        { antilink: enabled, updatedAt: new Date() },
        { upsert: true }
      );
    } else {
      await jsonDb.set('groups', groupId, { ...await jsonDb.get('groups', groupId), antilink: enabled });
    }
    log.action(`Antilink ${enabled ? 'enabled' : 'disabled'}`, 'database', { groupId });
  } catch (error) {
    log.error('Failed to set antilink', error, { groupId, enabled });
  }
}

/**
 * Check if antilink is enabled for a group
 */
export async function isAntilinkOn(groupId) {
  try {
    if (useMongoDb) {
      const group = await GroupModel.findOne({ groupId });
      return group?.antilink || false;
    } else {
      const group = await jsonDb.get('groups', groupId);
      return group?.antilink || false;
    }
  } catch (error) {
    log.error('Failed to check antilink', error, { groupId });
    return false;
  }
}

/**
 * Set welcome status for a group
 */
export async function setWelcome(groupId, enabled) {
  try {
    if (useMongoDb) {
      await GroupModel.findOneAndUpdate(
        { groupId },
        { welcome: enabled, updatedAt: new Date() },
        { upsert: true }
      );
    } else {
      await jsonDb.set('groups', groupId, { ...await jsonDb.get('groups', groupId), welcome: enabled });
    }
    log.action(`Welcome ${enabled ? 'enabled' : 'disabled'}`, 'database', { groupId });
  } catch (error) {
    log.error('Failed to set welcome', error, { groupId, enabled });
  }
}

/**
 * Check if welcome is enabled for a group
 */
export async function isWelcomeOn(groupId) {
  try {
    if (useMongoDb) {
      const group = await GroupModel.findOne({ groupId });
      return group?.welcome || false;
    } else {
      const group = await jsonDb.get('groups', groupId);
      return group?.welcome || false;
    }
  } catch (error) {
    log.error('Failed to check welcome', error, { groupId });
    return false;
  }
}

/**
 * Generic setting storage
 */
export async function setSetting(key, value) {
  try {
    if (useMongoDb) {
      await SettingsModel.findOneAndUpdate(
        { key },
        { value, updatedAt: new Date() },
        { upsert: true }
      );
    } else {
      await jsonDb.set('settings', key, value);
    }
  } catch (error) {
    log.error('Failed to set setting', error, { key });
  }
}

/**
 * Generic setting retrieval
 */
export async function getSetting(key, defaultValue = null) {
  try {
    if (useMongoDb) {
      const setting = await SettingsModel.findOne({ key });
      return setting?.value ?? defaultValue;
    } else {
      const value = await jsonDb.get('settings', key);
      return value ?? defaultValue;
    }
  } catch (error) {
    log.error('Failed to get setting', error, { key });
    return defaultValue;
  }
}

/**
 * Get all global settings as an object
 */
export async function getAllSettings() {
  try {
    if (useMongoDb) {
      const settings = await SettingsModel.find({});
      return settings.reduce((acc, s) => {
        acc[s.key] = s.value;
        return acc;
      }, {});
    } else {
      return jsonDb.data.settings || {};
    }
  } catch (error) {
    log.error('Failed to get all settings', error);
    return {};
  }
}

/**
 * Sudo Mode Management
 */
export async function isSudoMode() {
  return await getSetting('SUDO_MODE', false);
}

export async function setSudoMode(enabled) {
  await setSetting('SUDO_MODE', enabled);
}

/**
 * Get authorized sudo numbers
 */
export async function getSudoNumbers() {
  const sudo = await getSetting('SUDO_NUMBERS', '');
  if (!sudo) return [];
  return sudo.split(',').map(n => n.trim()).filter(n => n);
}

/**
 * Get database info
 */
export function getDatabaseInfo() {
  return {
    type: useMongoDb ? 'MongoDB' : 'JSON File',
    connected: useMongoDb ? mongoose.connection.readyState === 1 : true,
    url: useMongoDb ? DATABASE_URL.split('@')[1]?.split('/')[0] : DB_FILE
  };
}

/**
 * Cache message in MongoDB (persistent storage)
 */
export async function cacheMessageInDb(messageId, chatId, messageData, daysToKeep = 7) {
  if (!useMongoDb || !CachedMessageModel) return false;

  try {
    const expiresAt = new Date(Date.now() + daysToKeep * 24 * 60 * 60 * 1000);

    await CachedMessageModel.findOneAndUpdate(
      { chatId, messageId },
      {
        sender: messageData.sender,
        message: messageData.message,
        key: messageData.key,
        timestamp: new Date(),
        expiresAt
      },
      { upsert: true, new: true }
    );

    return true;
  } catch (error) {
    log.error('Failed to cache message in MongoDB', error, { messageId, chatId });
    return false;
  }
}

/**
 * Retrieve cached message from MongoDB
 */
export async function getCachedMessageFromDb(messageId, chatId) {
  if (!useMongoDb || !CachedMessageModel) return null;

  try {
    const cached = await CachedMessageModel.findOne({ chatId, messageId });
    return cached ? {
      id: cached.messageId,
      chat: cached.chatId,
      sender: cached.sender,
      message: cached.message,
      key: cached.key,
      timestamp: cached.timestamp.getTime()
    } : null;
  } catch (error) {
    log.error('Failed to get cached message from MongoDB', error, { messageId, chatId });
    return null;
  }
}

/**
 * Get message cache statistics from MongoDB
 */
export async function getDbCacheStats() {
  if (!useMongoDb || !CachedMessageModel) {
    return { enabled: false, count: 0 };
  }

  try {
    const count = await CachedMessageModel.countDocuments();
    const oldest = await CachedMessageModel.findOne().sort({ timestamp: 1 });
    const newest = await CachedMessageModel.findOne().sort({ timestamp: -1 });

    return {
      enabled: true,
      count,
      oldestMessage: oldest ? oldest.timestamp : null,
      newestMessage: newest ? newest.timestamp : null
    };
  } catch (error) {
    log.error('Failed to get DB cache stats', error);
    return { enabled: true, count: 0, error: error.message };
  }
}

// ============================================
// TempMail Database Helpers
// ============================================

export const EXPIRY_MINUTES = 60;

/**
 * Store user's temp email
 */
export async function setUserEmail(userJid, email) {
  const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000);
  try {
    if (useMongoDb) {
      await TempMailModel.findOneAndUpdate(
        { userJid },
        { email, createdAt: new Date(), expiresAt },
        { upsert: true }
      );
    } else {
      await jsonDb.set('tempmail', userJid, { email, createdAt: Date.now(), expiresAt: expiresAt.getTime() });
    }
  } catch (error) {
    log.error('Failed to set user email', error, { userJid, email });
  }
}

/**
 * Get user's temp email with expiry check
 */
export async function getUserEmailWithExpiry(userJid) {
  try {
    let data;
    if (useMongoDb) {
      data = await TempMailModel.findOne({ userJid });
    } else {
      data = await jsonDb.get('tempmail', userJid);
    }

    if (!data) return null;

    const now = Date.now();
    const expiresAt = useMongoDb ? data.expiresAt.getTime() : data.expiresAt;

    if (now > expiresAt) {
      await deleteUserEmail(userJid);
      return null;
    }

    const diff = expiresAt - now;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    return {
      email: data.email,
      timeRemaining: `${minutes}m ${seconds}s`,
      expiresAt
    };
  } catch (error) {
    log.error('Failed to get user email data', error, { userJid });
    return null;
  }
}

/**
 * Delete user's temp email
 */
export async function deleteUserEmail(userJid) {
  try {
    if (useMongoDb) {
      await TempMailModel.deleteOne({ userJid });
    } else {
      await jsonDb.delete('tempmail', userJid);
    }
  } catch (error) {
    log.error('Failed to delete user email', error, { userJid });
  }
}


/**
 * Get active protections across all groups
 */
export async function getEnabledGroupSettings() {
  try {
    if (useMongoDb) {
      const groups = await GroupModel.find({});
      const result = {
        WELCOME_MESSAGE: [],
        GOODBYE_MESSAGE: [],
        GROUP_EVENTS: [],
        ANTILINK: [],
        ANTIBAD: [],
        ANTIGROUPMENTION: []
      };

      groups.forEach(g => {
        if (g.welcome) result.WELCOME_MESSAGE.push(g.groupId);
        if (g.goodbye) result.GOODBYE_MESSAGE.push(g.groupId);
        if (g.groupEvents) result.GROUP_EVENTS.push(g.groupId);
        if (g.antilink !== 'off' && g.antilink !== false) result.ANTILINK.push(g.groupId);
        if (g.antibad) result.ANTIBAD.push(g.groupId);
        if (g.antiGroupMention !== 'off' && g.antiGroupMention !== false) result.ANTIGROUPMENTION.push(g.groupId);
      });
      return result;
    } else {
      const result = {
        WELCOME_MESSAGE: [],
        GOODBYE_MESSAGE: [],
        GROUP_EVENTS: [],
        ANTILINK: [],
        ANTIBAD: [],
        ANTIGROUPMENTION: []
      };
      Object.entries(jsonDb.data.groups || {}).forEach(([groupId, g]) => {
        if (g.welcome) result.WELCOME_MESSAGE.push(groupId);
        if (g.goodbye) result.GOODBYE_MESSAGE.push(groupId);
        if (g.groupEvents) result.GROUP_EVENTS.push(groupId);
        if (g.antilink !== 'off' && g.antilink !== false) result.ANTILINK.push(groupId);
        if (g.antibad) result.ANTIBAD.push(groupId);
        if (g.antiGroupMention !== 'off' && g.antiGroupMention !== false) result.ANTIGROUPMENTION.push(groupId);
      });
      return result;
    }
  } catch (error) {
    log.error('Failed to get enabled group settings', error);
    return {
      WELCOME_MESSAGE: [],
      GOODBYE_MESSAGE: [],
      GROUP_EVENTS: [],
      ANTILINK: [],
      ANTIBAD: [],
      ANTIGROUPMENTION: []
    };
  }
}

// ============================================
// Generic Group Setting Helpers
// ============================================

/**
 * Get a specific setting for a group
 */
export async function getGroupSetting(groupId, key) {
  try {
    // Map keys to schema fields if they differ
    const keyMap = {
      'ANTILINK': 'antilink',
      'ANTILINK_WARN_COUNT': 'antilinkWarnCount',
      'WELCOME': 'welcome',
      'WELCOME_TEXT': 'welcomeText',
      'GOODBYE': 'goodbye',
      'GOODBYE_TEXT': 'goodbyeText',
      'GROUP_EVENTS': 'groupEvents',
      'ANTIBAD': 'antibad',
      'ANTIBAD_WARN_COUNT': 'antibadWarnCount',
      'ANTIGROUPMENTION': 'antiGroupMention',
      'ANTIGROUPMENTION_WARN_COUNT': 'antiGroupMentionWarnCount',
      'BAD_WORDS': 'badWords'
    };

    const schemaKey = keyMap[key] || key;

    if (useMongoDb) {
      const group = await GroupModel.findOne({ groupId });
      if (!group) return null;
      return group[schemaKey];
    } else {
      const group = await jsonDb.get('groups', groupId);
      if (!group) return null;
      return group[schemaKey];
    }
  } catch (error) {
    log.error('Failed to get group setting', error, { groupId, key });
    return null;
  }
}

/**
 * Set a specific setting for a group
 */
export async function setGroupSetting(groupId, key, value) {
  try {
    const keyMap = {
      'ANTILINK': 'antilink',
      'ANTILINK_WARN_COUNT': 'antilinkWarnCount',
      'WELCOME': 'welcome',
      'WELCOME_TEXT': 'welcomeText',
      'GOODBYE': 'goodbye',
      'GOODBYE_TEXT': 'goodbyeText',
      'GROUP_EVENTS': 'groupEvents',
      'ANTIBAD': 'antibad',
      'ANTIBAD_WARN_COUNT': 'antibadWarnCount',
      'ANTIGROUPMENTION': 'antiGroupMention',
      'ANTIGROUPMENTION_WARN_COUNT': 'antiGroupMentionWarnCount',
      'BAD_WORDS': 'badWords'
    };

    const schemaKey = keyMap[key] || key;

    if (useMongoDb) {
      const update = { updatedAt: new Date() };
      update[schemaKey] = value;

      await GroupModel.findOneAndUpdate(
        { groupId },
        update,
        { upsert: true }
      );
    } else {
      const group = await jsonDb.get('groups', groupId) || { groupId };
      group[schemaKey] = value;
      await jsonDb.set('groups', groupId, group);
    }
    // log.action(`Group setting updated: ${key}`, 'database', { groupId, value });
  } catch (error) {
    log.error('Failed to set group setting', error, { groupId, key });
  }
}

// ============================================
// BadWords Management Helpers
// ============================================

export const DEFAULT_BAD_WORDS = ['fuck', 'shit', 'bitch', 'asshole', 'pussy', 'dick', 'nigger', 'bastard', 'cunt'];

/**
 * Get bad words for a group
 */
export async function getBadWords(groupId) {
  try {
    if (useMongoDb) {
      const group = await GroupModel.findOne({ groupId });
      return group?.badWords || [];
    } else {
      const group = await jsonDb.get('groups', groupId);
      return group?.badWords || [];
    }
  } catch (error) {
    log.error('Failed to get bad words', error, { groupId });
    return [];
  }
}

/**
 * Add a bad word to group filter
 */
export async function addBadWord(groupId, word) {
  try {
    const words = await getBadWords(groupId);
    if (!words.includes(word.toLowerCase())) {
      words.push(word.toLowerCase());
      await setGroupSetting(groupId, 'BAD_WORDS', words);
    }
  } catch (error) {
    log.error('Failed to add bad word', error, { groupId, word });
  }
}

/**
 * Remove a bad word from group filter
 */
export async function removeBadWord(groupId, word) {
  try {
    const words = await getBadWords(groupId);
    const initialLen = words.length;
    const filtered = words.filter(w => w !== word.toLowerCase());
    if (filtered.length !== initialLen) {
      await setGroupSetting(groupId, 'BAD_WORDS', filtered);
      return true;
    }
    return false;
  } catch (error) {
    log.error('Failed to remove bad word', error, { groupId, word });
    return false;
  }
}

/**
 * Clear all bad words for a group
 */
export async function clearBadWords(groupId) {
  await setGroupSetting(groupId, 'BAD_WORDS', []);
}

/**
 * Load default offensive words
 */
export async function initializeDefaultBadWords(groupId) {
  try {
    const current = await getBadWords(groupId);
    const added = DEFAULT_BAD_WORDS.filter(w => !current.includes(w));
    if (added.length > 0) {
      const updated = [...current, ...added];
      await setGroupSetting(groupId, 'BAD_WORDS', updated);
    }
    return added.length;
  } catch (error) {
    log.error('Failed to init default bad words', error, { groupId });
    return 0;
  }
}

// ============================================
// Notes Management Helpers
// ============================================

/**
 * Get all notes for a specific user
 */
export async function getAllNotes(userJid) {
  try {
    if (useMongoDb) {
      return await NoteModel.find({ userJid }).sort({ noteNumber: 1 });
    } else {
      return (jsonDb.data.notes || []).filter(n => n.userJid === userJid).sort((a, b) => a.noteNumber - b.noteNumber);
    }
  } catch (error) {
    log.error('Failed to get notes', error, { userJid });
    return [];
  }
}

/**
 * Add a new note for a user
 */
export async function addNote(userJid, content) {
  try {
    const notes = await getAllNotes(userJid);
    const nextNumber = notes.length > 0 ? Math.max(...notes.map(n => n.noteNumber)) + 1 : 1;

    const noteData = {
      userJid,
      noteNumber: nextNumber,
      content,
      createdAt: new Date()
    };

    if (useMongoDb) {
      const newNote = new NoteModel(noteData);
      return await newNote.save();
    } else {
      if (!jsonDb.data.notes) jsonDb.data.notes = [];
      jsonDb.data.notes.push(noteData);
      jsonDb._save();
      return noteData;
    }
  } catch (error) {
    log.error('Failed to add note', error, { userJid });
    throw error;
  }
}

/**
 * Get a specific note by number
 */
export async function getNote(userJid, noteNumber) {
  try {
    if (useMongoDb) {
      return await NoteModel.findOne({ userJid, noteNumber });
    } else {
      return (jsonDb.data.notes || []).find(n => n.userJid === userJid && n.noteNumber === noteNumber);
    }
  } catch (error) {
    log.error('Failed to get note', error, { userJid, noteNumber });
    return null;
  }
}

/**
 * Update an existing note
 */
export async function updateNote(userJid, noteNumber, newContent) {
  try {
    if (useMongoDb) {
      return await NoteModel.findOneAndUpdate(
        { userJid, noteNumber },
        { content: newContent, updatedAt: new Date() },
        { new: true }
      );
    } else {
      const note = (jsonDb.data.notes || []).find(n => n.userJid === userJid && n.noteNumber === noteNumber);
      if (note) {
        note.content = newContent;
        note.updatedAt = new Date();
        jsonDb._save();
        return note;
      }
      return null;
    }
  } catch (error) {
    log.error('Failed to update note', error, { userJid, noteNumber });
    return null;
  }
}

/**
 * Delete a specific note
 */
export async function deleteNote(userJid, noteNumber) {
  try {
    if (useMongoDb) {
      const result = await NoteModel.deleteOne({ userJid, noteNumber });
      return result.deletedCount > 0;
    } else {
      const initialLen = (jsonDb.data.notes || []).length;
      jsonDb.data.notes = (jsonDb.data.notes || []).filter(n => !(n.userJid === userJid && n.noteNumber === noteNumber));
      const deleted = (jsonDb.data.notes || []).length < initialLen;
      if (deleted) jsonDb._save();
      return deleted;
    }
  } catch (error) {
    log.error('Failed to delete note', error, { userJid, noteNumber });
    return false;
  }
}

/**
 * Delete all notes for a user
 */
export async function deleteAllNotes(userJid) {
  try {
    if (useMongoDb) {
      const result = await NoteModel.deleteMany({ userJid });
      return result.deletedCount;
    } else {
      const userNotes = (jsonDb.data.notes || []).filter(n => n.userJid === userJid);
      const count = userNotes.length;
      jsonDb.data.notes = (jsonDb.data.notes || []).filter(n => n.userJid !== userJid);
      if (count > 0) jsonDb._save();
      return count;
    }
  } catch (error) {
    log.error('Failed to delete all notes', error, { userJid });
    return 0;
  }
}

/**
 * Get ALL notes in the system (Admin only)
 */
export async function getAllUsersNotes() {
  try {
    if (useMongoDb) {
      return await NoteModel.find({}).sort({ createdAt: -1 });
    } else {
      return (jsonDb.data.notes || []);
    }
  } catch (error) {
    log.error('Failed to get all users notes', error);
    return [];
  }
}

/**
 * Delete a specific note by its internal ID (Admin only)
 */
export async function deleteNoteById(noteId) {
  try {
    if (useMongoDb) {
      const result = await NoteModel.findByIdAndDelete(noteId);
      return !!result;
    } else {
      const initialLen = (jsonDb.data.notes || []).length;
      jsonDb.data.notes = (jsonDb.data.notes || []).filter(n => (n._id || n.id) !== noteId);
      const deleted = (jsonDb.data.notes || []).length < initialLen;
      if (deleted) jsonDb._save();
      return deleted;
    }
  } catch (error) {
    log.error('Failed to delete note by ID', error, { noteId });
    return false;
  }
}

/**
 * Update a specific note by its internal ID (Admin only)
 */
export async function updateNoteById(noteId, newContent) {
  try {
    if (useMongoDb) {
      return await NoteModel.findByIdAndUpdate(noteId, { content: newContent }, { new: true });
    } else {
      const note = (jsonDb.data.notes || []).find(n => (n._id || n.id) === noteId);
      if (note) {
        note.content = newContent;
        jsonDb._save();
        return note;
      }
      return null;
    }
  } catch (error) {
    log.error('Failed to update note by ID', error, { noteId });
    return null;
  }
}

// ============================================
// Reset Helpers
// ============================================

/**
 * Reset a specific global setting to default (null/undefined)
 */
export async function resetSetting(key) {
  try {
    if (useMongoDb) {
      await SettingsModel.findOneAndDelete({ key });
    } else {
      await jsonDb.delete('settings', key);
    }
  } catch (error) {
    log.error('Failed to reset setting', error, { key });
  }
}

/**
 * Reset ALL global settings
 */
export async function resetAllSettings() {
  try {
    if (useMongoDb) {
      await SettingsModel.deleteMany({});
    } else {
      jsonDb.data.settings = {};
      jsonDb._save();
    }
  } catch (error) {
    log.error('Failed to reset all settings', error);
  }
}

/**
 * Get all settings for a specific group
 */
export async function getAllGroupSettings(groupId) {
  try {
    if (useMongoDb) {
      const group = await GroupModel.findOne({ groupId });
      if (!group) return {};
      // Convert mongoose document to object
      return group.toObject();
    } else {
      return await jsonDb.get('groups', groupId) || {};
    }
  } catch (error) {
    log.error('Failed to get all group settings', error, { groupId });
    return {};
  }
}

/**
 * Reset all settings for a specific group
 */
export async function resetAllGroupSettings(groupId) {
  try {
    if (useMongoDb) {
      await GroupModel.findOneAndDelete({ groupId });
    } else {
      await jsonDb.delete('groups', groupId);
    }
  } catch (error) {
    log.error('Failed to reset all group settings', error, { groupId });
  }
}

// Dummy init for compatibility
export const initNotesDB = () => log.info('Notes database initialized');

// Log database initialization
console.log(`📦 Database: ${useMongoDb ? 'MongoDB' : 'JSON File'} (${useMongoDb ? DATABASE_URL.split('@')[1]?.split('/')[0] : 'database.json'})`);
if (useMongoDb) {
  console.log(`💾 Persistent message cache: Enabled (7-day retention)`);
}

export default {
  setAntilink,
  isAntilinkOn,
  setWelcome,
  isWelcomeOn,
  setSetting,
  getSetting,
  getDatabaseInfo,
  cacheMessageInDb,
  getCachedMessageFromDb,
  getDbCacheStats,
  getAllSettings,
  isSudoMode,
  setSudoMode,
  getSudoNumbers,
  getEnabledGroupSettings,
  getBadWords,
  addBadWord,
  removeBadWord,
  clearBadWords,
  initializeDefaultBadWords,
  resetSetting,
  resetAllSettings,
  setGroupSetting,
  getGroupSetting,
  getAllGroupSettings,
  resetAllGroupSettings,
  getAllNotes,
  getAllUsersNotes,
  getNote,
  addNote,
  updateNote,
  updateNoteById,
  deleteNote,
  deleteNoteById,
  deleteAllNotes,
  initNotesDB,
  setUserEmail,
  getUserEmailWithExpiry,
  deleteUserEmail,
  EXPIRY_MINUTES
};
