import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';
import { runtime } from '../lib/utils.js';
import { getDatabaseInfo } from '../lib/database.js';
import { sendButtons } from 'gifted-btns';
import os from 'os';

/**
 * Admin Dashboard - System Stats & Control Panel
 */
addCommand({
    pattern: 'dashboard',
    alias: ['panel', 'adminpanel', 'sysinfo', 'system'],
    react: '🎛️',
    category: 'owner',
    desc: 'View bot dashboard and system stats',
    handler: async (m, { conn, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);

        await m.react('⏳');

        try {
            // System Stats
            const uptime = runtime(process.uptime());
            const memoryUsage = process.memoryUsage();
            const ramUsed = (memoryUsage.rss / 1024 / 1024).toFixed(2);
            const totalMem = (os.totalmem() / 1024 / 1024).toFixed(2);
            const platform = os.platform();
            const arch = os.arch();
            const cpu = os.cpus()[0].model;

            // Database Info
            const dbInfo = getDatabaseInfo();

            // Bot Info
            const botName = global.botName || 'Mantra';
            const mode = global.mode || 'public';
            const version = '1.0.0'; // Should pull from package.json in real app

            let statusText = `🎛️ *${botName.toUpperCase()} DASHBOARD* 🎛️\n\n`;

            statusText += `*📊 SYSTEM INFO*\n`;
            statusText += `│ 🖥️ Platform: ${platform} (${arch})\n`;
            statusText += `│ 🧠 RAM: ${ramUsed}MB / ${totalMem}MB\n`;
            statusText += `│ ⏱️ Uptime: ${uptime}\n`;
            statusText += `│ 💾 Database: ${dbInfo.type} (${dbInfo.connected ? '🟢 Connected' : '🔴 Disconnected'})\n`;
            statusText += `╰──────────────────\n\n`;

            statusText += `*⚙️ BOT STATUS*\n`;
            statusText += `│ 🤖 Mode: ${mode.toUpperCase()}\n`;
            statusText += `│ 🎭 Prefix: ${global.prefix}\n`;
            statusText += `│ 🗑️ Anti-Delete: ${global.antidelete ? '✅ ON' : '❌ OFF'}\n`;
            statusText += `│ 👁️ Auto-Status: ${global.autostatus ? '✅ ON' : '❌ OFF'}\n`;
            statusText += `╰──────────────────`;

            await sendButtons(conn, m.chat, {
                text: statusText,
                footer: global.botFooter || botName,
                buttons: [
                    {
                        name: "quick_reply",
                        buttonParamsJson: JSON.stringify({
                            display_text: "🔄 Refresh Stats",
                            id: ".dashboard"
                        })
                    },
                    {
                        name: "quick_reply",
                        buttonParamsJson: JSON.stringify({
                            display_text: "⚙️ Settings",
                            id: ".settings"
                        })
                    }
                ]
            });
            await m.react('✅');

        } catch (e) {
            log.error('Dashboard error', e);
            m.reply(`❌ Failed to load dashboard: ${e.message}`);
        }
    }
});

/**
 * Settings Manager (stub for now, can expand later)
 */
addCommand({
    pattern: 'settings',
    alias: ['config', 'setup'],
    react: '⚙️',
    category: 'owner',
    desc: 'Manage bot settings',
    handler: async (m, { conn, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);

        const text = `⚙️ *SETTINGS MANAGER*\n\nManage global bot configurations here. Toggle features on/off instantly.`;

        await sendButtons(conn, m.chat, {
            text: text,
            footer: global.botName,
            buttons: [
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: `${global.antidelete ? '❌ Disable' : '✅ Enable'} Anti-Delete`,
                        id: `.toggle antidelete`
                    })
                },
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: `${global.autostatus ? '❌ Disable' : '✅ Enable'} Auto-Status`,
                        id: `.toggle autostatus`
                    })
                },
                {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                        display_text: "🔙 Dashboard",
                        id: ".dashboard"
                    })
                }
            ]
        });
    }
});

/**
 * Feature Toggler
 */
addCommand({
    pattern: 'toggle',
    category: 'owner',
    desc: 'Toggle features',
    handler: async (m, { text, isOwner }) => {
        if (!isOwner) return m.reply(global.messages.owner);
        if (!text) return m.reply('❌ Specify feature to toggle (antidelete/autostatus)');

        const feature = text.trim().toLowerCase();

        if (feature === 'antidelete') {
            global.antidelete = !global.antidelete;
            m.reply(`🗑️ Anti-Delete is now *${global.antidelete ? 'ENABLED' : 'DISABLED'}*`);
        } else if (feature === 'autostatus') {
            global.autostatus = !global.autostatus;
            m.reply(`👁️ Auto-Status is now *${global.autostatus ? 'ENABLED' : 'DISABLED'}*`);
        } else {
            m.reply('❌ Unknown feature. Use: antidelete, autostatus');
        }
    }
});
