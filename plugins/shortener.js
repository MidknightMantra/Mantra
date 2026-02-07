import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';
import { react, withReaction } from '../src/utils/messaging.js';
import { sendSimpleButtons } from '../src/utils/buttons.js';
import axios from 'axios';

// API Configuration
const API_BASE = global.giftedApiUrl || 'https://api.giftedtech.my.id';
const API_KEY = global.giftedApiKey || '';

const SHORTENERS = [
    { pattern: 'tinyurl', alias: ['tiny'], name: 'TinyURL', endpoint: 'tinyurl' },
    { pattern: 'cleanuri', alias: ['cleanurl', 'clean'], name: 'CleanURI', endpoint: 'cleanuri' },
    { pattern: 'vgd', alias: ['vgdurl'], name: 'v.gd', endpoint: 'vgd' },
    { pattern: 'rebrandly', alias: ['rebrand'], name: 'Rebrandly', endpoint: 'rebrandly' },
    { pattern: 'vurl', alias: ['vurlshort'], name: 'vURL', endpoint: 'vurl' },
    { pattern: 'adfoc', alias: ['adfocus'], name: 'AdFoc.us', endpoint: 'adfoc' },
    { pattern: 'ssur', alias: ['shorte'], name: 'Shorte.st', endpoint: 'ssur' },
];

/**
 * Generic Shortener Handler
 */
async function handleShorten(m, { conn, text }, config) {
    const url = text?.trim();
    if (!url) {
        return m.reply(`❌ *Usage:* .${config.pattern} <url>\n*Example:* .${config.pattern} https://google.com`);
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return m.reply('❌ Invalid URL. Please provide a link starting with http:// or https://');
    }

    await withReaction(conn, m, '🔗', async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/tools/${config.endpoint}`, {
                params: { apikey: API_KEY, url: url },
                timeout: 30000
            });

            if (!res.data?.success || !res.data?.result) throw new Error('API failed to shorten URL');

            const shortUrl = res.data.result;

            const msg = `✨ *Mantra URL Shortener*\n${global.divider}\n📎 *Original:* ${url}\n✂️ *Shortened:* ${shortUrl}\n\n_Powered by ${config.name}_`;

            await sendSimpleButtons(conn, m.chat, msg, [
                {
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: 'Copy Short URL 📋',
                        copy_code: shortUrl
                    })
                }
            ], { footer: global.botName });

        } catch (error) {
            log.error(`Shortening (${config.pattern}) failed`, error);
            throw error;
        }
    });
}

// Register all shorteners
SHORTENERS.forEach(cfg => {
    addCommand({
        pattern: cfg.pattern,
        alias: cfg.alias,
        desc: `Shorten a URL using ${cfg.name}`,
        category: 'tools',
        handler: async (m, context) => handleShorten(m, context, cfg)
    });
});

/**
 * SHORTENER HELP
 */
addCommand({
    pattern: 'shorteners',
    alias: ['shortenhelp', 'urlshort'],
    desc: 'Show all available URL shorteners',
    category: 'tools',
    handler: async (m) => {
        let txt = `🔗 *MANTRA URL SHORTENERS*\n${global.divider}\n\n`;
        SHORTENERS.forEach(cfg => {
            txt += `▪️ *.${cfg.pattern}* (${cfg.name})\n`;
        });
        txt += `\n*Usage:* .<command> <url>\n*Example:* .tinyurl https://google.com`;
        await m.reply(txt);
    }
});

log.info('Shortener plugin loaded');
