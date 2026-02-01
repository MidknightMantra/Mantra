import { watchFile, unwatchFile } from 'fs';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

// --- CONFIGURATION ---
global.owner = ['254732647560', '254731173406']; // ⚠️ REPLACE with your phone number
global.pairingNumber = '254732647560'; // ⚠️ REPLACE with Bot number

global.botName = 'Mantra-MD';
global.author = 'MidknightMantra';
global.packname = 'Mantra-Stickers';
global.prefix = ',';
global.antidelete = true; // 🗑️ Anti-Delete (Always On)
global.autostatus = true; // 👁️ Auto-Status (Always On)

// 🔑 SESSION ID (Put your long string here if not using local session)
// Format: "Mantra~..."
global.sessionId = process.env.SESSION_ID || "";

// 🔮 CLASSY UI TOKENS
global.divider = '⏤⏤⏤⏤⏤⏤⏤⏤⏤⏤⏤⏤⏤';
global.emojis = {
    prefix: '✧',
    success: '✦',
    error: '✘',
    waiting: '⚗️',
    info: '🕯️',
    warning: '⚠︎',
    menu: '☥',
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