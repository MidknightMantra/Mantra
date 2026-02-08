import { watchFile, unwatchFile } from 'fs';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

// ═══════════════════════════════════════════════════════
// 🔮 MANTRA BOT CONFIGURATION
// ═══════════════════════════════════════════════════════

// --- BOT IDENTITY ---
global.botName = process.env.BOT_NAME || 'Mantra-MD';
global.author = 'MidknightMantra';
global.packname = 'Mantra-Stickers';
global.prefix = ',';
global.githubRepo = process.env.GITHUB_REPO || 'MidknightMantra/Mantra'; // Default repo for updates

// --- OWNER (Auto-detected from WhatsApp) ---
// Owner will be automatically set when bot connects
// You can manually override using OWNER_NUMBER environment variable
global.owner = process.env.OWNER_NUMBER ? [process.env.OWNER_NUMBER] : [];
global.pairingNumber = process.env.BOT_NUMBER || '';

// --- FEATURE TOGGLES ---
global.antidelete = true;      // 🗑️ Anti-Delete Messages
global.autostatus = true;      // 👁️ Auto-View Status Updates
global.autoTyping = false;     // ⌨️ Show "typing..." indicator
global.autoRecord = false;     // 🎤 Show "recording..." indicator

// --- SESSION ---
global.sessionId = process.env.SESSION_ID || "";

// --- API KEYS ---
global.giftedApiUrl = process.env.GIFTED_TECH_API || 'https://api.giftedtech.my.id';
global.giftedApiKey = process.env.GIFTED_API_KEY || 'gifted'; // Optional but recommended

// --- UI ELEMENTS ---
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

// --- STANDARDIZED MESSAGES ---
global.messages = {
    admin: '⚖️ This feature is for admins only',
    botAdmin: '⚖️ Bot must be admin first',
    owner: '👑 This feature is for bot owner only',
    group: '👥 This feature is for groups only',
    private: '💬 This feature is for private chat only',
    wait: '⚗️ Please wait...',
    processing: '⚗️ Processing your request...',
    noLink: '🔗 Please provide a link',
    invalidLink: '✘ Invalid link format',
    invalidInput: '✘ Invalid input provided',
    processingVideo: '🎬 Processing video...',
    processingAudio: '🎵 Processing audio...',
    processingImage: '🖼️ Processing image...',
    downloadComplete: '✦ Download complete!',
    uploadComplete: '✦ Upload complete!',
    featureDisabled: '✘ This feature is currently disabled',
    error: '✘ An error occurred. Please try again.',
    networkError: '✘ Network error. Check your connection.',
    apiError: '✘ API is temporarily unavailable.',
    rateLimited: '⚠︎ Too many requests. Please wait.',
    noPermission: '✘ You don\'t have permission for this action',
    invalidCommand: '✘ Invalid command format',
    missingArgs: '⚠︎ Missing required arguments'
};

// --- DOCUMENT MIME TYPES ---
global.docTypes = {
    ppt: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    zip: 'application/zip',
    pdf: 'application/pdf',
    apk: 'application/vnd.android.package-archive',
    txt: 'text/plain',
    json: 'application/json'
};

// --- COMMAND PREFIXES ---
global.prefa = [',', '!', '.', '#', '&', ''];

// ═══════════════════════════════════════════════════════
// 🔄 HOT RELOAD - Auto-reload config when file changes
// ═══════════════════════════════════════════════════════
let file = fileURLToPath(import.meta.url);
watchFile(file, () => {
    unwatchFile(file);
    console.log(chalk.redBright(`Update 'config.js'`));
    import(file);
});
