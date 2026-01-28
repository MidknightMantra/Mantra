import { watchFile, unwatchFile } from 'fs';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

// --- CONFIGURATION ---
global.owner = ['254700000000']; // ⚠️ REPLACE with your phone number
global.pairingNumber = '254700000000'; // ⚠️ REPLACE with Bot number

global.botName = 'Mantra-MD';
global.author = 'MidknightMantra';
global.packname = 'Mantra-Stickers';
global.prefix = '.';

// 🔑 SESSION ID (Put your long string here if not using local session)
// Format: "Mantra~..."
global.sessionId = process.env.SESSION_ID || "";

// 🔮 UNIQUE EMOJIS (Themed)
global.emojis = {
    success: '🔮',
    error: '💀',
    waiting: '⚗️',
    info: '📜',
    warning: '👺',
    menu: '🕎',
    music: '🎻',
    video: '📽️',
    admin: '⚖️',
    owner: '👑',
    ping: '📡'
};

// Reload config on change
let file = fileURLToPath(import.meta.url);
watchFile(file, () => {
    unwatchFile(file);
    console.log(chalk.redBright(`Update 'config.js'`));
    import(file);
});