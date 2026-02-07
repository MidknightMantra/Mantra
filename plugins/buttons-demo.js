import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';
import {
    sendInteractive,
    sendSimpleButtons,
    createSelectButton,
    createSection,
    createRow,
    createQuickReply
} from '../src/utils/buttons.js';

// Example 1: Simple Quick Reply Buttons
addCommand({
    pattern: 'btnmenu',
    category: 'tools',
    handler: async (m, { conn }) => {
        await sendSimpleButtons(conn, m.chat, '🔮 Mantra Bot Menu\n\nChoose an option below:', [
            { id: 'help', text: 'Help Guide' },
            { id: 'features', text: 'View Features' },
            { id: 'about', text: 'About Bot' }
        ], { title: 'Mantra Bot', footer: 'Powered by Mantra' });
    }
});

// Example 2: URL + Copy + Call Buttons
addCommand({
    pattern: 'contact',
    category: 'tools',
    handler: async (m, { conn }) => {
        await sendInteractive(conn, m.chat, {
            text: '📞 *Contact Information*',
            footer: 'Get in touch',
            buttons: [
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
        const sections = [
            createSection('Main Commands', [
                createRow('cat_admin', 'Admin Tools', 'Group management commands', '👑'),
                createRow('cat_media', 'Media Tools', 'Download & convert media', '🎬'),
                createRow('cat_fun', 'Fun & Games', 'Entertainment commands', '🎮')
            ]),
            createSection('Utilities', [
                createRow('cat_tools', 'Tools', 'QR, stickers, etc.', '🛠️'),
                createRow('cat_info', 'Information', 'Wikipedia, weather, etc.', 'ℹ️')
            ])
        ];

        await sendInteractive(conn, m.chat, {
            text: '🎯 *Command Categories*',
            footer: 'Select a category to explore',
            buttons: [createSelectButton('Browse Categories', sections)]
        });
    }
});

// Example 4: Mixed Buttons (Quick Reply + URL)
addCommand({
    pattern: 'welcome',
    category: 'tools',
    handler: async (m, { conn }) => {
        await sendInteractive(conn, m.chat, {
            title: '👋 Welcome!',
            text: 'Welcome to Mantra Bot! Get started below:',
            footer: 'Choose an action',
            buttons: [
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🚀 Quick Start',
                        id: 'quickstart'
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

        if (responses[cmd]) {
            await m.reply(responses[cmd]);
        }
    }
});

