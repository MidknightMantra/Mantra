import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { runtime } from '../lib/utils.js';
import pkg from 'gifted-btns';
const { sendInteractiveMessage } = pkg;

addCommand({
    pattern: 'start',
    alias: ['welcome', 'info'],
    desc: 'Display welcome screen with quick actions and bot info',
    category: 'bot',
    handler: async (m, { conn }) => {
        try {
            // 1. Initial Reaction
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            const uptime = runtime(process.uptime());
            const username = m.pushName || m.sender.split('@')[0];

            const welcomeMsg = `${UI.box('🔮 MANTRA 2.0')} ✧\n\n` +
                `${UI.infoBlock([
                    ['Welcome', `@${m.sender.split('@')[0]}`],
                    ['Status', '⚡ Fully Operational'],
                    ['Uptime', uptime],
                    ['Version', '2.0.1'], // Added version for info
                    ['Commands', '148 Available']
                ])}\n\n` +
                `${UI.section('QUICK ACTIONS', '🎯')}\n` +
                `${UI.list([
                    '.menu - Browse all commands',
                    '.ai <text> - Chat with AI',
                    '.download - Media downloader',
                    '.bible <verse> - Fetch scriptures',
                    '.antidelete on/off - Toggle anti-delete',
                    '.vv - Reveal view-once media',
                    '.help - Get assistance'
                ])}\n\n` +
                `${UI.section('PRO TIPS', '💡')}\n` +
                `${UI.features([
                    'Use buttons for easier navigation',
                    'React 👍 to save messages',
                    'Type .menu for full command suite',
                    'Enable anti-delete in groups for message recovery',
                    'Use .vv stealthily to view hidden media'
                ])}\n\n` +
                `${UI.footer('Powered by xAI')}`; // Enhanced footer

            // Send interactive message
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
                            id: '.ai Hello! How can I assist you today?'
                        })
                    },
                    {
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: '🛠️ Tools',
                            id: '.tools'
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

            // 2. Success Reaction
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            console.error('Start Command Error:', e);
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });

            // Fallback to simple text
            const fallbackMsg = `🔮 *MANTRA 2.0* ✧\n${global.divider}\n` +
                `✦ *Welcome:* @${m.sender.split('@')[0]}\n` +
                `✦ *Status:* ⚡ Fully Operational\n` +
                `✦ *Uptime:* ${runtime(process.uptime())}\n` +
                `✦ *Commands:* 148 Available\n\n` +
                `🎯 *Quick Actions:*\n` +
                `- .menu\n` +
                `- .ai <text>\n` +
                `- .download\n` +
                `- .help\n\n` +
                `💡 *Pro Tips:*\n` +
                `- Use buttons for navigation\n` +
                `- React 👍 to save\n` +
                `- .menu for more\n` +
                `\n${global.divider}\n🕯️ The path of minimalist power`;

            await m.reply(fallbackMsg, { mentions: [m.sender] });
        }
    }
});
