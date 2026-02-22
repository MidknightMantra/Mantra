# MANTRA WhatsApp Bot

## Overview
MANTRA is a plugin-based WhatsApp bot built on `gifted-baileys`. It features command hot-reload, group tools, downloader tools, fun commands, and owner utilities. This is a console-only application (no web frontend).

## Recent Changes
- 2026-02-22: Implemented autojoin.js and autofollow.js plugins with full management commands (on/off, add, remove, list, run). Updated mantra.js to persist autojoin/autofollow settings and expose joinGroup/followChannel methods to plugins.
- 2026-02-22: Comprehensive codebase audit - fixed alias conflicts (alive.js "online" vs online.js), broken emojis (uptime.js), PM2 restart (now uses process.exit for Replit), hack command spam (consolidated to single message), ping artificial delay (now measures real latency)
- 2026-02-22: Created antiviewonce plugin with toggle command and onMessage handler
- 2026-02-22: Fixed mute/unmute alias conflicts in closegc.js and opengc.js
- 2026-02-22: Initial Replit setup - Node.js 20, npm dependencies installed, workflow configured

## Project Architecture
- **Runtime**: Node.js 20 (CommonJS)
- **Entry Point**: `index.js` → `mantra.js`
- **Core Files**:
  - `mantra.js` - Main bot logic, WhatsApp socket connection, message handling
  - `handler.js` - Command handler/dispatcher
  - `pluginManager.js` - Plugin loader with hot-reload support
- **Plugins**: `plugins/` directory (99 files, ~310 commands)
- **Libraries**: `lib/` directory (groupSettings.js, groupTools.js, helper.js)
- **Data**: `database.json` (message store), `group-settings.json`

## Plugin Categories
- **main**: help, about, alive, ping, uptime, system, health, prefixes, scheduler
- **download**: song, video, fb, insta, tiktok
- **group**: add, remove, promote, demote, admins, tagall, tagadmins, hidetag, poll, welcome, goodbye, setwelcome, setgoodbye, groupinfo, grouplink, revoke, setdesc, setsubject, getpic, closegc, opengc, killgc, left, newgroup, online, listrequests, accept, acceptall, reject, rejectall, warn, togroupstatus, setantigcmentionwarnlimit, vcf
- **owner**: setprefix, setself, settimezone, autobio, autoreact, autostatusview, autostatusreact, autojoin, autofollow, block, unblock, broadcast, clearchats, restart, shutdown, backup, restore, setpp, gjid, jid
- **convert**: sticker, take, vv, vocalremover
- **search**: githubstalk, srepo
- **fun**: joke, fact, quote, flirt, dare, reactions, animegirl, hack
- **other**: ai, bible, muslimai, define, translate, weather, news, deepimg, transcript, onwa, gpassword, antibot, antidelete, antidemote, antigcmention, antilink, antipromote, antiviewonce

## Anti-Features (Group Protection)
- **antilink** - Detects and removes link messages
- **antibot** - Detects and removes bot-like messages
- **antidemote** - Prevents admin demotions
- **antipromote** - Prevents unauthorized promotions
- **antigcmention** - Warns/kicks users who @mention the whole group
- **antiviewonce** - Captures view-once media to saved messages (defaults OFF)
- **antidelete** - Logs deleted messages

## Environment Variables
- `SESSION_ID` - WhatsApp session string (secret, required to connect)
- `BOT_NAME` - Bot display name (default: MANTRA)
- `BOT_OWNER` - Owner name
- `BOT_GITHUB` - GitHub repo URL
- `OWNER_NUMBER` - Owner's WhatsApp number
- `ALIVE_IMG` / `ALIVE_AUDIO` - Branding media URLs
- `AI_MODEL` - AI model for AI plugin (default: gpt-4o-mini)
- `OPENWEATHER_API_KEY` - Weather API key (optional)
- `NEWS_API_KEY` - News API key (optional)
- `AI_API_KEY` / `GIFTED_API_KEY` - API key for Gifted API services (optional)
- `OPENAI_API_KEY` - OpenAI API key for AI fallback (optional)
- `SELF_JID` - Explicit self-chat JID for vv/antiviewonce (optional)

## Known Considerations
- `news.js` and `weather.js` have hardcoded fallback API keys (free tier defaults)
- `translate.js` assumes source language is English (hardcoded `en|<target>`)
- Scheduled messages (scheduler.js) are lost on bot restart (in-memory timers)

## Workflow
- **MANTRA Bot**: `npm start` (console output) - Runs the WhatsApp bot

## Deployment
- Deployed as a VM (always-on) since the bot needs to maintain a persistent WhatsApp connection
- Run command: `npm start`

## User Preferences
- None recorded yet
