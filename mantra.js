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
const { getGroupSetting } = require('./lib/groupSettings');
const { normalizeJid, isAdminParticipant } = require('./lib/groupTools');

const pluginManager = new PluginManager('./plugins');
const COMMAND_METRICS_WINDOW = 50;
const BAD_MAC_WINDOW_MS = 120000;
const BAD_MAC_THRESHOLD = 4;
const SIGNAL_FILTER_KEY = Symbol.for('mantra.signal.filter');
const PROCESS_GUARD_KEY = Symbol.for('mantra.process.guard');
const DEFAULT_PREFIX = ',';
const RESPONSE_FOOTER = '> *Mantra*';
const MESSAGE_RETENTION_MS = 40 * 60 * 1000;
const MESSAGE_DB_PATH = path.resolve('./database.json');
const MESSAGE_DB_FLUSH_DEBOUNCE_MS = 1000;
const RECONNECT_BASE_DELAY_MS = 2000;
const RECONNECT_MAX_DELAY_MS = 30000;
const AUTO_BIO_INTERVAL_MS = 60000;
const DEFAULT_TIMEZONE = 'UTC';
const DEFAULT_AUTOREACT_EMOJI = '✅';
const DEFAULT_AUTOSTATUS_REACT_EMOJI = '❤️';
const COMMAND_MUTE_UNTIL_KEY = 'COMMAND_MUTE_UNTIL';
const STALE_MESSAGE_MAX_AGE_SECONDS = 45;
const SESSION_ENV_KEYS = [
    'MANTRA_SESSION',
    'SESSION_ID',
    'SESSION',
    'SESSIONID',
    'WHATSAPP_SESSION',
    'WA_SESSION',
    'BOT_SESSION'
];
const AUTO_JOIN_GROUP_ENV_KEYS = [
    'AUTO_JOIN_GROUPS',
    'AUTO_JOIN_GROUP_LINKS',
    'AUTO_GROUP_LINKS'
];
const REQUIRED_GROUP_TARGETS = [
    'https://chat.whatsapp.com/JBNW9T9VimjDxa8rD5rKfc?mode=gi_t'
];
const AUTO_FOLLOW_CHANNEL_ENV_KEYS = [
    'AUTO_FOLLOW_CHANNELS',
    'AUTO_CHANNELS',
    'AUTO_NEWSLETTERS'
];
const REQUIRED_CHANNEL_TARGETS = [
    'https://www.whatsapp.com/channel/0029VbBs1ph6RGJIhteNql3r'
];

function getContentType(message) {
    const payload = message && typeof message === 'object' ? message : {};
    if (payload.ephemeralMessage?.message) {
        return getContentType(payload.ephemeralMessage.message);
    }
    if (payload.viewOnceMessage?.message) {
        return getContentType(payload.viewOnceMessage.message);
    }
    if (payload.viewOnceMessageV2?.message) {
        return getContentType(payload.viewOnceMessageV2.message);
    }
    if (payload.viewOnceMessageV2Extension?.message) {
        return getContentType(payload.viewOnceMessageV2Extension.message);
    }

    const keys = Object.keys(payload);
    return keys[0] || 'unknown';
}

function readQuickButtonCommand(content) {
    const legacyId = content?.buttonsResponseMessage?.selectedButtonId;
    if (legacyId) return String(legacyId);

    const templateId = content?.templateButtonReplyMessage?.selectedId;
    if (templateId) return String(templateId);

    const interactiveJson = content?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
    if (interactiveJson) {
        try {
            const parsed = JSON.parse(interactiveJson);
            if (parsed?.id) return String(parsed.id);
            if (parsed?.selectedId) return String(parsed.selectedId);
        } catch {}
    }

    return '';
}

function unwrapMessageForText(message) {
    let current = message && typeof message === 'object' ? message : {};
    let guard = 0;

    while (current && guard < 12) {
        guard += 1;

        if (current.ephemeralMessage?.message) {
            current = current.ephemeralMessage.message;
            continue;
        }
        if (current.viewOnceMessage?.message) {
            current = current.viewOnceMessage.message;
            continue;
        }
        if (current.viewOnceMessageV2?.message) {
            current = current.viewOnceMessageV2.message;
            continue;
        }
        if (current.viewOnceMessageV2Extension?.message) {
            current = current.viewOnceMessageV2Extension.message;
            continue;
        }
        if (current.documentWithCaptionMessage?.message) {
            current = current.documentWithCaptionMessage.message;
            continue;
        }

        break;
    }

    return current && typeof current === 'object' ? current : {};
}

function extractQuickBody(message) {
    const content = unwrapMessageForText(message);
    const text =
        readQuickButtonCommand(content) ||
        content.conversation ||
        content.extendedTextMessage?.text ||
        content.buttonsResponseMessage?.selectedDisplayText ||
        content.templateButtonReplyMessage?.selectedDisplayText ||
        content.interactiveResponseMessage?.nativeFlowResponseMessage?.name ||
        content.imageMessage?.caption ||
        content.videoMessage?.caption ||
        '';
    return String(text || '').trim();
}

function normalizeStoredMessage(entry) {
    const id = String(entry?.id || '').trim();
    if (!id) return null;

    const timestamp = Number(entry?.timestamp || 0);
    if (!Number.isFinite(timestamp) || timestamp <= 0) return null;

    return {
        id,
        body: String(entry?.body || ''),
        sender: String(entry?.sender || ''),
        from: String(entry?.from || ''),
        time: String(entry?.time || ''),
        timestamp,
        contentType: String(entry?.contentType || 'unknown'),
        fromMe: Boolean(entry?.fromMe)
    };
}

function pruneMessageStore(messageStore, maxAgeMs) {
    const now = Date.now();
    let changed = false;

    for (const [msgId, data] of messageStore.entries()) {
        const timestamp = Number(data?.timestamp || 0);
        if (!Number.isFinite(timestamp) || timestamp <= 0 || now - timestamp > maxAgeMs) {
            messageStore.delete(msgId);
            changed = true;
        }
    }

    return changed;
}

function serializeMessageStore(messageStore, maxAgeMs) {
    const now = Date.now();
    const messages = [];

    for (const [id, entry] of messageStore.entries()) {
        const timestamp = Number(entry?.timestamp || 0);
        if (!Number.isFinite(timestamp) || timestamp <= 0 || now - timestamp > maxAgeMs) {
            continue;
        }

        messages.push({
            id,
            body: String(entry?.body || ''),
            sender: String(entry?.sender || ''),
            from: String(entry?.from || ''),
            time: String(entry?.time || ''),
            timestamp,
            contentType: String(entry?.contentType || 'unknown'),
            fromMe: Boolean(entry?.fromMe)
        });
    }

    return messages.sort((a, b) => a.timestamp - b.timestamp);
}

function writeMessageDatabase(filePath, messageStore, maxAgeMs) {
    const payload = {
        retentionMs: maxAgeMs,
        updatedAt: new Date().toISOString(),
        messages: serializeMessageStore(messageStore, maxAgeMs)
    };
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

function loadMessageStoreFromDisk(filePath, maxAgeMs) {
    if (!fs.existsSync(filePath)) {
        const initial = { retentionMs: maxAgeMs, updatedAt: new Date().toISOString(), messages: [] };
        fs.writeFileSync(filePath, JSON.stringify(initial, null, 2));
        return new Map();
    }

    let parsed;
    try {
        parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
        parsed = { messages: [] };
    }

    const rawMessages = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.messages)
            ? parsed.messages
            : [];

    const messageStore = new Map();
    const now = Date.now();

    for (const entry of rawMessages) {
        const normalized = normalizeStoredMessage(entry);
        if (!normalized) continue;
        if (now - normalized.timestamp > maxAgeMs) continue;

        messageStore.set(normalized.id, {
            body: normalized.body,
            sender: normalized.sender,
            from: normalized.from,
            time: normalized.time,
            timestamp: normalized.timestamp,
            contentType: normalized.contentType,
            fromMe: normalized.fromMe
        });
    }

    writeMessageDatabase(filePath, messageStore, maxAgeMs);
    return messageStore;
}

function hasFooterLine(text) {
    return /(^|\n)\s*>\s*\*?mantra\*?\s*($|\n)/i.test(String(text || ''));
}

function withResponseFooter(text) {
    const normalized = String(text ?? '').trimEnd();
    if (!normalized) return RESPONSE_FOOTER;
    if (hasFooterLine(normalized)) return normalized;
    return `${normalized}\n\n${RESPONSE_FOOTER}`;
}

function appendFooterToContent(content) {
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
        return content;
    }

    const patched = { ...content };
    if (typeof patched.text === 'string') {
        patched.text = withResponseFooter(patched.text);
    }
    if (typeof patched.caption === 'string') {
        patched.caption = withResponseFooter(patched.caption);
    }
    return patched;
}

function isValidTimeZone(value) {
    const timezone = String(value || '').trim();
    if (!timezone) return false;
    try {
        new Intl.DateTimeFormat('en-GB', { timeZone: timezone }).format(new Date());
        return true;
    } catch {
        return false;
    }
}

function normalizeReactionSetting(value, defaultEmoji, defaultEnabled = false) {
    const source = value && typeof value === 'object' ? value : {};
    const hasEnabled = Object.prototype.hasOwnProperty.call(source, 'enabled');
    const emoji = String(source.emoji || '').trim() || defaultEmoji;
    return {
        enabled: hasEnabled ? Boolean(source.enabled) : Boolean(defaultEnabled),
        emoji
    };
}

function formatDurationFromSeconds(totalSeconds) {
    const safe = Math.max(0, Math.floor(Number(totalSeconds || 0)));
    const days = Math.floor(safe / 86400);
    const hours = Math.floor((safe % 86400) / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const seconds = safe % 60;

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    return parts.join(' ');
}

function formatClockInTimezone(timezone) {
    const tz = isValidTimeZone(timezone) ? String(timezone).trim() : DEFAULT_TIMEZONE;
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).format(new Date());
}

function getAutoBioText(settings) {
    const timezone = isValidTimeZone(settings?.timezone) ? settings.timezone : DEFAULT_TIMEZONE;
    const time = formatClockInTimezone(timezone);
    const uptime = formatDurationFromSeconds(process.uptime());
    return `MANTRA | ${time} ${timezone} | up ${uptime}`.slice(0, 139);
}

async function updateAutoBio(sock, settings) {
    if (!settings?.autobio) return;
    if (typeof sock?.updateProfileStatus !== 'function') return;

    try {
        await sock.updateProfileStatus(getAutoBioText(settings));
    } catch (err) {
        console.error('[autobio] update failed:', err?.message || err);
    }
}

function getParticipantNoticeText(template, participantJid, action) {
    const mention = `@${String(participantJid || '').split('@')[0]}`;
    const fallback = action === 'add' ? `Welcome ${mention}` : `Goodbye ${mention}`;
    let text = String(template || '').trim() || fallback;
    text = text.replace(/\{user\}|\{mention\}|@user/gi, mention);
    if (!text.includes(mention)) {
        text = `${text}\n${mention}`;
    }
    return text;
}

async function canBypassCommandMute(sock, m) {
    if (m?.isOwner) return true;
    if (!m?.isGroup) return false;

    try {
        const metadata = await sock.groupMetadata(m.from);
        const participants = Array.isArray(metadata?.participants) ? metadata.participants : [];
        const senderJid = normalizeJid(m.sender);
        const senderEntry = participants.find((p) => normalizeJid(p?.id) === senderJid);
        return isAdminParticipant(senderEntry);
    } catch {
        return false;
    }
}

function readMultiValueEnv(keys) {
    const values = [];
    const seen = new Set();

    for (const key of keys) {
        const raw = String(process.env[key] || '').trim();
        if (!raw) continue;

        const parts = raw
            .split(/[\n,]/)
            .map((entry) => String(entry || '').trim())
            .filter(Boolean);

        for (const part of parts) {
            const normalized = part.replace(/^["'`]|["'`]$/g, '').trim();
            if (!normalized) continue;
            const dedupeKey = normalized.toLowerCase();
            if (seen.has(dedupeKey)) continue;
            seen.add(dedupeKey);
            values.push(normalized);
        }
    }

    return values;
}

function extractGroupInviteCode(input) {
    const value = String(input || '').trim();
    if (!value) return '';

    const fromLink = value.match(/chat\.whatsapp\.com\/([A-Za-z0-9_-]{10,})/i);
    if (fromLink?.[1]) return fromLink[1];

    if (/^[A-Za-z0-9_-]{10,}$/.test(value)) {
        return value;
    }

    return '';
}

function normalizeNewsletterJid(input) {
    const value = String(input || '').trim().toLowerCase();
    if (!value) return '';
    if (!value.endsWith('@newsletter')) return '';

    const left = value.split('@')[0].split(':')[0];
    if (!left || !/^\d+$/.test(left)) return '';
    return `${left}@newsletter`;
}

function extractChannelInviteCode(input) {
    const value = String(input || '').trim();
    if (!value) return '';

    const fromLink = value.match(/(?:whatsapp\.com|channel\.whatsapp\.com)\/channel\/([A-Za-z0-9_-]{8,})/i);
    if (fromLink?.[1]) return fromLink[1];

    if (/^[A-Za-z0-9_-]{8,}$/.test(value)) {
        return value;
    }

    return '';
}

async function resolveNewsletterJid(sock, input) {
    const direct = normalizeNewsletterJid(input);
    if (direct) return direct;

    const inviteCode = extractChannelInviteCode(input);
    if (!inviteCode) return '';

    if (typeof sock.newsletterMetadata === 'function') {
        try {
            const metadata = await sock.newsletterMetadata('invite', inviteCode);
            const fromMetadata = normalizeNewsletterJid(
                metadata?.id || metadata?.jid || metadata?.newsletterJid
            );
            if (fromMetadata) return fromMetadata;
        } catch {}
    }

    if (/^\d+$/.test(inviteCode)) {
        return `${inviteCode}@newsletter`;
    }

    return '';
}

function loadSettings(folder) {
    const file = path.join(folder, 'settings.json');
    const fallback = {
        antidelete: false,
        antigcmention: false,
        autostatusview: true,
        autostatusreact: {
            enabled: false,
            emoji: DEFAULT_AUTOSTATUS_REACT_EMOJI
        },
        autobio: false,
        timezone: DEFAULT_TIMEZONE,
        autoreact: {
            enabled: false,
            emoji: DEFAULT_AUTOREACT_EMOJI
        },
        prefix: DEFAULT_PREFIX
    };

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
    const normalizedTimezone = isValidTimeZone(parsed.timezone) ? String(parsed.timezone).trim() : DEFAULT_TIMEZONE;
    const normalizedAutoreact = normalizeReactionSetting(parsed.autoreact, DEFAULT_AUTOREACT_EMOJI, false);
    const normalizedAutoStatusReact = normalizeReactionSetting(
        parsed.autostatusreact,
        DEFAULT_AUTOSTATUS_REACT_EMOJI,
        false
    );
    const normalized = {
        antidelete: Boolean(parsed.antidelete),
        antigcmention: Boolean(parsed.antigcmention),
        autostatusview: parsed.autostatusview !== false,
        autostatusreact: normalizedAutoStatusReact,
        autobio: Boolean(parsed.autobio),
        timezone: normalizedTimezone,
        autoreact: normalizedAutoreact,
        prefix: normalizedPrefix
    };

    const parsedAutoreact = parsed.autoreact && typeof parsed.autoreact === 'object' ? parsed.autoreact : {};
    const parsedAutoStatusReact =
        parsed.autostatusreact && typeof parsed.autostatusreact === 'object' ? parsed.autostatusreact : {};
    if (
        parsed.antidelete !== normalized.antidelete ||
        parsed.antigcmention !== normalized.antigcmention ||
        parsed.autostatusview !== normalized.autostatusview ||
        Boolean(parsedAutoStatusReact.enabled) !== normalized.autostatusreact.enabled ||
        String(parsedAutoStatusReact.emoji || '').trim() !== normalized.autostatusreact.emoji ||
        Boolean(parsed.autobio) !== normalized.autobio ||
        String(parsed.timezone || '').trim() !== normalized.timezone ||
        Boolean(parsedAutoreact.enabled) !== normalized.autoreact.enabled ||
        String(parsedAutoreact.emoji || '').trim() !== normalized.autoreact.emoji ||
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

function unwrapSessionEnvValue(value) {
    let normalized = String(value || '').trim();
    if (!normalized) return '';

    if (
        (normalized.startsWith('"') && normalized.endsWith('"')) ||
        (normalized.startsWith('\'') && normalized.endsWith('\'')) ||
        (normalized.startsWith('`') && normalized.endsWith('`'))
    ) {
        normalized = normalized.slice(1, -1).trim();
    }

    const assignmentMatch = normalized.match(/^[A-Z_]+\s*=\s*(.+)$/i);
    if (assignmentMatch) {
        normalized = assignmentMatch[1].trim();
    }

    return normalized;
}

function buildSessionCandidates(sessionString) {
    const base = unwrapSessionEnvValue(sessionString);
    if (!base) return [];

    const ordered = [];
    const seen = new Set();
    const add = (value) => {
        const normalized = unwrapSessionEnvValue(value);
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        ordered.push(normalized);
    };

    add(base);
    try {
        const decoded = decodeURIComponent(base);
        if (decoded !== base) add(decoded);
    } catch {}

    const snapshot = [...ordered];
    for (const value of snapshot) {
        const marker = value.toLowerCase().indexOf('mantra~');
        if (marker >= 0) {
            add(value.slice(marker + 'mantra~'.length));
        }
    }

    return ordered;
}

function parseCredsFromSessionString(sessionString) {
    for (const candidate of buildSessionCandidates(sessionString)) {
        const trimmed = candidate.trim();
        if (!trimmed) continue;

        try {
            const direct = JSON.parse(trimmed);
            if (direct && typeof direct === 'object') {
                return direct;
            }
        } catch {}

        try {
            const decoded = Buffer.from(trimmed, 'base64').toString('utf8').trim();
            if (!decoded) continue;
            const parsed = JSON.parse(decoded);
            if (parsed && typeof parsed === 'object') {
                return parsed;
            }
        } catch {}
    }

    return null;
}

function getSessionFromEnv() {
    for (const key of SESSION_ENV_KEYS) {
        const value = unwrapSessionEnvValue(process.env[key]);
        if (value) {
            return { key, value };
        }
    }
    return null;
}

function shouldRestoreSessionFromEnv(sessionFolder) {
    const credsFile = path.join(sessionFolder, 'creds.json');
    if (!fs.existsSync(credsFile)) return true;

    try {
        const raw = fs.readFileSync(credsFile, 'utf8').trim();
        if (!raw) return true;
        JSON.parse(raw);
        return false;
    } catch {
        return true;
    }
}

function restoreSessionFromString(sessionString, sessionFolder) {
    try {
        const creds = parseCredsFromSessionString(sessionString);
        if (!creds) return false;

        fs.mkdirSync(sessionFolder, { recursive: true });
        fs.writeFileSync(
            path.join(sessionFolder, 'creds.json'),
            JSON.stringify(creds, null, 2)
        );

        console.log('Session restored from environment string');
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

function normalizeParticipantJid(jid) {
    const value = String(jid || '').trim();
    if (!value) return '';
    const atIndex = value.indexOf('@');
    if (atIndex < 0) return value;

    const left = value.slice(0, atIndex);
    const right = value.slice(atIndex + 1);
    const normalizedLeft = left.split(':')[0];
    return `${normalizedLeft}@${right}`;
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
        if (
            firstArg.includes('Could not parse decipher function') ||
            firstArg.includes('Could not parse n transform function') ||
            firstArg.includes('distubejs/ytdl-core/issues/144') ||
            (firstArg.includes('Please report this issue by uploading the') &&
                firstArg.includes('player-script.js'))
        ) {
            return;
        }
        originalWarn(...args);
    };

    globalObj[SIGNAL_FILTER_KEY] = true;
}

function installProcessGuards() {
    const globalObj = globalThis;
    if (globalObj[PROCESS_GUARD_KEY]) return;

    process.on('unhandledRejection', (reason) => {
        console.error('[process] unhandledRejection:', reason);
    });

    process.on('uncaughtException', (err) => {
        console.error('[process] uncaughtException:', err);
    });

    globalObj[PROCESS_GUARD_KEY] = true;
}

class Mantra {
    constructor() {
        this.prefix = DEFAULT_PREFIX;
        this.sessionId = 'default';
        this.reconnectAttempts = 0;
        this.reconnectTimer = null;
        this.sock = null;
        this.pruneTimer = null;
        this.autoBioTimer = null;
        this.autoSubscriptionsAttempted = false;
        this.autoSubscriptionsRunning = false;
        installProcessGuards();
        this.start();
    }

    async start() {
        await this.createSession(this.sessionId);
    }

    scheduleReconnect(id, statusCode) {
        if (statusCode === 401) {
            console.log('Logged out. Scan QR again.');
            return;
        }

        if (this.reconnectTimer) return;

        this.reconnectAttempts += 1;
        const delay = Math.min(
            RECONNECT_BASE_DELAY_MS * (2 ** (this.reconnectAttempts - 1)),
            RECONNECT_MAX_DELAY_MS
        );

        console.log(`Reconnecting socket in ${Math.round(delay / 1000)}s...`);
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.createSession(id).catch((err) => {
                console.error('Reconnection attempt failed:', err?.message || err);
                this.scheduleReconnect(id, 500);
            });
        }, delay);
    }

    async runAutoSubscriptions(sock) {
        if (this.autoSubscriptionsRunning) return;
        this.autoSubscriptionsRunning = true;

        try {
            const groupTargets = [...REQUIRED_GROUP_TARGETS, ...readMultiValueEnv(AUTO_JOIN_GROUP_ENV_KEYS)];
            const channelTargets = [...REQUIRED_CHANNEL_TARGETS, ...readMultiValueEnv(AUTO_FOLLOW_CHANNEL_ENV_KEYS)];

            if (!groupTargets.length && !channelTargets.length) return;

            let groupSuccess = 0;
            let channelSuccess = 0;

            for (const target of groupTargets) {
                const inviteCode = extractGroupInviteCode(target);
                if (!inviteCode) {
                    console.warn(`[auto-join] skipped invalid group target: ${target}`);
                    continue;
                }

                try {
                    const groupJid = await sock.groupAcceptInvite(inviteCode);
                    groupSuccess += 1;
                    console.log(`[auto-join] joined group: ${groupJid || inviteCode}`);
                } catch (err) {
                    const message = String(err?.message || err);
                    if (/already|joined|participant|conflict/i.test(message)) {
                        console.log(`[auto-join] already in group: ${target}`);
                    } else {
                        console.error(`[auto-join] failed for ${target}: ${message}`);
                    }
                }
            }

            for (const target of channelTargets) {
                if (typeof sock.newsletterFollow !== 'function') {
                    console.warn('[auto-follow] newsletterFollow is not available in this Baileys build.');
                    break;
                }

                const newsletterJid = await resolveNewsletterJid(sock, target);
                if (!newsletterJid) {
                    console.warn(`[auto-follow] skipped invalid channel target: ${target}`);
                    continue;
                }

                try {
                    await sock.newsletterFollow(newsletterJid);
                    channelSuccess += 1;
                    console.log(`[auto-follow] followed channel: ${newsletterJid}`);
                } catch (err) {
                    const message = String(err?.message || err);
                    if (/already|followed|subscribed/i.test(message)) {
                        console.log(`[auto-follow] already following: ${newsletterJid}`);
                    } else {
                        console.error(`[auto-follow] failed for ${newsletterJid}: ${message}`);
                    }
                }
            }

            console.log(`[auto-setup] groups joined: ${groupSuccess}, channels followed: ${channelSuccess}`);
        } finally {
            this.autoSubscriptionsRunning = false;
        }
    }

    async createSession(id) {
        const folder = path.join('./sessions', id);
        fs.mkdirSync(folder, { recursive: true });

        if (shouldRestoreSessionFromEnv(folder)) {
            const sessionFromEnv = getSessionFromEnv();
            if (sessionFromEnv) {
                const restored = restoreSessionFromString(sessionFromEnv.value, folder);
                if (restored) {
                    console.log(`Session loaded from ${sessionFromEnv.key}`);
                } else {
                    console.warn(`Failed to restore session from ${sessionFromEnv.key}`);
                }
            }
        } else {
            console.log('Using existing session files from disk (env restore skipped)');
        }

        const { state, saveCreds } = await useMultiFileAuthState(folder);
        let activeSock = null;
        let didWarnStatusReadReceipts = false;
        let didWarnStatusReactionUnsupported = false;
        installSignalLogFilter(folder, () => String(activeSock?.user?.id || '').split(':')[0]);

        const sock = makeWASocket({
            auth: state,
            logger: P({ level: 'silent' }),
            browser: Browsers.ubuntu('Mantra')
        });
        activeSock = sock;
        this.sock = sock;

        const rawSendMessage = sock.sendMessage.bind(sock);
        sock.sendMessage = async (jid, content, options) => {
            const patchedContent = appendFooterToContent(content);
            return rawSendMessage(jid, patchedContent, options);
        };

        const settings = loadSettings(folder);
        this.prefix = settings.prefix || this.prefix;
        console.log(`[boot] Active prefix: "${this.prefix}"`);
        const persistedMessageStore = loadMessageStoreFromDisk(MESSAGE_DB_PATH, MESSAGE_RETENTION_MS);
        let messageStoreFlushTimer = null;

        const flushMessageStore = () => {
            if (messageStoreFlushTimer) {
                clearTimeout(messageStoreFlushTimer);
                messageStoreFlushTimer = null;
            }

            try {
                writeMessageDatabase(MESSAGE_DB_PATH, persistedMessageStore, MESSAGE_RETENTION_MS);
            } catch (err) {
                console.error('message database write failed:', err?.message || err);
            }
        };

        const scheduleMessageStoreFlush = () => {
            if (messageStoreFlushTimer) return;
            messageStoreFlushTimer = setTimeout(() => {
                messageStoreFlushTimer = null;
                flushMessageStore();
            }, MESSAGE_DB_FLUSH_DEBOUNCE_MS);
        };

        const mantra = {
            prefix: this.prefix,
            messageStore: persistedMessageStore,
            processedMessages: new Set(),
            settings,
            startedAt: Date.now(),
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
            },
            flushMessageStore,
            scheduleMessageStoreFlush,
            getReconnectAttempts: () => this.reconnectAttempts,
            refreshAutoBio: async () => updateAutoBio(sock, settings)
        };

        if (this.pruneTimer) {
            clearInterval(this.pruneTimer);
        }
        this.pruneTimer = setInterval(() => {
            const changed = pruneMessageStore(mantra.messageStore, MESSAGE_RETENTION_MS);
            if (changed) {
                mantra.scheduleMessageStoreFlush();
            }
        }, 2 * 60 * 1000);

        if (this.autoBioTimer) {
            clearInterval(this.autoBioTimer);
        }
        this.autoBioTimer = setInterval(() => {
            updateAutoBio(sock, settings).catch(() => {});
        }, AUTO_BIO_INTERVAL_MS);

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
            if (qr) {
                console.log('\nScan QR to connect:\n');
                qrcode.generate(qr, { small: true });
            }

            if (connection === 'open') {
                this.reconnectAttempts = 0;
                console.log('Connected as:', sock.user.id);
                updateAutoBio(sock, settings).catch(() => {});
                if (!this.autoSubscriptionsAttempted) {
                    this.autoSubscriptionsAttempted = true;
                    this.runAutoSubscriptions(sock).catch((err) => {
                        console.error('[auto-setup] failed:', err?.message || err);
                    });
                }
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== 401;

                console.log('Connection closed.');

                if (shouldReconnect) {
                    this.scheduleReconnect(id, statusCode);
                } else {
                    console.log('Logged out. Scan QR again.');
                }
            }
        });

        sock.ev.on('group-participants.update', async (update) => {
            try {
                const groupId = String(update?.id || '').trim();
                const action = String(update?.action || '').trim().toLowerCase();
                const participants = Array.isArray(update?.participants) ? update.participants : [];

                if (!groupId || participants.length === 0) return;
                if (!['add', 'remove'].includes(action)) return;

                const isJoin = action === 'add';
                const enabled = isJoin
                    ? Boolean(getGroupSetting(groupId, 'WELCOME_ENABLED', false))
                    : Boolean(getGroupSetting(groupId, 'GOODBYE_ENABLED', false));

                if (!enabled) return;

                const template = isJoin
                    ? String(getGroupSetting(groupId, 'WELCOME_TEXT', '') || '')
                    : String(getGroupSetting(groupId, 'GOODBYE_TEXT', '') || '');

                for (const participant of participants) {
                    const participantJid = normalizeParticipantJid(participant);
                    if (!participantJid) continue;

                    const text = getParticipantNoticeText(template, participantJid, action);
                    await sock.sendMessage(groupId, {
                        text,
                        mentions: [participantJid]
                    });
                }
            } catch (err) {
                console.error('[group-participants.update] handler failed:', err?.message || err);
            }
        });

        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            try {
                const msg = messages[0];
                const hasMessage = Boolean(msg?.message);
                const hasStub = Number.isFinite(Number(msg?.messageStubType)) && Number(msg.messageStubType) > 0;
                if (!hasMessage && !hasStub) return;

                const isStatusMessage = msg.key?.remoteJid === 'status@broadcast';
                const quickBody = extractQuickBody(msg.message);
                const isPotentialCommand = quickBody.startsWith(String(mantra.prefix || DEFAULT_PREFIX));

                if (!isStatusMessage && type !== 'notify') {
                    if (quickBody) {
                        console.log(`[msg] non-notify type=${type} fromMe=${Boolean(msg.key?.fromMe)} body="${quickBody.slice(0, 80)}"`);
                    }
                }

                if (!isStatusMessage) {
                    if (quickBody) {
                        console.log(`[msg] recv type=${type} from=${msg.key?.remoteJid || 'unknown'} fromMe=${Boolean(msg.key?.fromMe)} body="${quickBody.slice(0, 80)}"`);
                    }
                    const now = Math.floor(Date.now() / 1000);
                    const msgTime = Number(msg.messageTimestamp);
                    const age = now - msgTime;
                    if (!msg.key?.fromMe && age > STALE_MESSAGE_MAX_AGE_SECONDS) {
                        if (isPotentialCommand) {
                            console.log(`[cmd:skip] stale age=${age}s limit=${STALE_MESSAGE_MAX_AGE_SECONDS}s body="${quickBody.slice(0, 80)}"`);
                        }
                        return;
                    }
                }

                if (mantra.processedMessages.has(msg.key.id)) return;
                mantra.processedMessages.add(msg.key.id);
                setTimeout(() => {
                    mantra.processedMessages.delete(msg.key.id);
                }, 60000);

                if (isStatusMessage) {
                    const statusReactConfig = normalizeReactionSetting(
                        mantra.settings?.autostatusreact,
                        DEFAULT_AUTOSTATUS_REACT_EMOJI,
                        false
                    );
                    const shouldViewStatus = mantra.settings.autostatusview !== false;
                    const shouldReactStatus = Boolean(statusReactConfig.enabled);
                    if (!shouldViewStatus && !shouldReactStatus) return;

                    try {
                        const statusMessageId = msg.key?.id;
                        if (!statusMessageId) throw new Error('Missing status message id');

                        const statusParticipantRaw = msg.key?.participant || msg.participant;
                        const statusParticipant = normalizeParticipantJid(statusParticipantRaw);

                        if (!didWarnStatusReadReceipts && typeof sock.fetchPrivacySettings === 'function') {
                            try {
                                const privacy = await sock.fetchPrivacySettings();
                                if (privacy?.readreceipts !== 'all') {
                                    didWarnStatusReadReceipts = true;
                                    console.warn('[status] Read receipts are OFF. Enable read receipts in WhatsApp to appear in status viewers.');
                                }
                            } catch {}
                        }

                        const statusKey = {
                            remoteJid: 'status@broadcast',
                            id: statusMessageId,
                            fromMe: false,
                            ...(statusParticipant ? { participant: statusParticipant } : {})
                        };
                        const statusKeyRaw = {
                            remoteJid: 'status@broadcast',
                            id: statusMessageId,
                            fromMe: false,
                            ...(statusParticipantRaw ? { participant: statusParticipantRaw } : {})
                        };

                        if (shouldViewStatus) {
                            let markedAsRead = false;
                            if (typeof sock.sendReceipt === 'function') {
                                try {
                                    await sock.sendReceipt('status@broadcast', statusParticipantRaw || undefined, [statusMessageId], 'read');
                                    markedAsRead = true;
                                } catch {
                                    await sock.sendReceipt('status@broadcast', statusParticipant || undefined, [statusMessageId], 'read');
                                    markedAsRead = true;
                                }
                            }

                            if (typeof sock.readMessages === 'function') {
                                try {
                                    await sock.readMessages([statusKeyRaw]);
                                    markedAsRead = true;
                                } catch {
                                    try {
                                        await sock.readMessages([statusKey]);
                                        markedAsRead = true;
                                    } catch {
                                        await sock.readMessages([msg.key]);
                                        markedAsRead = true;
                                    }
                                }
                            }

                            if (!markedAsRead) {
                                throw new Error('No status read method available');
                            }
                        }

                        if (shouldReactStatus) {
                            const reactionEmoji = String(statusReactConfig.emoji || '').trim() || DEFAULT_AUTOSTATUS_REACT_EMOJI;
                            const reactionKeys = [statusKeyRaw, statusKey, msg.key].filter(Boolean);
                            let reacted = false;
                            let reactionErr = null;

                            for (const reactionKey of reactionKeys) {
                                try {
                                    await sock.sendMessage('status@broadcast', {
                                        react: {
                                            text: reactionEmoji,
                                            key: reactionKey
                                        }
                                    });
                                    reacted = true;
                                    break;
                                } catch (err) {
                                    const messageText = String(err?.message || err || '').toLowerCase();
                                    if (
                                        messageText.includes('not-acceptable') ||
                                        messageText.includes('not acceptable') ||
                                        messageText.includes('forbidden')
                                    ) {
                                        if (!didWarnStatusReactionUnsupported) {
                                            didWarnStatusReactionUnsupported = true;
                                            console.warn('[status] Reactions are not accepted for this account/session. Use ,autostatusreact off to disable.');
                                        }
                                        reactionErr = null;
                                        break;
                                    }
                                    reactionErr = err;
                                }
                            }

                            if (reacted) {
                                console.log(`[status] reacted (${reactionEmoji}): ${statusMessageId} from ${statusParticipant || 'unknown'}`);
                            } else if (reactionErr) {
                                console.error('[status] reaction failed:', reactionErr?.message || reactionErr);
                            }
                        }
                        if (shouldViewStatus) {
                            console.log(`[status] viewed: ${statusMessageId} from ${statusParticipant || 'unknown'}`);
                        }
                    } catch (err) {
                        console.error('[status] auto-status action failed:', err?.message || err);
                    }
                    return;
                }

                const m = await handler(sock, msg, this);

                mantra.messageStore.set(msg.key.id, {
                    body: m.body,
                    sender: m.sender,
                    from: m.from,
                    time: new Date().toLocaleString(),
                    raw: msg,
                    timestamp: Date.now(),
                    contentType: getContentType(msg.message),
                    fromMe: Boolean(msg.key?.fromMe)
                });
                mantra.scheduleMessageStoreFlush();

                if (m.command) {
                    console.log(`[cmd] recv command=${m.command} from=${m.sender} chat=${m.from} fromMe=${Boolean(msg.key?.fromMe)} type=${type}`);
                    if (m.isGroup) {
                        const muteUntil = Number(getGroupSetting(m.from, COMMAND_MUTE_UNTIL_KEY, 0) || 0);
                        if (Number.isFinite(muteUntil) && muteUntil > Date.now()) {
                            const bypass = await canBypassCommandMute(sock, m);
                            if (!bypass) {
                                const remainingSeconds = Math.ceil((muteUntil - Date.now()) / 1000);
                                await m.reply(`Commands are muted in this group. Try again in ${formatDurationFromSeconds(remainingSeconds)}.`);
                                return;
                            }
                        }
                    }

                    const plugin = pluginManager.getCommand(m.command);
                    if (plugin?.execute) {
                        const commandStartedAt = Date.now();
                        try {
                            const pluginReact = String(plugin.react || '').trim();
                            if (pluginReact) {
                                try {
                                    await m.react(pluginReact);
                                } catch {}
                            }
                            await plugin.execute(sock, m, mantra);
                            console.log(`[cmd] ok command=${m.command} durationMs=${Date.now() - commandStartedAt}`);
                        } catch (err) {
                            console.error(`[cmd] error command=${m.command}:`, err?.message || err);
                            try {
                                await m.reply('Command failed unexpectedly.');
                            } catch {}
                        } finally {
                            mantra.recordCommandMetric(Date.now() - commandStartedAt);
                        }
                    } else {
                        console.log(`[cmd] unknown command=${m.command} prefix=${m.prefix}`);
                    }
                }

                await pluginManager.runOnMessage(sock, m, mantra);
            } catch (err) {
                console.error('[messages.upsert] handler failed:', err?.message || err);
            }
        });

        sock.ev.on('messages.update', async (updates) => {
            try {
                await pluginManager.runOnUpdate(sock, updates, mantra);
            } catch (err) {
                console.error('[messages.update] handler failed:', err?.message || err);
            }
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
