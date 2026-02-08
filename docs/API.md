# 📚 Mantra API Reference

This document provides a technical overview of Mantra's core modules and plugin architecture.

## 🔌 Plugin Architecture

Plugins are the heart of Mantra. They are located in the `plugins/` directory and loaded dynamically at startup.

### Structure
To create a new plugin, export a function that uses `addCommand`:

```javascript
import { addCommand } from '../lib/plugins.js';

addCommand({
    pattern: 'hello',           // Command trigger (e.g., .hello)
    alias: ['hi', 'hey'],       // Alternative triggers
    desc: 'Say hello',          // Description for help menu
    category: 'general',        // Category for help menu
    react: '👋',               // Auto-reaction (optional)
    handler: async (m, { conn, text, args }) => {
        // m: message object
        // conn: Baileys connection socket
        // text: full argument string
        // args: array of arguments
        
        await m.reply('Hello World!');
    }
});
```

### Handler Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `m` | `object` | The simplified message object (contains `.reply`, `.sender`, etc.) |
| `conn` | `object` | The raw Baileys socket connection |
| `text` | `string` | The text following the command |
| `args` | `array` | The text split by spaces |
| `isOwner` | `boolean` | True if sender is the bot owner |
| `isAdmin` | `boolean` | True if sender is a group admin |
| `isGroup` | `boolean` | True if message is from a group |

## 🛠️ Core Utilities

### Logger (`src/utils/logger.js`)
Standardized logging for the bot.
*   `log.info(msg)`: General information
*   `log.error(msg, error)`: Error logging with stack trace
*   `log.action(action, user, metadata)`: Track user actions

### Database (`lib/database.js`)
Abstract adapter for MongoDB/JSON.
*   `await getSetting(key, default)`: Retrieve a global setting
*   `await setSetting(key, value)`: Save a global setting
*   `await getGroupSetting(groupId, key)`: Get group-specific config
*   `await setGroupSetting(groupId, key, value)`: Save group config

### API Helper (`src/utils/apiHelper.js`)
Robust fetch wrapper with retry logic.
*   `fetchJson(url, options)`: GET request expecting JSON
*   `postJson(url, data)`: POST request with JSON body

## 📨 Message Helpers

The `m` object passed to handlers contains useful shortcuts:

*   `m.reply(text)`: Reply to the message
*   `m.react(emoji)`: React to the message
*   `m.sender`: The JID of the sender
*   `m.chat`: The JID of the chat (group or DM)
*   `m.quoted`: Information about the quoted message (if any)
