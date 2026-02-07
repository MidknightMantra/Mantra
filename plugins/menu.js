import { addCommand, commands } from '../lib/plugins.js';
import { runtime } from '../lib/utils.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import { react, withReaction } from '../src/utils/messaging.js';
import { sendInteractive, createSelectButton, createSection, createRow } from '../src/utils/buttons.js';

addCommand({
    pattern: 'menu',
    alias: ['help', 'h', 'commands'],
    desc: 'Show all available commands in an interactive menu',
    category: 'bot',
    handler: async (m, { conn }) => {
        try {
            await react(conn, m, '⏳');

            const allCommandsArr = Object.keys(commands);
            const uptime = runtime(process.uptime());

            // Filter user-facing commands
            const userCommands = allCommandsArr.filter(cmd => {
                return !cmd.includes('_') &&
                    !cmd.startsWith('cat_') &&
                    !cmd.startsWith('gsettings_') &&
                    !cmd.startsWith('dl_');
            });

            // Category classification
            const categoryMap = {};
            const categoryEmojis = {
                'admin': '👑', 'media': '🎬', 'ai': '🤖', 'tools': '🛠️',
                'fun': '🎮', 'bot': '⚙️', 'other': '📦', 'general': '🌐',
                'owner': '👤', 'download': '📥'
            };

            userCommands.forEach(cmd => {
                const cmdData = commands[cmd];
                let category = (cmdData?.category || 'other').toLowerCase();

                if (!categoryMap[category]) categoryMap[category] = [];
                categoryMap[category].push(cmd);
            });

            // Sort categories for consistent display
            const categoryOrder = ['bot', 'admin', 'ai', 'tools', 'media', 'download', 'fun', 'owner', 'other'];
            const sortedCategories = categoryOrder
                .filter(cat => categoryMap[cat])
                .concat(Object.keys(categoryMap).filter(cat => !categoryOrder.includes(cat)));

            // Build select sections
            const sections = sortedCategories.map(cat => {
                const cmdList = categoryMap[cat].sort();
                const emoji = categoryEmojis[cat] || '📦';
                const rows = cmdList.map(cmd => createRow(
                    `cat_${cmd}`,
                    `${global.prefix}${cmd}`,
                    commands[cmd]?.desc || 'No description',
                    emoji
                ));

                return createSection(`${emoji} ${cat.toUpperCase()} (${cmdList.length})`, rows);
            });

            // Send interactive message
            await sendInteractive(conn, m.chat, {
                title: `✧ *${global.botName || 'Mantra'} Command Suite* ✧`,
                text: `${global.divider}\n` +
                    `✦ *User:* @${m.sender.split('@')[0]}\n` +
                    `✦ *Uptime:* ${uptime}\n` +
                    `✦ *Total Commands:* ${allCommandsArr.length}\n` +
                    `✦ *User Commands:* ${userCommands.length}\n\n` +
                    `Select a category to explore commands:\n${global.divider}`,
                footer: '🕯️ Mantra: The path of minimalist power',
                buttons: [createSelectButton('📋 Browse Commands', sections)]
            });

            await react(conn, m, '✅');

        } catch (e) {
            log.error('Menu command failed', e, { command: 'menu', user: m.sender });

            // Text-based fallback
            try {
                await react(conn, m, '❌');
                const userCommands = Object.keys(commands).filter(cmd => !cmd.includes('_'));

                let menuText = `✧ *${global.botName || 'MANTRA'} COMMAND MENU* ✧\n${global.divider}\n`;
                menuText += `✦ *User:* @${m.sender.split('@')[0]}\n`;
                menuText += `✦ *Uptime:* ${runtime(process.uptime())}\n\n`;

                userCommands.sort().forEach(cmd => {
                    menuText += `• ${global.prefix}${cmd} - ${commands[cmd]?.desc || 'No description'}\n`;
                });

                await m.reply(menuText, { mentions: [m.sender] });
            } catch (fallbackError) {
                log.error('Fallback menu failed', fallbackError);
                await m.reply('❌ Menu failed. Use .ping');
            }
        }
    }
});

// Category handler for individual command details
addCommand({
    pattern: 'cat_.*',
    handler: async (m, { conn }) => {
        try {
            await react(conn, m, '⏳');

            const cmdName = m.body.trim().replace(/^cat_/, '');
            const cmd = commands[cmdName];

            if (cmd) {
                const aliases = cmd.alias?.length > 0
                    ? cmd.alias.map(a => `${global.prefix}${a}`).join(', ')
                    : 'None';

                const category = (cmd.category || 'General').toUpperCase();

                let info = `🔮 *Command Info* ✧\n${global.divider}\n`;
                info += `✦ *Command:* ${global.prefix}${cmdName}\n`;
                info += `✦ *Aliases:* ${aliases}\n`;
                info += `✦ *Category:* ${category}\n`;
                info += `✦ *Description:* ${cmd.desc || 'No description'}\n\n`;
                info += `✨ Try it now!\n${global.divider}`;

                await m.reply(info);
            } else {
                await m.reply(`❌ Command "${cmdName}" not found.`);
            }

            await react(conn, m, '✅');
        } catch (e) {
            log.error('Command info fetch failed', e);
            await react(conn, m, '❌');
        }
    }
});
