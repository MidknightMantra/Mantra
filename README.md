# Mantra 🪷

A high-performance, feature-rich WhatsApp Multi-Device bot built with Node.js and the Baileys library. Designed to be stealthy, fast, and easy to deploy.

---

# 🚀 Features

### 🛡️ Privacy & Stealth
- **Anti-Delete:** Automatically recovers and forwards deleted messages to your chat.
- **Anti-View Once:** View "View-Once" media multiple times without sending a read receipt.
- **Auto-Status View:** Automatically views your contacts' statuses.

### ⚡ Power Tools
- **148+ Commands:** Including Group management, Tools, and Fun categories.
- **Media Hub:** Download videos/audio from YouTube, TikTok, Instagram, and Facebook via commands.
- **AI Integration:** Built-in chat functionality powered by advanced AI models.
- **Interactive Menus:** User-friendly button-based navigation for easy command access.

---

# ☁️ Deployment

Click any button below to deploy **Mantra** instantly to your favorite cloud platform.

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/MidknightMantra/Mantra)
[![Deploy to Railway](https://railway.app/button.svg)](https://railway.app/template/deploy?referrerCode=Mantra&template=https://github.com/MidknightMantra/Mantra)
[![Deploy on Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/MidknightMantra/Mantra)
[![Deploy to Koyeb](https://www.koyeb.com/static/images/deploy/button.svg)](https://app.koyeb.com/deploy?type=git&repository=github.com/MidknightMantra/Mantra&name=mantra-bot)

> **Note:** For cloud deployment, ensure you fill in the environment variables (like `OWNER_NUMBER` and `SESSION_ID`) in the platform's dashboard after clicking deploy.

---

# 💻 Local Installation

### Prerequisites
- **Node.js** 18.x or higher
- **npm** or **yarn**
- **Git**

### Quick Start
```bash
# 1. Clone the repository
git clone [https://github.com/MidknightMantra/Mantra.git](https://github.com/MidknightMantra/Mantra.git)
cd Mantra

# 2. Install dependencies
npm install

# 3. Setup Environment
cp .env.example .env
# Open .env and add your configuration

# 4. Start the bot
npm start
```

### Docker Deployment
```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## 📖 Usage

### Basic Commands
- `.menu` - Interactive command menu
- `.ping` - Check bot status
- `.ai <text>` - AI chat
- `.download` - Media download hub
- `.save` - Save status updates

### Admin Commands
- `.gadmin` - Group admin panel
- `.restart` - Restart bot
- `.update` - Pull latest code
- `.sudo` - Toggle sudo mode

## 🛠️ Development

### Run Tests
```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## 📝 License

MIT License - see LICENSE file

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/awesome`)
3. Commit changes (`git commit -m 'Add awesome feature'`)
4. Push to branch (`git push origin feature/awesome`)
5. Open Pull Request

## 💡 Support

- Issues: https://github.com/MidknightMantra/Mantra/issues
- Discussions: https://github.com/MidknightMantra/Mantra/discussions

## 🌟 Acknowledgments

- Baileys WhatsApp library
- All contributors and supporters

---

**Made with ❤️ by Midknight Mantra**
