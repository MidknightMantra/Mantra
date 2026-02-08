import { addCommand, commands } from '../lib/plugins.js';
import { formatBytes, runtime } from '../src/utils/converter.js'; // Check if these exist, if not define locally. 
// Actually converter.js usually has media stuff. I'll define helpers locally to be safe.
import os from 'os';
import axios from 'axios';
import moment from 'moment-timezone';
import pkgButtons from 'gifted-btns';
const { sendButtons } = pkgButtons;

// Helpers
const monospace = (str) => '```' + str + '```';
const formatUptime = (seconds) => {
    seconds = Number(seconds);
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    const s = Math.floor(seconds % 60);
    return `${d > 0 ? d + 'd ' : ''}${h > 0 ? h + 'h ' : ''}${m > 0 ? m + 'm ' : ''}${s > 0 ? s + 's' : ''}`;
};
const getRAM = () => {
    const total = os.totalmem();
    const free = os.freemem();
    return `${(free / 1024 / 1024 / 1024).toFixed(2)}GB / ${(total / 1024 / 1024 / 1024).toFixed(2)}GB`;
};

// PING
addCommand({
    pattern: 'ping',
    alias: ['speed', 'p'],
    react: '⚡',
    category: 'general',
    desc: 'Check bot speed',
    handler: async (m, { conn }) => {
        const start = performance.now();
        await m.react('⚡');
        const end = performance.now();
        const lat = (end - start).toFixed(2);

        await sendButtons(conn, m.chat, {
            title: 'Bot Speed',
            text: `⚡ Pong: ${lat}ms`,
            footer: `> ${global.botName || 'Mantra Bot'}`,
            buttons: [
                { id: `${global.prefix || '.'}uptime`, text: '⏱️ Uptime' },
                { id: `${global.prefix || '.'}menu`, text: '📜 Menu' }
            ]
        });
    }
});

// UPTIME
addCommand({
    pattern: 'uptime',
    alias: ['up'],
    react: '⏳',
    category: 'general',
    desc: 'Check bot uptime',
    handler: async (m, { conn }) => {
        const up = formatUptime(process.uptime());
        await sendButtons(conn, m.chat, {
            title: 'Bot Uptime',
            text: `⏱️ Uptime: ${up}`,
            footer: `> ${global.botName || 'Mantra Bot'}`,
            buttons: [
                { id: `${global.prefix || '.'}ping`, text: '⚡ Ping' },
                { id: `${global.prefix || '.'}menu`, text: '📜 Menu' }
            ]
        });
    }
});

// REPO
addCommand({
    pattern: 'repo',
    alias: ['sc', 'script'],
    react: '💜',
    category: 'general',
    desc: 'Get bot source code',
    handler: async (m, { conn }) => {
        const repoUrl = global.githubRepo || 'MidknightMantra/Mantra';
        try {
            const { data } = await axios.get(`https://api.github.com/repos/${repoUrl}`);
            const text = `*${data.name}*\n\n` +
                `⭐ Stars: ${data.stargazers_count}\n` +
                `🍴 Forks: ${data.forks_count}\n` +
                `📅 Updated: ${new Date(data.updated_at).toLocaleDateString()}\n\n` +
                `> ${data.description || 'No description'}`;

            await sendButtons(conn, m.chat, {
                title: 'Repository',
                text: text,
                footer: `> ${global.botName || 'Mantra Bot'}`,
                buttons: [
                    { name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: "Visit Repo", url: data.html_url }) }
                ]
            });
        } catch (e) {
            m.reply(`❌ Failed to fetch repo info.`);
        }
    }
});

// REPORT
addCommand({
    pattern: 'report',
    alias: ['bug', 'request'],
    react: '🐞',
    category: 'general',
    desc: 'Report a bug or request feature',
    handler: async (m, { text, conn }) => {
        if (!text) return m.reply(`❌ Please describe the issue/feature.`);

        const devNum = global.owner?.[0] || '254799916673'; // Fallback to provided dev num
        const report = `📝 *REPORT/REQUEST*\n\n👤 User: @${m.sender.split('@')[0]}\n💬 Msg: ${text}`;

        await conn.sendMessage(devNum + '@s.whatsapp.net', { text: report, mentions: [m.sender] });
        m.reply(`✅ Report sent to developer.`);
    }
});

// MAIN MENU
addCommand({
    pattern: 'menu',
    alias: ['help', 'usage'],
    react: '📜',
    category: 'general',
    desc: 'Show all commands',
    handler: async (m, { conn, isOwner }) => {
        const cmdList = Object.values(commands).filter(c => c.pattern && !c.dontAddCommandList);
        const categories = {};

        cmdList.forEach(c => {
            const cat = c.category || 'misc';
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(c);
        });

        const time = moment().tz(global.timeZone || 'Africa/Nairobi').format('HH:mm:ss');
        const date = moment().tz(global.timeZone || 'Africa/Nairobi').format('DD/MM/YYYY');

        let menu = `╭══〘 *${global.botName || 'Mantra'}* 〙══⊷\n`;
        menu += `┃ 👤 User: ${m.pushName || 'User'}\n`;
        menu += `┃ 🤖 Mode: ${global.botMode || 'Public'}\n`;
        menu += `┃ 🧩 Plugins: ${cmdList.length}\n`;
        menu += `┃ 📅 Date: ${date}\n`;
        menu += `┃ ⌚ Time: ${time}\n`;
        menu += `┃ 💾 RAM: ${getRAM()}\n`;
        menu += `┃ ⏳ Uptime: ${formatUptime(process.uptime())}\n`;
        menu += `╰═════════════════⊷\n\n`;

        const sortedCats = Object.keys(categories).sort();

        for (const cat of sortedCats) {
            menu += `╭━━❮ *${cat.toUpperCase()}* ❯━━⊷\n`;
            categories[cat].sort((a, b) => a.pattern.localeCompare(b.pattern));
            categories[cat].forEach(c => {
                menu += `┃ 🔹 ${global.prefix}${c.pattern}\n`;
            });
            menu += `╰━━━━━━━━━━━━━━━⊷\n`;
        }

        const botPic = global.botPic || await conn.profilePictureUrl(conn.user.id, 'image').catch(() => null);

        if (botPic) {
            await conn.sendMessage(m.chat, { image: { url: botPic }, caption: menu }, { quoted: m });
        } else {
            await conn.sendMessage(m.chat, { text: menu }, { quoted: m });
        }
    }
});

// LIST (Simple list)
addCommand({
    pattern: 'list',
    react: '📋',
    category: 'general',
    desc: 'List all commands simple view',
    handler: async (m, { conn }) => {
        let text = `📋 *COMMAND LIST*\n\n`;
        Object.values(commands).forEach((c, i) => {
            if (c.pattern) text += `${i + 1}. ${global.prefix}${c.pattern} - ${c.desc || ''}\n`;
        });
        m.reply(text);
    }
});
