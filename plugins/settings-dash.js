import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';
import { react, withReaction } from '../src/utils/messaging.js';
import { getAllSettings, getSudoNumbers, getEnabledGroupSettings } from '../lib/database.js';

/**
 * UTILITY: Format group names for display with names
 */
async function formatGroupsWithNames(conn, jids) {
    if (!jids || jids.length === 0) return '_None_';

    const infos = await Promise.all(jids.map(async jid => {
        try {
            const meta = await conn.groupMetadata(jid);
            return `• ${meta.subject || 'Unknown'}`;
        } catch (e) {
            return `• ${jid.split('@')[0]}`;
        }
    }));
    return infos.join('\n');
}

/**
 * SETTINGS DASHBOARD
 */
addCommand({
    pattern: 'settings',
    alias: ['botsettings', 'allsettings', 'dash'],
    desc: 'View comprehensive bot and group settings',
    category: 'owner',
    handler: async (m, { conn, isOwner }) => {
        if (!isOwner) return m.reply('❌ Owner Only.');

        await withReaction(conn, m, '⚙️', async () => {
            const settings = await getAllSettings();
            const sudoList = await getSudoNumbers();
            const enabledGroupSettings = await getEnabledGroupSettings();

            let msg = `╭━━━━━━━━━━━╮\n`;
            msg += `│   *⚙️ BOT SETTINGS*\n`;
            msg += `╰━━━━━━━━━━━╯\n\n`;

            const keys = Object.keys(settings).sort();
            for (const key of keys) {
                const val = settings[key] || "Not Set";
                const displayVal = val.length > 40 ? val.substring(0, 40) + "..." : val;
                msg += `▸ *${key}:* ${displayVal}\n`;
            }

            msg += `\n▸ *SUDO_USERS:* ${sudoList.length > 0 ? sudoList.join(", ") : "None"}\n`;

            msg += `\n╭━━━━━━━━━━━╮\n`;
            msg += `│   *📋 GROUP SETTINGS*\n`;
            msg += `╰━━━━━━━━━━━╯\n\n`;

            const [
                welcomeGroups,
                goodbyeGroups,
                eventsGroups,
                antilinkGroups,
                antibadGroups,
                antimentionGroups,
            ] = await Promise.all([
                formatGroupsWithNames(conn, enabledGroupSettings.WELCOME_MESSAGE),
                formatGroupsWithNames(conn, enabledGroupSettings.GOODBYE_MESSAGE),
                formatGroupsWithNames(conn, enabledGroupSettings.GROUP_EVENTS),
                formatGroupsWithNames(conn, enabledGroupSettings.ANTILINK),
                formatGroupsWithNames(conn, enabledGroupSettings.ANTIBAD),
                formatGroupsWithNames(conn, enabledGroupSettings.ANTIGROUPMENTION),
            ]);

            msg += `*🎉 WELCOME MESSAGE:*\n${welcomeGroups}\n\n`;
            msg += `*👋 GOODBYE MESSAGE:*\n${goodbyeGroups}\n\n`;
            msg += `*📢 GROUP EVENTS:*\n${eventsGroups}\n\n`;
            msg += `*🔗 ANTILINK:*\n${antilinkGroups}\n\n`;
            msg += `*🚫 ANTIBAD:*\n${antibadGroups}\n\n`;
            msg += `*🛡️ ANTI-GROUP-MENTION:*\n${antimentionGroups}\n`;

            msg += `\n${global.divider}\n_Use .groupsettings for group-specific details_`;

            await m.reply(msg);
        });
    }
});

log.action('Settings Dash plugin loaded', 'system');
