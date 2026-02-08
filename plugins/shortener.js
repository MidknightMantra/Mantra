import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';
import axios from 'axios';
import { sendButtons } from 'gifted-btns';

const API_URL = global.giftedApiUrl || 'https://api.giftedtech.my.id';
const API_KEY = global.giftedApiKey || '';

const shorteners = [
    { pattern: 'tinyurl', aliases: ['tiny'], name: 'TinyURL', endpoint: 'tinyurl' },
    { pattern: 'cleanuri', aliases: ['cleanurl', 'clean'], name: 'CleanURI', endpoint: 'cleanuri' },
    { pattern: 'vgd', aliases: ['vgdurl'], name: 'v.gd', endpoint: 'vgd' },
    { pattern: 'rebrandly', aliases: ['rebrand'], name: 'Rebrandly', endpoint: 'rebrandly' },
    { pattern: 'vurl', aliases: ['vurlshort'], name: 'vURL', endpoint: 'vurl' },
    { pattern: 'adfoc', aliases: ['adfocus'], name: 'AdFoc.us', endpoint: 'adfoc' },
    { pattern: 'ssur', aliases: ['shorte'], name: 'Shorte.st', endpoint: 'ssur' }
];

// Register each shortener command
shorteners.forEach(shortener => {
    addCommand({
        pattern: shortener.pattern,
        alias: shortener.aliases,
        react: '🔗',
        category: 'tools',
        desc: `Shorten a URL using ${shortener.name}`,
        handler: async (m, { text, conn }) => {
            if (!text) {
                return m.reply(`❌ Please provide a URL.\n\n*Usage:* .${shortener.pattern} <url>`);
            }

            const url = text.trim();
            if (!url.startsWith('http')) return m.reply('❌ Please provide a valid URL (http/https).');

            await m.react('⏳');
            try {
                const res = await axios.get(`${API_URL}/api/tools/${shortener.endpoint}`, {
                    params: { apikey: API_KEY, url: url },
                    timeout: 30000
                });

                if (!res.data?.success || !res.data?.result) {
                    return m.reply(`❌ Failed to shorten with ${shortener.name}.`);
                }

                const shortUrl = res.data.result;
                const botName = global.botName || 'Mantra';

                await sendButtons(conn, m.chat, {
                    text: `🔗 *${botName} SHORTENER*\n\n📎 *Original:* ${url}\n✂️ *Shortened:* ${shortUrl}`,
                    footer: global.botFooter || botName,
                    buttons: [
                        {
                            name: "cta_copy",
                            buttonParamsJson: JSON.stringify({
                                display_text: "📋 Copy URL",
                                copy_code: shortUrl
                            })
                        }
                    ]
                });
                await m.react('✅');

            } catch (e) {
                log.error(`${shortener.name} error`, e);
                m.reply(`❌ Failed: ${e.message}`);
            }
        }
    });
});

/**
 * Shortener Help
 */
addCommand({
    pattern: 'shortener',
    alias: ['shorteners', 'urlshort'],
    react: '🔗',
    category: 'tools',
    desc: 'Show available URL shorteners',
    handler: async (m) => {
        let msg = `🔗 *URL SHORTENER SERVICES*\n\n`;
        shorteners.forEach(s => {
            msg += `*${s.name}*: .${s.pattern} <url>\n`;
        });
        msg += `\nExample: .tinyurl https://google.com`;
        m.reply(msg);
    }
});
