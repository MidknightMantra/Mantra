const {
    default: makeWASocket,
    useMultiFileAuthState,
    Browsers
} = require('gifted-baileys');

const fs = require('fs');
const path = require('path');
const P = require('pino');
const qrcode = require('qrcode-terminal');

const handler = require('./handler');
const PluginManager = require('./pluginManager');

const pluginManager = new PluginManager('./plugins');
const COMMAND_METRICS_WINDOW = 50;
const BAD_MAC_WINDOW_MS = 120000;
const BAD_MAC_THRESHOLD = 4;
const SIGNAL_FILTER_KEY = Symbol.for('mantra.signal.filter');
const DEFAULT_PREFIX = ',';

function loadSettings(folder) {
    const file = path.join(folder, 'settings.json');
    const fallback = { antidelete: false, prefix: DEFAULT_PREFIX };

    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
        return fallback;
    }

    let parsed = {};
    try {
        parsed = JSON.parse(fs.readFileSync(file));
    } catch {
        parsed = {};
    }

    const prefixCandidate = String(parsed.prefix || '').trim();
    const normalizedPrefix = /^[^\w\s]$/u.test(prefixCandidate) ? prefixCandidate : DEFAULT_PREFIX;
    const normalized = {
        antidelete: Boolean(parsed.antidelete),
        prefix: normalizedPrefix
    };

    if (
        parsed.antidelete !== normalized.antidelete ||
        parsed.prefix !== normalized.prefix
    ) {
        fs.writeFileSync(file, JSON.stringify(normalized, null, 2));
    }

    return normalized;
}

function saveSettings(folder, settings) {
    const file = path.join(folder, 'settings.json');
    fs.writeFileSync(file, JSON.stringify(settings, null, 2));
}

function restoreSessionFromString(sessionString, sessionFolder) {
    try {
        if (!sessionString.startsWith('Mantra~')) return false;

        const base64 = sessionString.split('Mantra~')[1];
        const json = Buffer.from(base64, 'base64').toString('utf8');
        const creds = JSON.parse(json);

        fs.mkdirSync(sessionFolder, { recursive: true });
        fs.writeFileSync(
            path.join(sessionFolder, 'creds.json'),
            JSON.stringify(creds, null, 2)
        );

        console.log('Session restored from Mantra string');
        return true;
    } catch (err) {
        console.error('Invalid session string:', err.message);
        return false;
    }
}

function extractJidFromSignalStack(stack) {
    const value = String(stack || '');
    const match = value.match(/at async (\d+)\.\d+ \[as awaitable\]/);
    return match?.[1] || null;
}

function purgeSignalSessionsForJid(sessionFolder, jidDigits) {
    if (!jidDigits || !fs.existsSync(sessionFolder)) return 0;

    const escaped = jidDigits.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
        new RegExp(`^session-${escaped}\\.\\d+\\.json$`),
        new RegExp(`^sender-key-status@broadcast--${escaped}--\\d+\\.json$`),
        new RegExp(`^sender-key-.*--${escaped}--\\d+\\.json$`)
    ];

    let deleted = 0;
    for (const file of fs.readdirSync(sessionFolder)) {
        if (!patterns.some((pattern) => pattern.test(file))) continue;
        try {
            fs.unlinkSync(path.join(sessionFolder, file));
            deleted += 1;
        } catch {}
    }

    return deleted;
}

function installSignalLogFilter(sessionFolder, getOwnJidDigits) {
    const globalObj = globalThis;
    if (globalObj[SIGNAL_FILTER_KEY]) return;

    const originalError = console.error.bind(console);
    const originalWarn = console.warn.bind(console);
    const badMacByJid = new Map();

    const recordBadMac = (stack) => {
        const jidDigits = extractJidFromSignalStack(stack);
        if (!jidDigits) return;

        const ownDigits = String(getOwnJidDigits?.() || '');
        if (ownDigits && ownDigits === jidDigits) return;

        const now = Date.now();
        const recent = (badMacByJid.get(jidDigits) || []).filter((ts) => now - ts < BAD_MAC_WINDOW_MS);
        recent.push(now);
        badMacByJid.set(jidDigits, recent);

        if (recent.length < BAD_MAC_THRESHOLD) return;

        const deleted = purgeSignalSessionsForJid(sessionFolder, jidDigits);
        badMacByJid.delete(jidDigits);
        if (deleted > 0) {
            originalWarn(`[signal] Cleared ${deleted} stale session file(s) for ${jidDigits} after repeated Bad MAC errors`);
        }
    };

    console.error = (...args) => {
        const firstArg = typeof args[0] === 'string' ? args[0] : '';

        if (firstArg === 'Failed to decrypt message with any known session...') {
            return;
        }

        if (firstArg.startsWith('Session error:Error: Bad MAC')) {
            recordBadMac(args[1]);
            return;
        }

        originalError(...args);
    };

    console.warn = (...args) => {
        const firstArg = typeof args[0] === 'string' ? args[0] : '';
        if (firstArg === 'Closing open session in favor of incoming prekey bundle') {
            return;
        }
        originalWarn(...args);
    };

    globalObj[SIGNAL_FILTER_KEY] = true;
}

class Mantra {
    constructor() {
        this.prefix = DEFAULT_PREFIX;
        this.start();
    }

    async start() {
        await this.createSession('default');
    }

    async createSession(id) {
        const folder = path.join('./sessions', id);
        fs.mkdirSync(folder, { recursive: true });

        if (process.env.MANTRA_SESSION) {
            restoreSessionFromString(process.env.MANTRA_SESSION, folder);
        }

        const { state, saveCreds } = await useMultiFileAuthState(folder);
        let activeSock = null;
        installSignalLogFilter(folder, () => String(activeSock?.user?.id || '').split(':')[0]);

        const sock = makeWASocket({
            auth: state,
            logger: P({ level: 'silent' }),
            browser: Browsers.ubuntu('Mantra')
        });
        activeSock = sock;

        const settings = loadSettings(folder);
        this.prefix = settings.prefix || this.prefix;

        const mantra = {
            prefix: this.prefix,
            messageStore: new Map(),
            processedMessages: new Set(),
            settings,
            metrics: {
                averageCommandResponseMs: 0,
                totalCommandsMeasured: 0,
                samples: []
            },
            recordCommandMetric(durationMs) {
                const safeDuration = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
                this.metrics.totalCommandsMeasured += 1;
                this.metrics.samples.push(safeDuration);

                if (this.metrics.samples.length > COMMAND_METRICS_WINDOW) {
                    this.metrics.samples.shift();
                }

                const total = this.metrics.samples.reduce((sum, value) => sum + value, 0);
                this.metrics.averageCommandResponseMs = total / this.metrics.samples.length;
            },
            saveSettings: () => saveSettings(folder, settings),
            setPrefix: (nextPrefix) => {
                const normalized = String(nextPrefix || '').trim();
                this.prefix = normalized;
                mantra.prefix = normalized;
                settings.prefix = normalized;
                saveSettings(folder, settings);
            }
        };

        setInterval(() => {
            const now = Date.now();
            for (const [msgId, data] of mantra.messageStore.entries()) {
                if (now - data.timestamp > 10 * 60 * 1000) {
                    mantra.messageStore.delete(msgId);
                }
            }
        }, 2 * 60 * 1000);

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
            if (qr) {
                console.log('\nScan QR to connect:\n');
                qrcode.generate(qr, { small: true });
            }

            if (connection === 'open') {
                console.log('Connected as:', sock.user.id);
            }

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;

                console.log('Connection closed.');

                if (shouldReconnect) {
                    console.log('Reconnecting socket...');
                } else {
                    console.log('Logged out. Scan QR again.');
                }
            }
        });

        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;

            const msg = messages[0];
            if (!msg.message) return;

            const now = Math.floor(Date.now() / 1000);
            const msgTime = Number(msg.messageTimestamp);
            if (now - msgTime > 5) return;

            if (mantra.processedMessages.has(msg.key.id)) return;
            mantra.processedMessages.add(msg.key.id);
            setTimeout(() => {
                mantra.processedMessages.delete(msg.key.id);
            }, 60000);

            const m = await handler(sock, msg, this);

            mantra.messageStore.set(msg.key.id, {
                body: m.body,
                sender: m.sender,
                from: m.from,
                time: new Date().toLocaleString(),
                raw: msg,
                timestamp: Date.now()
            });

            if (m.command) {
                const plugin = pluginManager.getCommand(m.command);
                if (plugin?.execute) {
                    const commandStartedAt = Date.now();
                    try {
                        await plugin.execute(sock, m, mantra);
                    } finally {
                        mantra.recordCommandMetric(Date.now() - commandStartedAt);
                    }
                }
            }

            await pluginManager.runOnMessage(sock, m, mantra);
        });

        sock.ev.on('messages.update', async (updates) => {
            await pluginManager.runOnUpdate(sock, updates, mantra);
        });

        this.safeSend = async (safeSock, jid, content, quoted) => {
            await new Promise((resolve) => setTimeout(resolve, 500));
            await safeSock.sendMessage(jid, content, { quoted });
        };

        this.safeButtons = async (safeSock, jid, opts) => {
            const { sendButtons } = require('gifted-btns');
            await new Promise((resolve) => setTimeout(resolve, 500));
            await sendButtons(safeSock, jid, opts);
        };

        this.safeInteractive = async (safeSock, jid, opts) => {
            const { sendInteractiveMessage } = require('gifted-btns');
            await new Promise((resolve) => setTimeout(resolve, 500));
            await sendInteractiveMessage(safeSock, jid, opts);
        };
    }
}

new Mantra();
