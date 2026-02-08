import { addCommand } from '../lib/plugins.js';
import axios from 'axios';

// Logo configurations
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

/**
 * Dynamically register logo commands
 */
logoEndpoints.forEach(config => {
    addCommand({
        pattern: config.pattern,
        alias: config.aliases, // My addCommand uses 'alias' (singular key, array value) usually, but checking implementation it likely supports both or singular
        react: '🎨',
        category: 'logo',
        desc: config.description,
        handler: async (m, { text, conn }) => {
            if (!text) return m.reply(`🎨 *${config.description}*\n\nUsage: .${config.pattern} <text>`);

            try {
                m.react('⏳');

                // Use global config for API
                const apiUrl = global.giftedApiUrl || 'https://api.giftedtech.my.id';
                const apiKey = global.giftedApiKey || 'gifted';

                // Construct URL
                const targetUrl = `${apiUrl}/api/ephoto360/${config.endpoint}?apikey=${apiKey}&text=${encodeURIComponent(text)}`;

                const response = await axios.get(targetUrl, { responseType: 'arraybuffer' });

                await conn.sendMessage(m.chat, {
                    image: response.data,
                    caption: `✨ *${config.description}*\n\n📝 *Text:* ${text}\n\n> ${global.botName || 'Mantra Bot'}`
                }, { quoted: m });

                m.react('✅');
            } catch (e) {
                console.error(e);
                m.reply(`❌ Failed to generate logo.`);
                m.react('❌');
            }
        }
    });
});

/**
 * List all logo commands
 */
addCommand({
    pattern: 'logolist',
    alias: ['logos', 'logomenu'],
    react: '📜',
    category: 'logo',
    desc: 'Show all logo commands',
    handler: async (m, { conn }) => {
        let text = `🎨 *LOGO MAKER MENU*\n\n`;
        logoEndpoints.forEach((l, i) => {
            text += `*${i + 1}.* .${l.pattern} - ${l.description}\n`;
        });
        text += `\n_Usage: .command <text>_`;

        await conn.sendMessage(m.chat, { text }, { quoted: m });
    }
});
