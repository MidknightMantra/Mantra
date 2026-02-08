import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import { react } from '../src/utils/messaging.js';
import { fetchBuffer } from '../lib/scraper.js';
import axios from 'axios';

const logoEndpoints = [
    { pattern: "glossysilver", aliases: ["glossy", "silverlogo"], description: "Glossy Silver logo", endpoint: "glossysilver" },
    { pattern: "writetext", aliases: ["textwrite", "baby", "writtentext"], description: "Write Text logo", endpoint: "writetext" },
    { pattern: "blackpinklogo", aliases: ["bplogo", "pinkblack"], description: "Black Pink Logo", endpoint: "blackpinklogo" },
    { pattern: "glitchtext", aliases: ["glitch", "textglitch"], description: "Glitch Text logo", endpoint: "glitchtext" },
    { pattern: "advancedglow", aliases: ["advglow", "glowadvanced"], description: "Advanced Glow logo", endpoint: "advancedglow" },
    { pattern: "typographytext", aliases: ["typography", "typo"], description: "Typography Text logo", endpoint: "typographytext" },
    { pattern: "pixelglitch", aliases: ["pixelg", "glitchpixel"], description: "Pixel Glitch logo", endpoint: "pixelglitch" },
    { pattern: "neonglitch", aliases: ["neong", "glitchneon"], description: "Neon Glitch logo", endpoint: "neonglitch" },
    { pattern: "nigerianflag", aliases: ["ngflag", "nigeria"], description: "Nigerian Flag logo", endpoint: "nigerianflag" },
    { pattern: "americanflag", aliases: ["usflag", "usaflag", "america"], description: "American Flag logo", endpoint: "americanflag" },
    { pattern: "deletingtext", aliases: ["deltext", "textdelete"], description: "Deleting Text logo", endpoint: "deletingtext" },
    { pattern: "blackpinkstyle", aliases: ["bpstyle", "pinkblackstyle"], description: "Blackpink Style logo", endpoint: "blackpinkstyle" },
    { pattern: "glowingtext", aliases: ["glowtxt", "textglow"], description: "Glowing Text logo", endpoint: "glowingtext" },
    { pattern: "underwater", aliases: ["underw", "waterlogo"], description: "Under Water logo", endpoint: "underwater" },
    { pattern: "logomaker", aliases: ["makelogo", "logomake"], description: "Logo Maker", endpoint: "logomaker" },
    { pattern: "cartoonstyle", aliases: ["cartoon", "toonlogo"], description: "Cartoon Style logo", endpoint: "cartoonstyle" },
    { pattern: "papercut", aliases: ["cutpaper", "papercutlogo"], description: "Paper Cut logo", endpoint: "papercut" },
    { pattern: "effectclouds", aliases: ["cloudeffect", "clouds"], description: "Effect Clouds logo", endpoint: "effectclouds" },
    { pattern: "gradienttext", aliases: ["gradient", "textgradient"], description: "Gradient Text logo", endpoint: "gradienttext" },
    { pattern: "summerbeach", aliases: ["beachsummer", "beach"], description: "Summer Beach logo", endpoint: "summerbeach" },
    { pattern: "sandsummer", aliases: ["summersand", "sand", "sandlogo"], description: "Sand Summer logo", endpoint: "sandsummer" },
    { pattern: "luxurygold", aliases: ["goldluxury", "luxgold"], description: "Luxury Gold logo", endpoint: "luxurygold" },
    { pattern: "galaxy", aliases: ["galaxylogo", "space"], description: "Galaxy logo", endpoint: "galaxy" },
    { pattern: "logo1917", aliases: ["1917", "1917logo"], description: "1917 Style logo", endpoint: "1917" },
    { pattern: "makingneon", aliases: ["neonmake", "neonlogo"], description: "Making Neon logo", endpoint: "makingneon" },
    { pattern: "texteffect", aliases: ["effecttext", "fxtext"], description: "Text Effect logo", endpoint: "texteffect" },
    { pattern: "galaxystyle", aliases: ["stylegalaxy", "galstyle"], description: "Galaxy Style logo", endpoint: "galaxystyle" },
    { pattern: "lighteffect", aliases: ["effectlight", "lightlogo"], description: "Light Effect logo", endpoint: "lighteffect" },
];

logoEndpoints.forEach((config) => {
    addCommand({
        pattern: config.pattern,
        alias: config.aliases,
        category: 'logo',
        react: '🎨',
        desc: `Create a ${config.description}`,
        handler: async (m, { conn, text, pushName }) => {
            const query = text || m.quoted?.body;
            if (!query) return m.reply(`${global.emojis.warning} Please provide text for the logo.\n\nExample: .${config.pattern} ${pushName || 'Mantra'}`);

            try {
                await react(conn, m, '⏳');

                const GIFTED_API = global.giftedTechApi || 'https://api.giftedtech.my.id';
                const API_KEY = global.giftedApiKey || 'gifted';

                const apiUrl = `${GIFTED_API}/api/ephoto360/${config.endpoint}?apikey=${API_KEY}&text=${encodeURIComponent(query)}`;
                const { data } = await axios.get(apiUrl, { timeout: 60000 });

                if (!data || !data.success || !data.result?.image_url) {
                    throw new Error(data?.message || 'API returned invalid response');
                }

                const buffer = await fetchBuffer(data.result.image_url);
                if (!buffer) throw new Error('Failed to download generated image');

                await conn.sendMessage(m.chat, {
                    image: buffer,
                    caption: `✨ *${config.description.toUpperCase()}*\n\n📝 *Text:* ${query}\n\n> ${global.botCaption}`
                }, { quoted: m });

                await react(conn, m, '✅');
            } catch (e) {
                log.error(`Logo creation failed [${config.pattern}]`, e);
                m.reply(UI.error('Logo Error', `Failed to generate ${config.pattern} logo`, e.message));
                await react(conn, m, '❌');
            }
        }
    });
});

/**
 * LOGO LIST COMMAND
 */
addCommand({
    pattern: 'logolist',
    alias: ['logos', 'logomenu', 'logohelp'],
    category: 'logo',
    react: '🎨',
    desc: 'View all available logo making styles',
    handler: async (m, { conn }) => {
        let msg = `🎨 *${global.botName.toUpperCase()} LOGO MAKER*\n${global.divider}\n\n`;
        logoEndpoints.forEach((l, i) => {
            msg += `*${(i + 1).toString().padStart(2, '0')}.* \`.${l.pattern}\` - ${l.description}\n`;
        });
        msg += `\n${global.divider}\n📝 *Usage:* .command <text>\nExample: \`.glossysilver Mantra\``;

        await conn.sendMessage(m.chat, { text: msg }, { quoted: m });
        await react(conn, m, '✅');
    }
});

log.action('Logo Maker plugin loaded', 'system', { count: logoEndpoints.length });
