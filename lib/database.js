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
let SettingsModel, GroupModel, CachedMessageModel;

if (useMongoDb) {
  const settingsSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    value: mongoose.Schema.Types.Mixed,
    updatedAt: { type: Date, default: Date.now }
  });

  const groupSchema = new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    antilink: { type: Boolean, default: false },
    welcome: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now }
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

  // Create compound index for fast lookups
  cachedMessageSchema.index({ chatId: 1, messageId: 1 }, { unique: true });
  // TTL index - automatically delete messages after expiresAt
  cachedMessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

  SettingsModel = mongoose.model('Settings', settingsSchema);
  GroupModel = mongoose.model('Groups', groupSchema);
  CachedMessageModel = mongoose.model('CachedMessages', cachedMessageSchema);

  // Connect to MongoDB
  mongoose.connect(DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  }).then(() => {
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
    this.data = { settings: {}, groups: {} };
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
      this.data = { settings: {}, groups: {} };
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
  getDbCacheStats
};
