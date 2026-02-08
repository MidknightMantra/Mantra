import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';
import { react, withReaction } from '../src/utils/messaging.js';
import { getSetting, setSetting, resetSetting, resetAllSettings } from '../lib/database.js';

/**
 * UTILITY: Parse on/off to boolean
 */
function parseBool(input) {
    if (!input) return null;
    const val = input.toLowerCase().trim();
    if (val === 'on' || val === 'true') return true;
    if (val === 'off' || val === 'false') return false;
    return null;
}

/**
 * GET SETTING
 */
addCommand({
    pattern: 'getsetting',
    alias: ['getconfig', 'viewsetting'],
    desc: 'Get a specific configuration value',
    category: 'owner',
    handler: async (m, { text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only command.');
        if (!text) return m.reply('❌ Usage: .getsetting <KEY>\nExample: .getsetting PREFIX');

        const key = text.toUpperCase().trim();
        const value = await getSetting(key);

        await react(m, '⚙️');
        await m.reply(`⚙️ *CONFIG: ${key}*\n${global.divider}\nValue: ${value || '_Not Set_'}`);
    }
});

/**
 * SET SETTING
 */
addCommand({
    pattern: 'setsetting',
    alias: ['setconfig', 'config'],
    desc: 'Set a global configuration value',
    category: 'owner',
    handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only command.');

        const [key, ...valParts] = text.split(' ');
        if (!key || valParts.length === 0) return m.reply('❌ Usage: .setsetting <KEY> <VALUE>\nExample: .setsetting PREFIX !');

        const upperKey = key.toUpperCase().trim();
        const value = valParts.join(' ').trim();

        await withReaction(conn, m, '⚙️', async () => {
            await setSetting(upperKey, value);
            await m.reply(`✅ *${upperKey}* has been set to: ${value}`);
        });
    }
});

/**
 * RESET SETTING
 */
addCommand({
    pattern: 'resetsetting',
    alias: ['resetconfig'],
    desc: 'Reset a specific setting to default',
    category: 'owner',
    handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only command.');
        if (!text) return m.reply('❌ Usage: .resetsetting <KEY>');

        const key = text.toUpperCase().trim();
        await withReaction(conn, m, '🗑️', async () => {
            await resetSetting(key);
            await m.reply(`✅ *${key}* has been reset to default.`);
        });
    }
});

/**
 * RESET ALL SETTINGS (NUCLEAR)
 */
addCommand({
    pattern: 'resetallsettings',
    alias: ['resetall', 'factoryreset'],
    desc: 'Reset ALL bot settings to defaults',
    category: 'owner',
    handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only command.');

        if (text.toLowerCase() !== 'confirm') {
            return m.reply('⚠️ *WARNING: THIS WILL WIPE ALL GLOBAL SETTINGS!* ⚠️\n\nType `.resetallsettings confirm` to proceed.');
        }

        await withReaction(conn, m, '⚠️', async () => {
            await resetAllSettings();
            await m.reply('✅ All global settings have been wiped and reset to defaults.');
        });
    }
});

log.action('Config Manager plugin loaded', 'system');
