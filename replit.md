# MANTRA WhatsApp Bot

## Overview
MANTRA is a plugin-based WhatsApp bot built on `gifted-baileys`. It features command hot-reload, group tools, downloader tools, fun commands, and owner utilities. This is a console-only application (no web frontend).

## Recent Changes
- 2026-02-22: Initial Replit setup - Node.js 20, npm dependencies installed, workflow configured

## Project Architecture
- **Runtime**: Node.js 20 (CommonJS)
- **Entry Point**: `index.js` → `mantra.js`
- **Core Files**:
  - `mantra.js` - Main bot logic, WhatsApp socket connection, message handling
  - `handler.js` - Command handler/dispatcher
  - `pluginManager.js` - Plugin loader with hot-reload support
- **Plugins**: `plugins/` directory (98 files, 309 commands)
- **Libraries**: `lib/` directory (groupSettings.js, groupTools.js, helper.js)
- **Data**: `database.json` (message store), `group-settings.json`

## Environment Variables
- `SESSION_ID` - WhatsApp session string (secret, required to connect)
- `BOT_NAME` - Bot display name (default: MANTRA)
- `BOT_OWNER` - Owner name
- `BOT_GITHUB` - GitHub repo URL
- `OWNER_NUMBER` - Owner's WhatsApp number
- `ALIVE_IMG` / `ALIVE_AUDIO` - Branding media URLs
- `AI_MODEL` - AI model for AI plugin (default: gpt-4.1-mini)
- `OPENWEATHER_API_KEY` - Weather API key (optional)
- `NEWS_API_KEY` - News API key (optional)

## Workflow
- **MANTRA Bot**: `npm start` (console output) - Runs the WhatsApp bot

## Deployment
- Deployed as a VM (always-on) since the bot needs to maintain a persistent WhatsApp connection
- Run command: `npm start`

## User Preferences
- None recorded yet
