<div align="center">

# 🕉️ Mantra Multi-Device 🕉️
> *Automate. Elevate. Transcend.*

[![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)](https://github.com/Mantraa)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![Dependencies](https://img.shields.io/badge/Dependencies-Up--to--date-orange?style=for-the-badge)](package.json)

---

### 🌟 Experience the Nirvana of Automation
**Mantra** is a state-of-the-art, multi-device WhatsApp bot designed to streamline your digital interactions. Built with efficiency and elegance in mind, it provides a seamless suite of features from group management to creative media tools.

[**Features**](#-key-features) • [**Setup**](#-quick-start) • [**Commands**](#-command-showcase) • [**Configuration**](#-configuration)

---

</div>

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| 🛡️ **Group Guard** | Advanced group management: Tag All, Mention, and automated controls. |
| 🎨 **Sticker Forge** | Transform images, videos, and GIFs into high-quality stickers instantly. |
| 🗣️ **Neural TTS** | Convert text to speech with high-fidelity voices. |
| ⚡ **Flash Response** | Incredible uptime and reaction speeds using optimized Baileys integration. |
| 📊 **Poll Engine** | Create and manage interactive polls for your community. |
| 🔄 **Auto-React** | Engage with your audience automatically using smart reactions. |

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+)
- [FFmpeg](https://ffmpeg.org/) (for media processing)
- [PM2](https://pm2.keymetrics.io/) (recommended for 24/7 hosting)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Mantraa/Mantra.git
   cd Mantra
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure the environment:**
   Create a `.env` file in the root directory:
   ```env
   SESSION_ID=your_session_id_here
   PORT=3000
   ```

4. **Launch the Bot:**
   ```bash
   npm run start
   ```

---

## 🛠️ Configuration

Configure your bot settings in [`config.js`](file:///c:/Users/Mantraa/Mantra/config.js):

```javascript
global.prefix = '.'; // Set your custom prefix
global.owners = [
    '25770239992037@lid', // Add owner numbers here
];
```

---

## 📜 Command Showcase

| Command | Usage | Description |
| :--- | :--- | :--- |
| `.menu` | `.menu` | View the interactive command list. |
| `.sticker` | Reply to image/video | Create a sticker from media. |
| `.tagall` | `.tagall [text]` | Mention every member in a group. |
| `.alive` | `.alive` | Check the bot's current status. |
| `.uptime` | `.uptime` | View how long the bot has been running. |

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

<div align="center">

Made with ❤️ by [Mantra](https://github.com/Mantraa)

</div>
