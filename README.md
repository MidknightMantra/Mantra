# MANTRA WhatsApp Bot

MANTRA is a plugin-based WhatsApp bot built on `gifted-baileys` with command hot-reload, group tools, downloader tools, fun commands, and owner utilities.

## Requirements

- Node.js `18+`
- npm
- A valid WhatsApp session string

## Session ID Generator

Use this site to generate your MANTRA session string:

- **https://mantra-pair.up.railway.app/**

After generating it, set it in env vars as `SESSION_ID` (recommended) or `MANTRA_SESSION`.

## Quick Start (Local)

```bash
npm install
npm start
```

## Environment Variables

Required for login:

- `SESSION_ID` (recommended), or
- `MANTRA_SESSION`

Also supported:

- `SESSION`
- `SESSIONID`
- `WHATSAPP_SESSION`
- `WA_SESSION`
- `BOT_SESSION`

Common optional vars:

- `BOT_NAME` (default: `MANTRA`)
- `BOT_OWNER`
- `BOT_OWNER_NUMBER`
- `OWNER_NUMBER`
- `OPENWEATHER_API_KEY`
- `OPENAI_API_KEY`
- `AI_ENDPOINT`
- `AI_MODEL`

## Railway Deployment

This repo includes `railway.json` and is ready for Railway.

1. Push this project to GitHub.
2. In Railway, create a new project from this GitHub repo.
3. Add environment variables:
   - `SESSION_ID` = your generated session from https://mantra-pair.up.railway.app/
   - Optional bot config vars (`BOT_NAME`, `BOT_OWNER`, etc.)
4. Deploy.

Start command:

- `npm start`

## Other Hosting (Heroku / Render / Koyeb)

Use the same environment variables as Railway.

- Set `SESSION_ID` (or `MANTRA_SESSION`)
- Deploy with start command `npm start`

## Notes

- Keep your session string private.
- If session is invalid/expired, generate a new one from:
  - https://mantra-pair.up.railway.app/
- Plugin files are in `plugins/`.
- Group helper utilities are in `lib/`.

