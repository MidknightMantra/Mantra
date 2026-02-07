import { addCommand, commands } from '../lib/plugins.js';
import { UI, Format } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import { sendInteractive, sendSimpleButtons } from '../src/utils/buttons.js';
import { getSystemMetrics } from '../src/utils/performance.js';
import { react, withReaction } from '../src/utils/messaging.js';
import axios from 'axios';
import os from 'os';

/**
 * PING COMMAND
 */
addCommand({
    pattern: 'ping',
    alias: ['pi', 'p'],
    category: 'general',
    desc: 'Check bot response speed',
    handler: async (m, { conn, botPrefix }) => {
        const startTime = Date.now();
        await react(conn, m, '⚡');

        // Randomized slight delay for "natural" feel if requested, otherwise instant
        // await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 200)));

        const latency = Date.now() - startTime;

        await sendSimpleButtons(conn, m.chat, `⚡ *Pong:* ${latency}ms`, [
            { id: `${botPrefix}uptime`, text: '⏱️ Uptime' },
            { id: `${botPrefix}performance`, text: '📊 Stats' }
        ], {
            title: 'Bot Speed',
            footer: `Mantra v${global.botVersion || '1.0.0'}`
        });

        await react(conn, m, '✅');
    }
});

/**
 * UPTIME COMMAND
 */
addCommand({
    pattern: 'uptime',
    alias: ['up'],
    category: 'general',
    desc: 'Check bot uptime status',
    handler: async (m, { conn, botPrefix }) => {
        const metrics = await getSystemMetrics();
        const uptime = Format.time(metrics.uptime);
        const ram = `${metrics.memory.used}MB / ${metrics.memory.total}MB`;

        let msg = `⏱️ *Mantra Uptime Info*\n\n`;
        msg += `✦ *Uptime:* ${uptime}\n`;
        msg += `✦ *Memory:* ${ram}\n`;
        msg += `✦ *RSS:* ${metrics.memory.rss}MB\n`;
        msg += `✦ *Host:* ${os.platform()} (${os.release()})`;

        await sendSimpleButtons(conn, m.chat, msg, [
            { id: `${botPrefix}ping`, text: '⚡ Ping' },
            { id: `${botPrefix}performance`, text: '📊 Performance' }
        ], {
            title: 'System Uptime',
            footer: 'Mantra Engine Status'
        });

        await react(conn, m, '✅');
    }
});

/**
 * REPO COMMAND
 */
addCommand({
    pattern: 'repo',
    alias: ['sc', 'script', 'source'],
    category: 'general',
    desc: 'Fetch bot source code details',
    handler: async (m, { conn, pushname }) => {
        await react(conn, m, '💜');

        try {
            const repoUrl = global.giftedRepo || 'MidknightMantra/Mantra';
            const { data: repo } = await axios.get(`https://api.github.com/repos/${repoUrl}`);

            const msg = `Hello *${pushname}*,\n\n` +
                `This is *${global.botName}*, a powerful WhatsApp bot built for minimalist power and performance.\n\n` +
                `✦ *Repo:* ${repo.name}\n` +
                `✦ *Stars:* ${repo.stargazers_count}\n` +
                `✦ *Forks:* ${repo.forks_count}\n` +
                `✦ *Created:* ${new Date(repo.created_at).toLocaleDateString()}\n` +
                `✦ *Updated:* ${new Date(repo.updated_at).toLocaleDateString()}`;

            await sendInteractive(conn, m.chat, {
                title: '📦 SOURCE CODE',
                text: msg,
                footer: 'Mantra Developer Hub',
                buttons: [
                    {
                        name: 'cta_url',
                        buttonParamsJson: JSON.stringify({
                            display_text: 'Visit Repository',
                            url: `https://github.com/${repoUrl}`
                        })
                    },
                    {
                        name: 'cta_copy',
                        buttonParamsJson: JSON.stringify({
                            display_text: 'Copy Repo URL',
                            copy_code: `https://github.com/${repoUrl}.git`
                        })
                    }
                ]
            });
            await react(conn, m, '✅');
        } catch (error) {
            log.error('Repo command failed', error);
            await m.reply(UI.error('Fetch Failed', 'Could not retrieve repository information.', 'Check your internet connection or try again later.'));
        }
    }
});

/**
 * MENU COMMAND
 */
addCommand({
    pattern: 'menu',
    alias: ['help', 'allmenu', 'h'],
    category: 'general',
    desc: 'Display bot main menu',
    handler: async (m, { conn, botPrefix, pushname }) => {
        await react(conn, m, '🔮');

        const allCmds = Object.values(commands);
        const uniqueCmds = [...new Set(allCmds)];

        // Categorize commands
        const categorized = uniqueCmds.reduce((acc, cmd) => {
            if (cmd.dontAddCommandList) return acc;
            const cat = cmd.category || 'general';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(cmd.pattern);
            return acc;
        }, {});

        const sortedCats = Object.keys(categorized).sort();

        let menuMsg = `🔮 *MANTRA COMMAND CENTER* 🔮\n\n`;
        menuMsg += `*User:* ${pushname}\n`;
        menuMsg += `*Prefix:* \`${botPrefix}\`\n`;
        menuMsg += `*Plugins:* ${uniqueCmds.length}\n`;
        menuMsg += `${UI.DIVIDER.light}\n\n`;

        sortedCats.forEach(cat => {
            menuMsg += `*${cat.toUpperCase()}*\n`;
            menuMsg += categorized[cat].map(p => `▸ \`${p}\``).join(', ');
            menuMsg += `\n\n`;
        });

        menuMsg += `\n> Tip: Type .help <command> for details.`;

        await conn.sendMessage(m.chat, {
            image: { url: global.botPic || 'https://i.imgur.com/6cO45Xw.jpeg' },
            caption: menuMsg,
            footer: 'Minimalist Power • Mantra',
            buttons: [
                {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                        display_text: '⚡ Ping Status',
                        id: `${botPrefix}ping`
                    })
                },
                {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                        display_text: 'WaChannel',
                        url: global.newsletterUrl || 'https://whatsapp.com/channel/0029VaJmO6vD38P8q6Dzp92M'
                    })
                }
            ],
            headerType: 4
        }, { quoted: m });

        await react(conn, m, '✅');
    }
});

/**
 * LIST COMMAND
 */
addCommand({
    pattern: 'list',
    alias: ['listmenu', 'cmdlist'],
    category: 'general',
    desc: 'Show all commands in a structured list',
    handler: async (m, { conn, botPrefix }) => {
        const allCmds = Object.values(commands);
        const uniqueCmds = [...new Set(allCmds)].filter(c => !c.dontAddCommandList);

        let listMsg = `📜 *MANTRA COMMAND LIST*\n${UI.DIVIDER.heavy}\n\n`;

        uniqueCmds.forEach((cmd, i) => {
            listMsg += `*${i + 1}.* \`${botPrefix}${cmd.pattern}\`\n`;
            if (cmd.desc) listMsg += `   ${cmd.desc.slice(0, 50)}\n`;
        });

        await m.reply(listMsg);
        await react(conn, m, '✅');
    }
});
