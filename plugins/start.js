import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { runtime } from '../lib/utils.js';
import pkg from 'gifted-btns';
const { sendInteractiveMessage } = pkg;

addCommand({
    pattern: 'start',
    alias: ['welcome', 'info'],
    desc: 'Welcome screen with quick actions',
    category: 'general',
    handler: async (m, { conn }) => {
        const uptime = runtime(process.uptime());
        const username = m.pushName || m.sender.split('@')[0];

        const welcomeMsg = `${UI.box('🔮 MANTRA 2.0')}

${UI.infoBlock([
            ['Welcome', `@${m.sender.split('@')[0]}`],
            ['Status', '⚡ Fully Operational'],
            ['Uptime', uptime],
            ['Commands', '148 Available']
        ])}

${UI.section('QUICK ACTIONS', '🎯')}
${UI.list([
            '.menu - Browse all commands',
            '.ai <text> - Chat with AI',
            '.download - Media downloader',
            '.help - Get assistance'
        ])}

${UI.section('PRO TIPS', '💡')}
${UI.features([
            'Use buttons for easier navigation',
            'React 👍 to save messages',
            'Type .menu for full suite'
        ])}

${UI.footer()}`;

        try {
            await sendInteractiveMessage(conn, m.chat, {
                text: welcomeMsg,
                footer: '🕯️ The path of minimalist power',
                interactiveButtons: [
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '📋 View Menu',
                            id: '.menu'
                        })
                    },
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '🤖 Chat AI',
                            id: '.ai hello'
                        })
                    },
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: 'ℹ️ Get Help',
                            id: '.help'
                        })
                    }
                ]
            }, {
                additionalAttributes: {
                    mentions: [m.sender]
                }
            });
        } catch (e) {
            // Fallback to simple text
            await m.reply(welcomeMsg, { mentions: [m.sender] });
        }
    }
});
