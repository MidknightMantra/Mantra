# 🔮 Mantra 🪷

> **High-Performance · Stealth-First · Multi-Device WhatsApp Bot**

Mantra is a next-generation WhatsApp bot built on **Baileys** and **Node.js**, designed for speed, privacy, and extensibility. It features a hybrid database system, enterprise-grade caching, and a comprehensive suite of tools for group management, AI interaction, and media handling.

---

## 🚀 Key Features

### 🛡️ Core & Stealth
- **Anti-Delete Protocol**: Automatically caches and recovers deleted messages (Text, Media, Stickers).
- **Stealth Mode**: `Anti-ViewOnce` enables you to save ViewOnce media without triggering read receipts.
- **Auto-Status**: Automatically views status updates from your contacts.
- **Always Online**: Keeps your presence active 24/7.

### 🧠 AI Intelligence Suite
- **Multi-Model Support**: Interact with **GPT-4**, **Gemini Pro**, **DeepSeek**, **Mistral**, and **Blackbox**.
- **Contextual Chat**: Maintains conversation history for natural interactions.
- **Image Generation**: Create AI art with `.imagine` (DALL-E 3 / Midjourney style).

### ⚡ Performance Architecture
- **Hybrid Database**: Automatically switches between **MongoDB** (Production) and **JSON** (Development/Local).
- **Redis Caching**: optional caching layer for extreme performance.
- **Rate Limiting**: Built-in protection against spam and abuse.
- **Smart Error Handling**: Graceful degradation—if one API fails, it tries another.

### 👥 Advanced Administration
- **Group Protections**:
  - **Anti-Link**: Kicks/Warns users who post invite links.
  - **Anti-BadWords**: Auto-delete profanity with customizable filters.
  - **Anti-Toxic**: Detects and manages toxic behavior.
- **Welcome/Goodbye**: Customizable event messages with automated greetings.
- **TagAll & broadcasts**: Powerful announcement tools.

### 🎨 Multimedia & Tools
- **Universal Downloader**: Download content from **YouTube, TikTok, Instagram, Facebook, Twitter/X**.
- **Media Converter**: Convert Stickers, Images, Audio, and Video formats.
- **Logo Maker**: Generate professional logos and text effects.
- **Game Suite**: Interactive group games (Trivia, Tic-Tac-Toe, Math).

---

## ☁️ Instant Deployment

Deploy functionality with a single click.

| Platform | Link |
| :--- | :--- |
| **Heroku** | [![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/MidknightMantra/Mantra) |
| **Railway** | [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/deploy?referrerCode=Mantra&template=https://github.com/MidknightMantra/Mantra) |
| **Render** | [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/MidknightMantra/Mantra) |
| **Koyeb** | [![Deploy to Koyeb](https://www.koyeb.com/static/images/deploy/button.svg)](https://app.koyeb.com/deploy?type=git&repository=github.com/MidknightMantra/Mantra&name=mantra-bot) |

> **Note:** You must configure the **Environment Variables** after deployment.

---

## ⚙️ Configuration

Create a `.env` file or set these variables in your cloud dashboard:

| Variable | Description | Required | Default |
| :--- | :--- | :--- | :--- |
| `SESSION_ID` | Your Baileys session ID | **Yes** | - |
| `OWNER_NUMBER` | Your WhatsApp number (e.g., `2547...`) | **Yes** | (Auto-detects) |
| `DATABASE_URL` | MongoDB Connection String | No | `database.json` |
| `REDIS_URL` | Redis Connection String | No | (Disabled) |
| `BOT_NAME` | Custom Name for your bot | No | `Mantra-MD` |
| `GIFTED_API_KEY` | Key for premium API features | No | (Free Tier) |

---

## 💻 Local Installation

For developers or local hosting:

### Prerequisites
*   Node.js 18+
*   Git
*   FFmpeg (for media conversion)

### Quick Start
```bash
# 1. Clone the repository
git clone https://github.com/MidknightMantra/Mantra.git
cd Mantra

# 2. Install dependencies
npm install

# 3. Setup Environment
cp .env.example .env
# Edit .env with your details

# 4. Start the bot
npm start
```

### Docker
```bash
docker-compose up -d
```

---

## 🛠️ Development

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### Run Tests
```bash
npm test              # Run unit & integration tests
npm run test:watch    # Watch mode
```

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

---

**Made with ❤️ by Midknight Mantra**
