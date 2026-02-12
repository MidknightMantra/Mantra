# MANTRA

![MANTRA](https://files.catbox.moe/2evo2f.jpg)

MANTRA is a plugin-based WhatsApp bot built on `gifted-baileys` with command hot-reload, group tools, downloader tools, fun commands, and owner utilities.

## Requirements

- Node.js `18+`
- npm
- A valid WhatsApp session string

## Session ID Generator

Use this site to generate your MANTRA session string:

- **https://mantra-pair.up.railway.app/**

## Quick Start (Local)

```bash
npm install
npm start
```

## One-Click Platform Deploy

[![Deploy on Railway](https://img.shields.io/badge/Deploy%20on-Railway-0B0D0E?style=for-the-badge&logo=railway&logoColor=white)](https://railway.app/new)
[![Deploy to Heroku](https://img.shields.io/badge/Deploy%20to-Heroku-430098?style=for-the-badge&logo=heroku&logoColor=white)](https://heroku.com/deploy?template=https://github.com/MidknightMantra/Mantra)
[![Deploy to Render](https://img.shields.io/badge/Deploy%20to-Render-1A1A1A?style=for-the-badge&logo=render&logoColor=46E3B7)](https://render.com/deploy?repo=https://github.com/MidknightMantra/Mantra)
[![Deploy to Koyeb](https://img.shields.io/badge/Deploy%20to-Koyeb-121212?style=for-the-badge&logo=koyeb&logoColor=6DEDBB)](https://app.koyeb.com/deploy?type=git&repository=github.com/MidknightMantra/Mantra&branch=main)

GitHub Repo for deployment:

- `https://github.com/MidknightMantra/Mantra`

## 24/7 Uptime

To keep the bot online continuously:

- Use always-on plans (free tiers may sleep/hibernate).
- Railway: keep service active and disable any sleep settings.
- Heroku: run as a `worker` dyno (`Procfile` included) on a paid dyno plan.
- Render/Koyeb: use plans that do not spin down background services.

## Notes

- Keep your session string private.
- If session is invalid/expired, generate a new one from:
  - https://mantra-pair.up.railway.app/
