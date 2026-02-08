import { addCommand } from '../lib/plugins.js';
import Analytics from '../lib/analytics.js';

addCommand({
    pattern: 'stats',
    alias: ['botstats', 'analytics'],
    desc: 'View global bot usage statistics',
    category: 'system',
    react: '📊',
    handler: async (m, { conn }) => {
        const stats = await Analytics.getGlobalStats();
        const topUsers = await Analytics.getTopUsers(5);

        if (!stats) return m.reply('❌ No analytics data available yet.');

        let msg = `📊 *GLOBAL BOT STATISTICS*\n\n`;
        msg += `🤖 *Total Commands Executed:* ${stats.totalCommands || 0}\n`;
        msg += `🕒 *Last Active:* ${stats.lastActive ? new Date(stats.lastActive).toLocaleString() : 'Never'}\n\n`;

        msg += `🏆 *Top 5 Active Users:*\n`;
        if (topUsers.length > 0) {
            topUsers.forEach((u, i) => {
                const id = u.key ? u.key.split('@')[0] : 'Unknown';
                msg += `${i + 1}. @${id} - ${u.totalCommands} cmds\n`;
            });
        } else {
            msg += `_No data yet_\n`;
        }

        msg += `\n🔥 *Top Commands:*\n`;
        const sortedCmds = Object.entries(stats.commandCounts || {})
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        if (sortedCmds.length > 0) {
            sortedCmds.forEach(([cmd, count]) => {
                msg += `• *${cmd}*: ${count}\n`;
            });
        } else {
            msg += `_No data yet_`;
        }

        await conn.sendMessage(m.chat, {
            text: msg,
            mentions: topUsers.map(u => u.key)
        }, { quoted: m });
    }
});

addCommand({
    pattern: 'mystats',
    alias: ['me'],
    desc: 'View your personal usage statistics',
    category: 'system',
    react: '👤',
    handler: async (m, { conn }) => {
        const stats = await Analytics.getUserStats(m.sender);

        if (!stats) return m.reply('❌ You have not used any commands yet.');

        let msg = `👤 *USER STATISTICS*\n`;
        msg += `🆔 *User:* @${m.sender.split('@')[0]}\n\n`;
        msg += `🤖 *Total Commands:* ${stats.totalCommands || 0}\n`;
        msg += `🕒 *Last Active:* ${stats.lastActive ? new Date(stats.lastActive).toLocaleString() : 'Never'}\n\n`;

        msg += `🔥 *Your Favorite Commands:*\n`;
        const sortedCmds = Object.entries(stats.commandCounts || {})
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        if (sortedCmds.length > 0) {
            sortedCmds.forEach(([cmd, count]) => {
                msg += `• *${cmd}*: ${count}\n`;
            });
        } else {
            msg += `_No data yet_`;
        }

        await conn.sendMessage(m.chat, {
            text: msg,
            mentions: [m.sender]
        }, { quoted: m });
    }
});
