import { addCommand, commands } from '../lib/plugins.js';
import { runtime } from '../lib/utils.js';
import pkg from 'gifted-btns';
const { sendInteractiveMessage, sendButtons } = pkg;

addCommand({
    pattern: 'menu',
    alias: ['help', 'h', 'commands'],
    desc: 'Show all available commands',
    handler: async (m, { conn }) => {
        try {
            const allCommands = Object.keys(commands);
            const uptime = runtime(process.uptime());

            // Filter out internal button handlers (commands with underscores or starting with specific prefixes)
            const userCommands = allCommands.filter(cmd => {
                // Exclude internal handlers like: ping_refresh, ai_example_hello, cat_*, start_*, gadmin_*, etc.
                return !cmd.includes('_') &&
                    !cmd.startsWith('cat_') &&
                    !cmd.startsWith('gsettings_') &&
                    !cmd.startsWith('dl_');
            });

            // Auto-categorize based on command.category property or manual mapping
            const categoryMap = {
                'Admin': [],
                'Media': [],
                'AI': [],
                'Tools': [],
                'Fun': [],
                'Bot': [],
                'Other': []
            };

            // Manual category mapping for commands without category property
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
                const category = cmdData?.category || manualCategories[cmd] || 'Other';

                if (categoryMap[category]) {
                    categoryMap[category].push(cmd);
                } else {
                    categoryMap['Other'].push(cmd);
                }
            });

            // Build section rows for interactive menu
            const sections = [];
            const categoryEmojis = {
                'Admin': '👑',
                'Media': '🎬',
                'AI': '🤖',
                'Tools': '🛠️',
                'Fun': '🎮',
                'Bot': '⚙️',
                'Other': '📦'
            };

            for (const [category, cmdList] of Object.entries(categoryMap)) {
                if (cmdList.length === 0) continue;

                // Sort commands alphabetically
                cmdList.sort();

                const rows = cmdList.map(cmd => ({
                    id: `cat_${cmd}`,
                    title: `${global.prefix}${cmd}`,
                    description: commands[cmd]?.desc || 'No description',
                    header: categoryEmojis[category] || '📦'
                }));

                sections.push({
                    title: `${category} Commands (${cmdList.length})`,
                    rows
                });
            }

            await sendInteractiveMessage(conn, m.chat, {
                text: `✧ *${global.botName || 'Mantra'} Command Suite* ✧\n\n` +
                    `✦ *User:* @${m.sender.split('@')[0]}\n` +
                    `✦ *Uptime:* ${uptime}\n` +
                    `✦ *Total Commands:* ${allCommands.length}\n` +
                    `✦ *User Commands:* ${userCommands.length}\n\n` +
                    `Select a category below to explore commands:`,
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

        } catch (e) {
            console.error('Menu Error:', e);
            m.reply(`${global.emojis?.error || '❌'} Failed to generate menu.`);
        }
    }
});

// Handler for category selections
addCommand({
    pattern: 'cat_.*',
    handler: async (m, { conn }) => {
        const cmdName = m.body.replace('cat_', '');
        const cmd = commands[cmdName];

        if (cmd) {
            const aliases = cmd.alias?.length > 0
                ? cmd.alias.map(a => `${global.prefix}${a}`).join(', ')
                : 'None';

            const info = `🔮 *Command Info*\n\n` +
                `*Command:* ${global.prefix}${cmdName}\n` +
                `*Aliases:* ${aliases}\n` +
                `*Category:* ${cmd.category || 'General'}\n` +
                `*Description:* ${cmd.desc || 'No description'}\n\n` +
                `✨ Try it now!`;
            await m.reply(info);
        }
    }
});