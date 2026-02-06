# Mantra

A feature-rich, WhatsApp Multi-Device bot

# 🚀 Features

### Core Features
- 148+ Commands across multiple categories
- Interactive button menus
- Auto-status viewing
- Anti-view-once (stealth mode)
- Anti-delete message recovery
- Media download hub
- AI chat integration

# Installation
  
### Prerequisites
- Node.js 18+
- npm or yarn
- WhatsApp account

### Quick Start
```bash
# Clone repository
git clone https://github.com/MidknightMantra/Mantra.git
cd Mantra

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start bot
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
