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
let SettingsModel, GroupModel, CachedMessageModel, TempMailModel, NoteModel, AnalyticsModel;

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

  const analyticsSchema = new mongoose.Schema({
    type: { type: String, required: true }, // 'global' or 'user'
    key: { type: String, required: true, unique: true }, // 'global' or userJid
    totalCommands: { type: Number, default: 0 },
    commandCounts: { type: Map, of: Number, default: {} },
    lastActive: { type: Date, default: Date.now }
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
  AnalyticsModel = mongoose.model('Analytics', analyticsSchema);

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
    this.data = { settings: {}, groups: {}, tempmail: {}, notes: [], analytics: { global: { totalCommands: 0, commandCounts: {} }, users: {} } };
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
      this.data = { settings: {}, groups: {}, tempmail: {}, notes: [], analytics: { global: { totalCommands: 0, commandCounts: {} }, users: {} } };
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
async function setAntilink(groupId, enabled) {
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
async function isAntilinkOn(groupId) {
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
async function setWelcome(groupId, enabled) {
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
async function isWelcomeOn(groupId) {
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
async function setSetting(key, value) {
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
 * Reset a specific setting to default (removes it from DB)
 */
async function resetSetting(key) {
  try {
    if (useMongoDb) {
      await SettingsModel.deleteOne({ key });
    } else {
      await jsonDb.delete('settings', key);
    }
    return null;
  } catch (error) {
    log.error('Failed to reset setting', error, { key });
    throw error;
  }
}

/**
 * Reset ALL settings to defaults
 */
async function resetAllSettings() {
  try {
    if (useMongoDb) {
      await SettingsModel.deleteMany({});
    } else {
      jsonDb.data.settings = {};
      jsonDb._save();
    }
  } catch (error) {
    log.error('Failed to reset all settings', error);
    throw error;
  }
}

/**
 * Generic setting retrieval
 */
async function getSetting(key, defaultValue = null) {
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
async function getAllSettings() {
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
async function isSudoMode() {
  return await getSetting('SUDO_MODE', false);
}

async function setSudoMode(enabled) {
  await setSetting('SUDO_MODE', enabled);
}

/**
 * Get authorized sudo numbers
 */
async function getSudoNumbers() {
  const sudo = await getSetting('SUDO_NUMBERS', '');
  if (!sudo) return [];
  return sudo.split(',').map(n => n.trim()).filter(n => n);
}

/**
 * Clear all sudo numbers
 */
async function clearAllSudo() {
  const current = await getSudoNumbers();
  const count = current.length;
  await setSetting('SUDO_NUMBERS', '');
  return count;
}

/**
 * Update sudo numbers
 */
async function setSudo(num) {
  const current = await getSudoNumbers();
  if (!current.includes(num)) {
    current.push(num);
    await setSetting('SUDO_NUMBERS', current.join(','));
  }
}

async function delSudo(num) {
  const current = await getSudoNumbers();
  const filtered = current.filter(n => n !== num);
  await setSetting('SUDO_NUMBERS', filtered.join(','));
}


/**
 * Get database info
 */
function getDatabaseInfo() {
  return {
    type: useMongoDb ? 'MongoDB' : 'JSON File',
    connected: useMongoDb ? mongoose.connection.readyState === 1 : true,
    url: useMongoDb ? DATABASE_URL.split('@')[1]?.split('/')[0] : DB_FILE
  };
}

/**
 * Cache message in MongoDB (persistent storage)
 */
async function cacheMessageInDb(messageId, chatId, messageData, daysToKeep = 7) {
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
async function getCachedMessageFromDb(messageId, chatId) {
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
async function getDbCacheStats() {
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

const EXPIRY_MINUTES = 60;

/**
 * Store user's temp email
 */
async function setUserEmail(userJid, email) {
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
async function getUserEmailWithExpiry(userJid) {
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
async function deleteUserEmail(userJid) {
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
async function getEnabledGroupSettings() {
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
async function getGroupSetting(groupId, key) {
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
async function setGroupSetting(groupId, key, value) {
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

/**
 * Reset all settings for a specific group
 */
async function resetAllGroupSettings(groupId) {
  try {
    if (useMongoDb) {
      await GroupModel.deleteOne({ groupId });
    } else {
      await jsonDb.delete('groups', groupId);
    }
  } catch (error) {
    log.error('Failed to reset group settings', error, { groupId });
    throw error;
  }
}

/**
 * Get ALL settings for a specific group
 */
async function getAllGroupSettings(groupId) {
  try {
    if (useMongoDb) {
      const group = await GroupModel.findOne({ groupId });
      // Return plain object with defaults if not found
      return group ? group.toObject() : {};
    } else {
      return await jsonDb.get('groups', groupId) || {};
    }
  } catch (error) {
    log.error('Failed to get all group settings', error, { groupId });
    return {};
  }
}

// ============================================

const DEFAULT_BAD_WORDS = ['fuck', 'shit', 'bitch', 'asshole', 'pussy', 'dick', 'nigger', 'bastard', 'cunt'];

/**
 * Get bad words for a group
 */
async function getBadWords(groupId) {
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
async function addBadWord(groupId, word) {
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
async function removeBadWord(groupId, word) {
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
async function clearBadWords(groupId) {
  await setGroupSetting(groupId, 'BAD_WORDS', []);
}

/**
 * Load default offensive words
 */
async function initializeDefaultBadWords(groupId) {
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
async function getAllNotes(userJid) {
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
async function addNote(userJid, content) {
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
async function getNote(userJid, noteNumber) {
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
async function updateNote(userJid, noteNumber, newContent) {
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
async function deleteNote(userJid, noteNumber) {
  try {
    if (useMongoDb) {
      const result = await NoteModel.deleteOne({ userJid, noteNumber });
      return result.deletedCount > 0;
    } else {
      const notes = jsonDb.data.notes || [];
      const newNotes = notes.filter(n => !(n.userJid === userJid && n.noteNumber === noteNumber));
      if (newNotes.length !== notes.length) {
        jsonDb.data.notes = newNotes;
        jsonDb._save();
        return true;
      }
      return false;
    }
  } catch (error) {
    log.error('Failed to delete note', error, { userJid, noteNumber });
    return false;
  }
}

/**
 * Get ALL notes for ALL users (Owner only)
 */
async function getAllUsersNotes() {
  try {
    if (useMongoDb) {
      const notes = await NoteModel.find({}).sort({ createdAt: -1 });
      // Enhance with virtual ID for management
      return notes.map(n => ({
        ...n.toObject(),
        id: n._id.toString() // Use Mongo ID as reference
      }));
    } else {
      // In JSON, we don't have stable IDs easily, so we mimic
      return (jsonDb.data.notes || []).map((n, i) => ({ ...n, id: i + 1 }));
    }
  } catch (error) {
    log.error('Failed to get all notes', error);
    return [];
  }
}

/**
 * Delete note by global ID (Owner only)
 */
async function deleteNoteById(id) {
  try {
    if (useMongoDb) {
      const res = await NoteModel.findByIdAndDelete(id);
      return !!res;
    } else {
      // For JSON, id is index + 1
      const index = parseInt(id) - 1;
      const notes = jsonDb.data.notes || [];
      if (index >= 0 && index < notes.length) {
        notes.splice(index, 1);
        jsonDb.data.notes = notes;
        jsonDb._save();
        return true;
      }
      return false;
    }
  } catch (error) {
    log.error('Failed to delete note by ID', error, { id });
    return false;
  }
}

/**
 * Update note by global ID (Owner only)
 */
async function updateNoteById(id, content) {
  try {
    if (useMongoDb) {
      return await NoteModel.findByIdAndUpdate(id, { content, updatedAt: new Date() }, { new: true });
    } else {
      const index = parseInt(id) - 1;
      const notes = jsonDb.data.notes || [];
      if (index >= 0 && index < notes.length) {
        notes[index].content = content;
        notes[index].updatedAt = new Date();
        jsonDb._save();
        return notes[index];
      }
      return null;
    }
  } catch (error) {
    log.error('Failed to update note by ID', error, { id });
    return null;
  }
}

/**
 * Delete ALL notes for a user
 */
async function deleteAllNotes(userJid) {
  try {
    if (useMongoDb) {
      const res = await NoteModel.deleteMany({ userJid });
      return res.deletedCount;
    } else {
      const notes = jsonDb.data.notes || [];
      const initialLen = notes.length;
      const newNotes = notes.filter(n => n.userJid !== userJid);
      jsonDb.data.notes = newNotes;
      jsonDb._save();
      return initialLen - newNotes.length;
    }
  } catch (error) {
    log.error('Failed to delete all notes', error, { userJid });
    return 0;
  }
}

// ============================================
// Analytics Helpers
// ============================================

/**
 * Increment command usage stats
 */
async function incrementCommandStats(command, userJid) {
  try {
    if (useMongoDb) {
      // Update Global Stats
      await AnalyticsModel.findOneAndUpdate(
        { type: 'global', key: 'global' },
        {
          $inc: { totalCommands: 1, [`commandCounts.${command}`]: 1 },
          $set: { lastActive: new Date() }
        },
        { upsert: true }
      );

      // Update User Stats
      await AnalyticsModel.findOneAndUpdate(
        { type: 'user', key: userJid },
        {
          $inc: { totalCommands: 1, [`commandCounts.${command}`]: 1 },
          $set: { lastActive: new Date() }
        },
        { upsert: true }
      );
    } else {
      // Initialize if missing
      if (!jsonDb.data.analytics) {
        jsonDb.data.analytics = { global: { totalCommands: 0, commandCounts: {} }, users: {} };
      }

      // Update Global
      const global = jsonDb.data.analytics.global;
      global.totalCommands = (global.totalCommands || 0) + 1;
      global.commandCounts[command] = (global.commandCounts[command] || 0) + 1;

      // Update User
      if (!jsonDb.data.analytics.users[userJid]) {
        jsonDb.data.analytics.users[userJid] = { totalCommands: 0, commandCounts: {}, lastActive: Date.now() };
      }
      const user = jsonDb.data.analytics.users[userJid];
      user.totalCommands = (user.totalCommands || 0) + 1;
      user.commandCounts[command] = (user.commandCounts[command] || 0) + 1;
      user.lastActive = Date.now();

      jsonDb._save();
    }
  } catch (error) {
    log.error('Failed to increment analytics', error, { command, userJid });
  }
}

/**
 * Get analytics stats
 * @param {string|null} userJid - If null, returns global stats
 */
async function getAnalyticsStats(userJid = null) {
  try {
    if (useMongoDb) {
      const type = userJid ? 'user' : 'global';
      const key = userJid || 'global';
      const stats = await AnalyticsModel.findOne({ type, key });
      return stats ? stats.toObject() : null;
    } else {
      if (!jsonDb.data.analytics) return null;
      if (userJid) {
        return jsonDb.data.analytics.users[userJid] || null;
      } else {
        return jsonDb.data.analytics.global || null;
      }
    }
  } catch (error) {
    log.error('Failed to get analytics', error, { userJid });
    return null;
  }
}

/**
 * Get top users by command count
 */
async function getTopUsers(limit = 10) {
  try {
    if (useMongoDb) {
      return await AnalyticsModel.find({ type: 'user' })
        .sort({ totalCommands: -1 })
        .limit(limit);
    } else {
      const users = jsonDb.data.analytics?.users || {};
      return Object.entries(users)
        .map(([jid, data]) => ({ key: jid, ...data }))
        .sort((a, b) => b.totalCommands - a.totalCommands)
        .slice(0, limit);
    }
  } catch (error) {
    log.error('Failed to get top users', error);
    return [];
  }
}


// ============================================

// Dummy init for compatibility
const initNotesDB = () => log.info('Notes database initialized');

// Log database initialization
console.log(`📦 Database: ${useMongoDb ? 'MongoDB' : 'JSON File'} (${useMongoDb ? DATABASE_URL.split('@')[1]?.split('/')[0] : 'database.json'})`);
if (useMongoDb) {
  console.log(`💾 Persistent message cache: Enabled (7-day retention)`);
}


export {
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
  DEFAULT_BAD_WORDS,
  resetSetting,
  resetAllSettings,
  setGroupSetting,
  getGroupSetting,
  getAllGroupSettings,
  resetAllGroupSettings,
  setSudo,
  delSudo,
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
  EXPIRY_MINUTES,
  incrementCommandStats,
  getAnalyticsStats,
  getTopUsers
};

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
  DEFAULT_BAD_WORDS,
  resetSetting,
  resetAllSettings,
  setGroupSetting,
  getGroupSetting,
  getAllGroupSettings,
  resetAllGroupSettings,
  setSudo,
  delSudo,
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
  EXPIRY_MINUTES,
  incrementCommandStats,
  getAnalyticsStats,
  getTopUsers
};
