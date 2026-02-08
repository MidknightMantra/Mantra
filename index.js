console.log("-----------------------------------------");
console.log("🔮 [MANTRA] INITIALIZING CORE SYSTEM...");
console.log("-----------------------------------------");

import pkg from 'gifted-baileys';
const {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    getContentType
} = pkg;

import { SimpleStore } from './lib/simple-store.js';

import pino from 'pino';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import qrcode from 'qrcode-terminal';

// Production Infrastructure
import { logger, log } from './src/utils/logger.js';
import { initGlobalErrorHandlers, setupGracefulShutdown } from './src/utils/errorHandler.js';
import { analytics } from './src/services/analytics.js';
import { CONFIG } from './src/config/constants.js';
import { debounce } from './src/utils/cache.js';

// 1. Config & Core Modules
import './config.js';
import { smsg } from './lib/utils.js';
import { validateSession } from './lib/session.js';
import { initListeners } from './lib/listeners.js';
import { keepAlive } from './lib/alive.js';
import { commands } from './lib/plugins.js';
import {
    isAntilinkOn,
    isSudoMode,
    getGroupSetting,
    getBadWords,
    getSetting,
    setSetting,
    setSudoMode
} from './lib/database.js';

// Initialize global error handlers
initGlobalErrorHandlers();

// Make sudo checker globally available
global.isSudoMode = isSudoMode;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dynamic Plugin Loader
async function loadPlugins() {
    const pluginFolder = path.join(__dirname, 'plugins');
    const files = fs.readdirSync(pluginFolder).filter(file => file.endsWith('.js'));

    log.action('Loading plugins', 'system', { count: files.length });
    console.log(chalk.hex('#6A0DAD')(`🔮 Loading ${files.length} plugins...`));

    let loaded = 0;
    let failed = 0;

    for (const file of files) {
        try {
            const pluginPath = path.join(pluginFolder, file);
            await import(pathToFileURL(pluginPath).href);
            loaded++;
        } catch (e) {
            failed++;
            log.error(`Failed to load plugin: ${file}`, e);
            console.error(chalk.red(`❌ Failed to load ${file}:`, e.message));
        }
    }
    console.log(chalk.green(`✅ Registered ${Object.keys(commands).length} commands:`, Object.keys(commands).slice(0, 10).join(', ')));

    // Start Plugin Watcher
    const { watchPlugins } = await import('./lib/plugins.js');
    watchPlugins(pluginFolder);
}

const store = new SimpleStore();

// Read store from file on startup (persists messages)
if (fs.existsSync('./store.json')) {
    store.readFromFile('./store.json');
}

// Save store to file every 10 seconds (catches deleted messages faster)
setInterval(() => {
    store.writeToFile('./store.json');
}, 10000);

const sessionDir = './session';

// Railway keep-alive
keepAlive();

const startMantra = async () => {
    await loadPlugins();
    await validateSession(global.sessionId, sessionDir);

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const conn = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        browser: ['Mantra-MD', 'Chrome', '1.0.0'],
        auth: state,
        getMessage: async (key) => {
            if (store) {
                const msg = await store.loadMessage(key.remoteJid, key.id);
                return msg?.message || undefined;
            }
            return { conversation: "Not Found" };
        }
    });

    store.bind(conn.ev);
    await initListeners(conn, store);

    conn.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;

        if (update.qr) {
            console.log(chalk.yellow("⚠️ [MANTRA] QR Code received."));
            qrcode.generate(update.qr, { small: true });
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log(chalk.red(`📡 [CONNECTION] Closed. Reason: ${reason}`));

            if (reason === DisconnectReason.loggedOut) {
                console.log(chalk.red("💀 [MANTRA] Session logged out. Please clear session and reconnect."));
                process.exit(1);
            } else {
                console.log(chalk.blue("🔄 [MANTRA] Reconnecting..."));
                setTimeout(() => startMantra(), 5000);
            }
        } else if (connection === 'open') {
            console.log(chalk.green(`✨ [MANTRA] SUCCESS: Bot is online!`));
            log.action('Bot connected', 'system', { uptime: process.uptime() });

            // 🔑 AUTO-DETECT OWNER from connected WhatsApp account
            if (conn.user?.id) {
                const phoneNumber = conn.user.id.split(':')[0];
                if (!global.owner.includes(phoneNumber)) {
                    global.owner.push(phoneNumber);
                }
                global.ownerNumber = phoneNumber; // Set primary owner number
                global.pairingNumber = phoneNumber;
                log.action('Owner auto-detected', phoneNumber, { source: 'WhatsApp connection' });
                console.log(chalk.magenta(`👑 [OWNER] Auto-detected: ${phoneNumber}`));

                // Save to persistent config for quick reference
                try {
                    const ownerConfig = {
                        owner: phoneNumber,
                        detectedAt: new Date().toISOString(),
                        botName: global.botName
                    };
                    fs.writeFileSync('./owner.json', JSON.stringify(ownerConfig, null, 2));
                } catch (e) {
                    console.log(chalk.yellow('⚠️ Could not save owner config'));
                }
            }

            // Send online notification (non-blocking)
            if (!conn.onlineMessageSent) {
                try {
                    const ownerJid = global.owner[0] + "@s.whatsapp.net";
                    await conn.sendMessage(ownerJid, {
                        text: `🔮 *MANTRA SYSTEM ONLINE*\n\nUser: ${global.author}\nStatus: Cloud Stabilized 🛡️\nCommands: ${Object.keys(commands).length}\nAnalytics: Enabled`
                    });
                    conn.onlineMessageSent = true;
                } catch (e) {
                    console.log(chalk.yellow('⚠️ Could not send online notification to owner (timeout/network issue)'));
                }
            }

            // ALWAYS ONLINE: Send presence updates every 15 seconds
            if (conn.presenceInterval) clearInterval(conn.presenceInterval);

            // Initial presence update
            try {
                await conn.sendPresenceUpdate('available');
                console.log(chalk.hex('#6A0DAD')('📡 Initial Presence: Online'));
            } catch (e) {
                console.error('Initial presence error:', e.message);
            }

            conn.presenceInterval = setInterval(async () => {
                try {
                    const presence = await getSetting('PRESENCE', 'available');
                    await conn.sendPresenceUpdate(presence);
                    console.log(chalk.hex('#6A0DAD')(`📡 Presence: ${presence.toUpperCase()}`));
                } catch (e) {
                    console.error('Presence update error:', e.message);
                }
            }, 15000); // Every 15 seconds

            // Setup graceful shutdown
            setupGracefulShutdown(conn);

            // Send initial presence immediately
            try {
                await conn.sendPresenceUpdate('available');
                console.log(chalk.green('✅ Always-Online mode activated'));
            } catch (e) {
                console.error('Initial presence error:', e.message);
            }
        }
    });

    conn.ev.on('creds.update', saveCreds);

    // --- 4. GROUP PARTICIPANTS MONITOR (Welcome/Goodbye) ---
    conn.ev.on('group-participants.update', async (anu) => {
        try {
            const { id, participants, action } = anu;
            const metadata = await conn.groupMetadata(id);
            const isWelcome = await getGroupSetting(id, 'WELCOME');
            const isGoodbye = await getGroupSetting(id, 'GOODBYE');

            for (const num of participants) {
                const user = num.split('@')[0];
                const ppUrl = await conn.profilePictureUrl(num, 'image').catch(() => 'https://telegra.ph/file/241d7168df00416972740.jpg');

                if (action === 'add' && isWelcome) {
                    const welcomeText = await getGroupSetting(id, 'WELCOME_TEXT');
                    const msg = welcomeText || `Welcome @${user} to *${metadata.subject}*! 🌟\n\nEnjoy your stay!`;
                    await conn.sendMessage(id, {
                        image: { url: ppUrl },
                        caption: msg,
                        mentions: [num]
                    });
                } else if (action === 'remove' && isGoodbye) {
                    const goodbyeText = await getGroupSetting(id, 'GOODBYE_TEXT');
                    const msg = goodbyeText || `Goodbye @${user}. We will miss you! 👋`;
                    await conn.sendMessage(id, {
                        image: { url: ppUrl },
                        caption: msg,
                        mentions: [num]
                    });
                }
            }
        } catch (e) {
            console.error('Group Participants Error:', e);
        }
    });

    conn.ev.on('messages.upsert', async chatUpdate => {
        try {
            let m = chatUpdate.messages[0];
            if (!m.message) return;

            // Handle Ephemeral messages before smsg
            if (m.message.ephemeralMessage) {
                m.message = m.message.ephemeralMessage.message;
            }

            m = smsg(conn, m, store);

            // Early logging for debugging (before any filtering)
            const msgSender = m.sender || 'unknown';
            console.log(chalk.cyan(`[RAW] Message from: ${msgSender.split('@')[0]} | Type: ${getContentType(m.message)} | FromMe: ${m.key.fromMe}`));

            // Check if sender is owner
            const senderNumber = msgSender.split('@')[0];
            const msgIsFromOwner = global.owner.includes(senderNumber);

            // Allow owner messages always, or non-fromMe messages, or fromMe if sudo mode is enabled
            const { isSudoMode } = await import('./lib/database.js');
            const sudoMode = await isSudoMode();
            if (!m.message || (m.key.fromMe && !msgIsFromOwner && !sudoMode)) {
                console.log(chalk.gray(`[SKIP] Message filtered (fromMe:${m.key.fromMe}, owner:${msgIsFromOwner}, sudo:${sudoMode})`));
                return;
            }

            // Update presence on each incoming message for instant online status
            try {
                await conn.sendPresenceUpdate('available', m.chat);
            } catch (e) {
                // Silent fail - don't spam logs
            }

            // --- Robust Body Extraction ---
            const mtype = getContentType(m.message);
            const content = m.message[mtype];

            // Extract body for command parsing, including ViewOnce captions
            let body = '';
            let isButtonResponse = false;

            if (mtype === 'conversation') {
                body = m.message.conversation;
            } else if (mtype === 'imageMessage' || mtype === 'videoMessage') {
                body = content.caption || '';
            } else if (mtype === 'extendedTextMessage') {
                body = content.text || '';
            } else if (mtype === 'viewOnceMessageV2' || mtype === 'viewOnceMessage') {
                const innerType = Object.keys(content.message)[0];
                body = content.message[innerType]?.caption || '';
            } else if (mtype === 'listResponseMessage') {
                body = content.singleSelectReply?.selectedRowId || '';
                isButtonResponse = true;
            } else if (mtype === 'buttonsResponseMessage') {
                body = content.selectedButtonId || '';
                isButtonResponse = true;
            }

            // Determine if message is a command and extract the used prefix
            const possiblePrefixes = global.prefa || [',', '!', '.', '#', '&'];
            const usedPrefix = isButtonResponse ? '' : (possiblePrefixes.find(p => p !== '' && body.startsWith(p)) || '');
            const isCmd = isButtonResponse || (usedPrefix !== '');

            const command = isButtonResponse
                ? body.trim().toLowerCase()
                : (isCmd ? body.slice(usedPrefix.length).trim().split(' ').shift().toLowerCase() : '');
            const args = body.trim().split(/ +/).slice(1);
            const text = args.join(" ");
            const sender = m.sender;
            const isGroup = m.isGroup;

            if (body) {
                console.log(chalk.black.bgWhite(`[MSG] From: ${sender.split('@')[0]} | Body: ${body.substring(0, 60)}${body.length > 60 ? '...' : ''}`));
            }

            const groupMetadata = isGroup ? await conn.groupMetadata(m.chat).catch(e => {
                console.log(chalk.yellow(`[WARN] Metadata fetch failed for ${m.chat}: ${e.message}`));
                return '';
            }) : '';
            const groupAdmins = isGroup ? groupMetadata.participants.filter(p => p.admin).map(p => p.id) : [];
            const isOwner = global.owner.includes(sender.split('@')[0]) || sender.split('@')[0] === (conn.user?.id ? conn.user.id.split(':')[0] : '');
            const isUserAdmin = groupAdmins.includes(sender);
            const isBotAdmin = groupAdmins.includes(conn.user.id.split(':')[0] + '@s.whatsapp.net');

            // 2. Advanced Anti-Link Monitor
            const antilinkMode = await getGroupSetting(m.chat, 'ANTILINK');
            if (isGroup && antilinkMode && antilinkMode !== 'off' && antilinkMode !== 'false' && !isOwner && !isUserAdmin && isBotAdmin) {
                const linkRegex = /chat.whatsapp.com\/(?:invite\/)?([0-9A-Za-z]{20,24})/i;
                if (linkRegex.test(body)) {
                    await conn.sendMessage(m.chat, { delete: m.key });

                    if (antilinkMode === 'kick') {
                        await conn.groupParticipantsUpdate(m.chat, [sender], 'remove');
                        return conn.sendMessage(m.chat, {
                            text: `🚫 *Anti-Link Kick:* @${sender.split('@')[0]} removed.`,
                            mentions: [sender]
                        });
                    } else if (antilinkMode === 'warn') {
                        const warnLimit = await getGroupSetting(m.chat, 'ANTILINK_WARN_COUNT') || 3;
                        const currentWarns = (global.antilinkWarns?.[m.chat]?.[sender] || 0) + 1;
                        if (!global.antilinkWarns) global.antilinkWarns = {};
                        if (!global.antilinkWarns[m.chat]) global.antilinkWarns[m.chat] = {};
                        global.antilinkWarns[m.chat][sender] = currentWarns;

                        if (currentWarns >= warnLimit) {
                            await conn.groupParticipantsUpdate(m.chat, [sender], 'remove');
                            delete global.antilinkWarns[m.chat][sender];
                            return conn.sendMessage(m.chat, {
                                text: `🚫 *Anti-Link:* @${sender.split('@')[0]} removed after ${warnLimit} warnings.`,
                                mentions: [sender]
                            });
                        } else {
                            return conn.sendMessage(m.chat, {
                                text: `⚠️ *Anti-Link Warning:* @${sender.split('@')[0]}\nLinks are prohibited. Warning: *${currentWarns}/${warnLimit}*`,
                                mentions: [sender]
                            });
                        }
                    } else {
                        // Default 'delete' or 'on' mode
                        return conn.sendMessage(m.chat, {
                            text: `🚫 *Anti-Link:* @${sender.split('@')[0]}, links are not allowed here.`,
                            mentions: [sender]
                        });
                    }
                }
            }

            // 3. Advanced Anti-Bad Monitor
            const antibadMode = await getGroupSetting(m.chat, 'ANTIBAD');
            if (isGroup && antibadMode && antibadMode !== 'off' && antibadMode !== 'false' && !isOwner && !isUserAdmin && isBotAdmin) {
                const badWords = await getBadWords(m.chat);
                if (badWords.length > 0) {
                    const foundBad = badWords.some(word => body.toLowerCase().includes(word));
                    if (foundBad) {
                        await conn.sendMessage(m.chat, { delete: m.key });

                        if (antibadMode === 'kick') {
                            await conn.groupParticipantsUpdate(m.chat, [sender], 'remove');
                            return conn.sendMessage(m.chat, {
                                text: `🚫 *Anti-BadWords Kick:* @${sender.split('@')[0]} removed for profanity.`,
                                mentions: [sender]
                            });
                        } else if (antibadMode === 'warn') {
                            const warnLimit = await getGroupSetting(m.chat, 'ANTIBAD_WARN_COUNT') || 3;
                            const currentWarns = (global.antibadWarns?.[m.chat]?.[sender] || 0) + 1;
                            if (!global.antibadWarns) global.antibadWarns = {};
                            if (!global.antibadWarns[m.chat]) global.antibadWarns[m.chat] = {};
                            global.antibadWarns[m.chat][sender] = currentWarns;

                            if (currentWarns >= warnLimit) {
                                await conn.groupParticipantsUpdate(m.chat, [sender], 'remove');
                                delete global.antibadWarns[m.chat][sender];
                                return conn.sendMessage(m.chat, {
                                    text: `🚫 *Anti-BadWords:* @${sender.split('@')[0]} removed after ${warnLimit} warnings.`,
                                    mentions: [sender]
                                });
                            } else {
                                return conn.sendMessage(m.chat, {
                                    text: `⚠️ *Anti-BadWords Warning:* @${sender.split('@')[0]}\nBad words are not allowed. Warning: *${currentWarns}/${warnLimit}*`,
                                    mentions: [sender]
                                });
                            }
                        } else {
                            // Default delete mode
                            return conn.sendMessage(m.chat, {
                                text: `🚫 *Anti-BadWords:* @${sender.split('@')[0]}, please mind your language.`,
                                mentions: [sender]
                            });
                        }
                    }
                }
            }

            // 3. Command Execution
            if (isCmd) {
                console.log(chalk.cyan(`[DEBUG] Received command:"${command}" from ${sender.split('@')[0]}. Body:"${body.substring(0, 50)}"`));
                console.log(chalk.cyan(`[DEBUG] Commands available:`, Object.keys(commands).length));

                if (commands[command]) {
                    console.log(chalk.green(`[CMD] Executing: ${command} (from ${commands[command].filename || 'unknown'})`));

                    // Track command usage (Analytics)
                    try {
                        const { default: Analytics } = await import('./lib/analytics.js');
                        await Analytics.track(command, m.sender);
                    } catch (err) {
                        console.error('Analytics load error:', err);
                    }

                    await commands[command].handler(m, {
                        conn,
                        args,
                        text,
                        isOwner,
                        isGroup,
                        groupMetadata,
                        isAdmin: isUserAdmin || isOwner,
                        isUserAdmin,
                        isBotAdmin,
                        botPrefix: usedPrefix || global.prefix || ','
                    });
                } else {
                    console.log(chalk.gray(`[INFO] No command found for: "${command}" (Registry size: ${Object.keys(commands).length})`));
                }
            }
        } catch (err) {
            console.error('Upsert Error:', err);
        }
    });
};

/** 
 * ERROR HANDLING - Ensures the bot doesn't crash on Railway
 */
process.on('uncaughtException', (err) => {
    console.error('🚨 UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 UNHANDLED REJECTION:', reason);
});

startMantra();