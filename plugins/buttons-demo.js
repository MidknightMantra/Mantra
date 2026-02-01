import { addCommand } from '../lib/plugins.js';
import pkg from 'gifted-btns';
const { sendButtons, sendInteractiveMessage } = pkg;

// Example 1: Simple Quick Reply Buttons
addCommand({
    pattern: 'btnmenu',
    category: 'tools',
    handler: async (m, { conn }) => {
        await sendButtons(conn, m.chat, {
            title: '🔮 Mantra Bot Menu',
            text: 'Choose an option below:',
            footer: 'Powered by Mantra',
            buttons: [
                { id: 'help', text: 'Help Guide' },
                { id: 'features', text: 'View Features' },
                { id: 'about', text: 'About Bot' }
            ]
        });
    }
});

// Example 2: URL + Copy + Call Buttons
addCommand({
    pattern: 'contact',
    category: 'tools',
    handler: async (m, { conn }) => {
        await sendInteractiveMessage(conn, m.chat, {
            text: '📞 *Contact Information*',
            footer: 'Get in touch',
            interactiveButtons: [
                {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: 'Visit Website',
                        url: 'https://github.com/MidknightMantra'
                    })
                },
                {
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: 'Copy Support Code',
                        copy_code: 'SUPPORT-2026'
                    })
                },
                {
                    name: 'cta_call',
                    buttonParamsJson: JSON.stringify({
                        display_text: 'Call Support',
                        phone_number: '+1234567890'
                    })
                }
            ]
        });
    }
});

// Example 3: Single Select Menu (List inside a button)
addCommand({
    pattern: 'selectmenu',
    alias: ['menu'],
    category: 'tools',
    handler: async (m, { conn }) => {
        await sendInteractiveMessage(conn, m.chat, {
            text: '🎯 *Command Categories*',
            footer: 'Select a category to explore',
            interactiveButtons: [
                {
                    name: 'single_select',
                    buttonParamsJson: JSON.stringify({
                        title: 'Browse Categories',
                        sections: [
                            {
                                title: 'Main Commands',
                                rows: [
                                    {
                                        id: 'cat_admin',
                                        title: 'Admin Tools',
                                        description: 'Group management commands',
                                        header: '👑'
                                    },
                                    {
                                        id: 'cat_media',
                                        title: 'Media Tools',
                                        description: 'Download & convert media',
                                        header: '🎬'
                                    },
                                    {
                                        id: 'cat_fun',
                                        title: 'Fun & Games',
                                        description: 'Entertainment commands',
                                        header: '🎮'
                                    }
                                ]
                            },
                            {
                                title: 'Utilities',
                                rows: [
                                    {
                                        id: 'cat_tools',
                                        title: 'Tools',
                                        description: 'QR, stickers, etc.',
                                        header: '🛠️'
                                    },
                                    {
                                        id: 'cat_info',
                                        title: 'Information',
                                        description: 'Wikipedia, weather, etc.',
                                        header: 'ℹ️'
                                    }
                                ]
                            }
                        ]
                    })
                }
            ]
        });
    }
});

// Example 4: Mixed Buttons (Quick Reply + URL)
addCommand({
    pattern: 'welcome',
    category: 'tools',
    handler: async (m, { conn }) => {
        await sendInteractiveMessage(conn, m.chat, {
            title: '👋 Welcome!',
            text: 'Welcome to Mantra Bot! Get started below:',
            footer: 'Choose an action',
            interactiveButtons: [
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🚀 Quick Start',
                        id: 'quickstart'
                    })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📖 Read Docs',
                        id: 'docs'
                    })
                },
                {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: '⭐ Star on GitHub',
                        url: 'https://github.com/MidknightMantra/Mantra'
                    })
                }
            ]
        });
    }
});

// Example 5: Response Handler for Button Clicks
addCommand({
    pattern: 'quickstart|features|about|help',
    category: 'tools',
    handler: async (m, { conn }) => {
        const cmd = m.body.toLowerCase();

        const responses = {
            'quickstart': '🚀 *Quick Start Guide*\n\n1. Type .menu to see all commands\n2. Try .ai for AI chat\n3. Use .play to download music\n4. Send .sticker with an image to create stickers',
            'features': '✨ *Bot Features*\n\n• AI Chat Integration\n• Media Downloads (YT, TikTok)\n• Sticker Maker\n• Group Management\n• Anti-Delete Messages\n• Auto-Status View',
            'about': '🔮 *About Mantra Bot*\n\nA powerful WhatsApp bot built with gifted-baileys.\nVersion: 1.0.0\nDeveloper: Midknight Mantra',
            'help': '📖 *Help Guide*\n\nPrefix: .\n\nBasic Commands:\n• .menu - Show all commands\n• .ai <text> - Chat with AI\n• .play <song> - Download music\n• .sticker - Create sticker from image'
        };

        await m.reply(responses[cmd] || 'Unknown command');
    }
});
