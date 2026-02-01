# 🚀 Quick Start Guide - Mantra Bot

## Get Running in 5 Minutes

### 1. Clone & Install
```bash
git clone https://github.com/MidknightMantra/Mantra.git
cd Mantra
npm install
```

### 2. Configure
```bash
cp .env.example .env
```

Edit `.env`:
```bash
OWNER_NUMBER=254700000000  # Your WhatsApp number
BOT_NAME=MANTRA
PREFIX=.
```

### 3. Start
```bash
npm start
```

### 4. Scan QR Code
- Open WhatsApp on your phone
- Tap Menu ⋮ → Linked Devices → Link a Device
- Scan the QR code in terminal

**Done! Bot is now running** ✅

---

## Common Commands

Try in WhatsApp:
- `.menu` - See all commands
- `.ping` - Check bot status
- `.ai hello` - AI chat
- `.save` - Save status update
- `.vv` - View-once revealer

---

## Monitoring

Visit in browser:
- `http://localhost:8080/` - Health check
- `http://localhost:8080/metrics` - Statistics
- `http://localhost:8080/status` - Pretty status page

---

## Docker Deployment

### Quick Start
```bash
docker-compose up -d
```

### View Logs
```bash
docker-compose logs -f
```

### Stop
```bash
docker-compose down
```

---

## Development

### Code Quality
```bash
npm run lint       # Check issues
npm run lint:fix   # Auto-fix
npm run format     # Format code
```

### Testing
```bash
npm test              # Run tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage
```

---

## Configuration

Edit `src/config/constants.js`:

```javascript
// Rate limiting
CONFIG.RATE_LIMIT.MAX_COMMANDS_PER_MINUTE = 10

// Caching
CONFIG.CACHE.TTL = 300000  // 5 minutes

// Logging
CONFIG.LOGGING.LEVEL = 'info'
```

---

## Troubleshooting

**Bot won't start?**
```bash
npm run lint:fix
node --check index.js
```

**QR code not showing?**
- Delete `session/` folder
- Restart: `npm start`

**Commands not working?**
- Check `logs/error.log`
- Visit `http://localhost:8080/metrics`

---

## Next Steps

1. **Customize** - Add your own commands in `plugins/`
2. **Deploy** - Use Docker for 24/7 operation
3. **Monitor** - Check `/metrics` regularly
4. **Update** - `git pull && npm install`

**Need help?** Check README.md or open an issue on GitHub.
