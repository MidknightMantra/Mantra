import { addCommand } from '../lib/plugins.js';
import pkg from 'gifted-btns';
const { sendInteractiveMessage } = pkg;

// Welcome message with interactive buttons
addCommand({
    pattern: 'start',
    alias: ['welcome', 'info'],
    desc: 'Welcome message with bot information',
    handler: async (m, { conn }) => {
        await sendInteractiveMessage(conn, m.chat, {
            title: `🔮 Welcome to ${global.botName || 'Mantra'}!`,
            text: `Hello @${m.sender.split('@')[0]}!\n\n` +
                `I'm ${global.botName || 'Mantra'}, your advanced WhatsApp assistant powered by gifted-baileys.\n\n` +
                `✨ *Features:*\n` +
                `• AI Chat & Image Generation\n` +
                `• Media Downloads (YouTube, TikTok, Instagram)\n` +
                `• Group Management Tools\n` +
                `• Sticker Creation\n` +
                `• Anti-Delete & Anti-ViewOnce\n` +
                `• And much more!\n\n` +
                `Choose an option below to get started:`,
            footer: `Developed by ${global.author || 'Midknight Mantra'}`,
            interactiveButtons: [
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '📋 View Commands',
                        id: 'start_menu'
                    })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '🤖 Try AI Chat',
                        id: 'start_ai'
                    })
                },
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: 'ℹ️ About Bot',
                        id: 'start_about'
                    })
                },
                {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: '⭐ GitHub',
                        url: 'https://github.com/MidknightMantra/Mantra'
                    })
                }
            ]
        }, {
            additionalAttributes: {
                mentions: [m.sender]
            }
        });
    }
});

// Button handlers for welcome screen
addCommand({
    pattern: 'start_menu',
    handler: async (m, { conn, args, text, isOwner, isGroup, groupMetadata, isUserAdmin, isBotAdmin }) => {
        const cmd = (await import('../lib/plugins.js')).commands['menu'];
        if (cmd) await cmd.handler(m, { conn, args, text, isOwner, isGroup, groupMetadata, isUserAdmin, isBotAdmin });
    }
});

addCommand({
    pattern: 'start_ai',
    handler: async (m, { conn, args, text, isOwner, isGroup, groupMetadata, isUserAdmin, isBotAdmin }) => {
        const cmd = (await import('../lib/plugins.js')).commands['ai'];
        if (cmd) await cmd.handler(m, { conn, args, text, isOwner, isGroup, groupMetadata, isUserAdmin, isBotAdmin });
    }
});

addCommand({
    pattern: 'start_about',
    handler: async (m, { conn }) => {
        const about = `🔮 *About ${global.botName || 'Mantra'}*\n\n` +
            `*Version:* 1.0.0\n` +
            `*Developer:* ${global.author || 'Midknight Mantra'}\n` +
            `*Library:* gifted-baileys 2.0.5\n` +
            `*Buttons:* gifted-btns 1.0.0\n\n` +
            `*Description:*\n` +
            `A powerful, modular WhatsApp bot with AI capabilities, media tools, and advanced group management.\n\n` +
            `*Source Code:*\n` +
            `https://github.com/MidknightMantra/Mantra\n\n` +
            `⚡ Built with minimalist power`;

        await m.reply(about);
    }
});
