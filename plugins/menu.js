import { addCommand, commands } from '../lib/plugins.js';
import { runtime } from '../lib/utils.js';
import { UI } from '../src/utils/design.js';
import pkg from 'gifted-btns';
const { sendInteractiveMessage, sendButtons } = pkg;

addCommand({
    pattern: 'menu',
    alias: ['help', 'h', 'commands'],
    desc: 'Show all available commands in an interactive menu',
    category: 'bot',
    handler: async (m, { conn }) => {
        try {
            // 1. Initial Reaction
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            const allCommands = Object.keys(commands);
            const uptime = runtime(process.uptime());

            // Filter out internal button handlers
            const userCommands = allCommands.filter(cmd => {
                return !cmd.includes('_') &&
                    !cmd.startsWith('cat_') &&
                    !cmd.startsWith('gsettings_') &&
                    !cmd.startsWith('dl_');
            });

            // Category mapping
            const categoryMap = {};
            const manualCategories = {
                'add': 'Admin', 'kick': 'Admin', 'promote': 'Admin', 'demote': 'Admin',
                'tagall': 'Admin', 'antilink': 'Admin', 'antidelete': 'Admin',
                'groupinfo': 'Admin', 'link': 'Admin', 'revoke': 'Admin', 'gadmin': 'Admin',
                'block': 'Admin', 'unblock': 'Admin', 'broadcast': 'Admin', 'welcome': 'Admin',

                'sticker': 'Media', 'tiktok': 'Media', 'insta': 'Media',
                'play': 'Media', 'download': 'Media', 'save': 'Media',

                'ai': 'AI', 'gpt': 'AI', 'chat': 'AI', 'imagine': 'AI', '4o': 'AI',
                'mini': 'AI', 'gifted': 'AI', 'ask': 'AI',

                'qr': 'Tools', 'scan': 'Tools', 'wikipedia': 'Tools', 'weather': 'Tools',
                'translate': 'Tools', 'trt': 'Tools', 'google': 'Tools', 'bible': 'Tools',
                'quran': 'Tools', 'jid': 'Tools',

                'joke': 'Fun', 'fact': 'Fun',

                'ping': 'Bot', 'status': 'Bot', 'restart': 'Bot', 'update': 'Bot',
                'sudo': 'Bot', 'start': 'Bot', 'menu': 'Bot', 'help': 'Bot',
                'btnmenu': 'Bot', 'selectmenu': 'Bot', 'contact': 'Bot'
            };

            userCommands.forEach(cmd => {
                const cmdData = commands[cmd];
                const category = cmdData?.category ? cmdData.category.charAt(0).toUpperCase() + cmdData.category.slice(1) : manualCategories[cmd] || 'Other';

                if (!categoryMap[category]) categoryMap[category] = [];
                categoryMap[category].push(cmd);
            });

            // Define category order for consistent display
            const categoryOrder = ['Bot', 'Admin', 'AI', 'Tools', 'Media', 'Fun', 'Other'];
            const sortedCategories = categoryOrder.filter(cat => categoryMap[cat]).concat(Object.keys(categoryMap).filter(cat => !categoryOrder.includes(cat)));

            // Build sections
            const sections = [];
            const categoryEmojis = {
                'Admin': '👑', 'Media': '🎬', 'AI': '🤖', 'Tools': '🛠️', 'Fun': '🎮', 'Bot': '⚙️', 'Other': '📦'
            };

            for (const category of sortedCategories) {
                const cmdList = categoryMap[category].sort(); // Sort alphabetically
                const rows = cmdList.map(cmd => ({
                    id: `cat_${cmd}`,
                    title: `\( {global.prefix} \){cmd}`,
                    description: commands[cmd]?.desc || 'No description',
                    header: categoryEmojis[category] || '📦'
                }));

                sections.push({
                    title: `${categoryEmojis[category] || '📦'} \( {category} Commands ( \){cmdList.length})`,
                    rows
                });
            }

            // Send interactive message
            await sendInteractiveMessage(conn, m.chat, {
                text: `✧ *\( {global.botName || 'Mantra'} Command Suite* ✧\n \){global.divider}\n` +
                    `✦ *User:* @${m.sender.split('@')[0]}\n` +
                    `✦ *Uptime:* ${uptime}\n` +
                    `✦ *Total Commands:* ${allCommands.length}\n` +
                    `✦ *User Commands:* ${userCommands.length}\n\n` +
                    `Select a category to explore commands:\n${global.divider}`,
                footer: '🕯️ Mantra: The path of minimalist power',
                interactiveButtons: [
                    {
                        name: 'single_select',
                        buttonParamsJson: JSON.stringify({
                            title: '📋 Browse Commands',
                            sections
                        })
                    }
                ]
            }, {
                additionalAttributes: {
                    mentions: [m.sender]
                }
            });

            // 2. Success Reaction
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            console.error('Menu Error:', e);

            // Fallback to simple text menu
            try {
                await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });

                const allCommands = Object.keys(commands);
                const uptime = runtime(process.uptime());

                const userCommands = allCommands.filter(cmd => {
                    return !cmd.includes('_') &&
                        !cmd.startsWith('cat_') &&
                        !cmd.startsWith('gsettings_') &&
                        !cmd.startsWith('dl_');
                });

                let menuText = `✧ *\( {global.botName || 'MANTRA'} COMMAND MENU* ✧\n \){global.divider}\n`;
                menuText += `✦ *User:* @${m.sender.split('@')[0]}\n`;
                menuText += `✦ *Uptime:* ${uptime}\n`;
                menuText += `✦ *Commands:* ${userCommands.length}\n\n`;
                menuText += `📋 *AVAILABLE COMMANDS*\n${global.divider}\n`;

                userCommands.sort().forEach(cmd => {
                    const desc = commands[cmd]?.desc || 'No description';
                    menuText += `• \( {global.prefix} \){cmd} - ${desc}\n`;
                });

                menuText += `\n${global.divider}\n🕯️ Mantra: The path of minimalist power`;

                await m.reply(menuText, { mentions: [m.sender] });
            } catch (fallbackError) {
                console.error('Fallback menu also failed:', fallbackError);
                await m.reply(`${global.emojis?.error || '❌'} Menu failed. Try: ${global.prefix}ping`);
            }
        }
    }
});

// Handler for category selections (individual command info)
addCommand({
    pattern: 'cat_.*',
    handler: async (m, { conn }) => {
        try {
            // 1. Initial Reaction
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            const cmdName = m.body.trim().replace(/^cat_/, ''); // Robust extraction
            const cmd = commands[cmdName];

            if (cmd) {
                const aliases = cmd.alias?.length > 0
                    ? cmd.alias.map(a => `\( {global.prefix} \){a}`).join(', ')
                    : 'None';

                const category = cmd.category ? cmd.category.charAt(0).toUpperCase() + cmd.category.slice(1) : 'General';

                let info = `🔮 *Command Info* ✧\n${global.divider}\n`;
                info += `✦ *Command:* \( {global.prefix} \){cmdName}\n`;
                info += `✦ *Aliases:* ${aliases}\n`;
                info += `✦ *Category:* ${category}\n`;
                info += `✦ *Description:* ${cmd.desc || 'No description'}\n\n`;
                info += `✨ Try it now!\n${global.divider}`;

                await m.reply(info);
            } else {
                await m.reply(`\( {global.emojis.error} Command " \){cmdName}" not found.`);
            }

            // 2. Success Reaction
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
        } catch (e) {
            console.error('Cat Handler Error:', e);
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            await m.reply(`${global.emojis.error} An error occurred while fetching command info.`);
        }
    }
});
