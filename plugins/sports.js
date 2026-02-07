import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';
import { react, withReaction } from '../src/utils/messaging.js';
import { getSetting } from '../lib/database.js';
import axios from 'axios';
import pkg from 'gifted-baileys';
const { generateWAMessageContent, generateWAMessageFromContent } = pkg;

const SPORTS_API_BASE = "https://apiskeith.top";

const LEAGUE_CONFIG = {
    1: { name: "Premier League", code: "epl", emoji: "🏴", color: "#3d195b" },
    2: { name: "Bundesliga", code: "bundesliga", emoji: "🇩🇪", color: "#d20515" },
    3: { name: "La Liga", code: "laliga", emoji: "🇪🇸", color: "#ee8707" },
    4: { name: "Ligue 1", code: "ligue1", emoji: "🇫🇷", color: "#091c3e" },
    5: { name: "Serie A", code: "seriea", emoji: "🇮🇹", color: "#008c45" },
    6: { name: "UEFA Champions League", code: "ucl", emoji: "🏆", color: "#0a1128" },
    7: { name: "FIFA International", code: "fifa", emoji: "🌍", color: "#326295" },
    8: { name: "UEFA Euro", code: "euros", emoji: "🇪🇺", color: "#003399" },
};

/**
 * Standard Context Info for Sports Messages
 */
async function getSportsContext() {
    const channelJid = await getSetting('NEWSLETTER_JID') || "120363403054496228@newsletter";
    return {
        mentionedJid: [],
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: channelJid,
            newsletterName: global.botName,
            serverMessageId: -1,
        },
    };
}

/**
 * Menu Formatter
 */
function formatLeagueMenu(title, emoji) {
    let menu = `╭━━━━━━━━━━━╮\n`;
    menu += `│ ${emoji} *${title}*\n`;
    menu += `├━━━━━━━━━━━┤\n`;
    menu += `│ _Reply with number_\n`;
    menu += `├━━━━━━━━━━━┤\n`;
    Object.entries(LEAGUE_CONFIG).forEach(([num, cfg]) => {
        menu += `│ ${num}. ${cfg.emoji} ${cfg.name}\n`;
    });
    menu += `╰━━━━━━━━━━━╯`;
    return menu;
}

// --- BETTING COMMAND ---
addCommand({
    pattern: 'surebet',
    alias: ['bettips', 'odds', 'predict'],
    desc: 'Get betting tips and odds predictions',
    category: 'sports',
    handler: async (m, { conn }) => {
        await withReaction(conn, m, '🎲', async () => {
            try {
                const { data } = await axios.get(`${SPORTS_API_BASE}/bet`, { timeout: 15000 });
                if (!data?.status || !data?.result?.length) throw new Error('No tips available');

                let txt = `🎲 *MANTRA BETTING TIPS*\n${global.divider}\n`;
                data.result.slice(0, 10).forEach((match, i) => {
                    txt += `📍 *${match.match}*\n🏆 ${match.league}\n📈 FT: H:${match.predictions?.fulltime?.home}% | D:${match.predictions?.fulltime?.draw}% | A:${match.predictions?.fulltime?.away}%\n\n`;
                });

                txt += `_⚠️ Bet responsibly. Tips are provided for information only._`;
                await conn.sendMessage(m.chat, { text: txt, contextInfo: await getSportsContext() }, { quoted: m });
            } catch (err) {
                log.error('Surebet failed', err);
                throw err;
            }
        });
    }
});

// --- LIVESCORE COMMAND ---
addCommand({
    pattern: 'livescore',
    alias: ['live', 'score'],
    desc: 'Get live, finished, or upcoming football matches',
    category: 'sports',
    handler: async (m, { conn }) => {
        const caption = `╭━━━━━━━━━━━╮\n│ ⚽ *MANTRA SCORES*\n├━━━━━━━━━━━┤\n│ _Reply with number_\n├━━━━━━━━━━━┤\n│ 1. 🔴 Live\n│ 2. ✅ Finished\n│ 3. ⏰ Upcoming\n╰━━━━━━━━━━━╯`;

        const sent = await conn.sendMessage(m.chat, { text: caption, contextInfo: await getSportsContext() }, { quoted: m });
        const messageId = sent.key.id;

        const handler = async (update) => {
            const msg = update.messages[0];
            if (!msg.message || msg.key.fromMe) return;

            const responseText = msg.message.conversation || msg.message.extendedTextMessage?.text;
            const isReply = msg.message.extendedTextMessage?.contextInfo?.stanzaId === messageId;

            if (!isReply || msg.key.remoteJid !== m.chat) return;

            const choice = responseText?.trim();
            const optionMap = {
                1: { name: 'Live', emoji: '🔴', filter: ['1T', '2T', 'HT'] },
                2: { name: 'Finished', emoji: '✅', filter: ['FT', 'Pen'] },
                3: { name: 'Upcoming', emoji: '⏰', filter: ['', 'Pst', 'Canc'] },
            };

            if (!optionMap[choice]) return;
            const selected = optionMap[choice];

            try {
                await react(conn, msg, selected.emoji);
                const { data } = await axios.get(`${SPORTS_API_BASE}/livescore`, { timeout: 15000 });
                if (!data.status || !data.result?.games) throw new Error('No data');

                const games = Object.values(data.result.games);
                const filtered = games.filter(g => selected.filter.includes(g.R?.st));

                if (filtered.length === 0) return m.reply(`_No ${selected.name} matches found._`);

                let output = `⚽ *MANTRA ${selected.name.toUpperCase()}*\n${global.divider}\n\n`;
                filtered.slice(0, 15).forEach(game => {
                    const score = game.R?.r1 !== undefined ? `${game.R.r1} - ${game.R.r2}` : 'vs';
                    output += `🏟️ *${game.p1}* ${score} *${game.p2}*\n🕒 ${game.tm || ''} (${game.R?.st || 'ST'})\n\n`;
                });

                await conn.sendMessage(m.chat, { text: output, contextInfo: await getSportsContext() }, { quoted: msg });
                conn.ev.off('messages.upsert', handler);
            } catch (err) {
                log.error('Livescore update failed', err);
            }
        };

        conn.ev.on('messages.upsert', handler);
        setTimeout(() => conn.ev.off('messages.upsert', handler), 60000);
    }
});

// --- SPORT NEWS ---
addCommand({
    pattern: 'sportnews',
    alias: ['footballnews'],
    desc: 'Get latest football news',
    category: 'sports',
    handler: async (m, { conn }) => {
        await withReaction(conn, m, '📰', async () => {
            try {
                const { data } = await axios.get(`${SPORTS_API_BASE}/football/news`, { timeout: 15000 });
                const items = data?.result?.data?.items;
                if (!Array.isArray(items) || items.length === 0) throw new Error('No news found');

                const news = items.slice(0, 5);
                const cards = await Promise.all(news.map(async item => ({
                    header: {
                        title: item.title,
                        hasMediaAttachment: true,
                        imageMessage: (await generateWAMessageContent({ image: { url: item.cover?.url } }, { upload: conn.waUploadToServer })).imageMessage,
                    },
                    body: { text: item.summary || 'Click below to read the full story.' },
                    footer: { text: 'Mantra Sports News' },
                    nativeFlowMessage: {
                        buttons: [{ name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text: 'Read More 🔗', url: item.url || 'https://keithsite.vercel.app/sports' }) }]
                    }
                })));

                const message = generateWAMessageFromContent(m.chat, {
                    viewOnceMessage: {
                        message: {
                            interactiveMessage: {
                                body: { text: `⚽ *MANTRA SPORTS NEWS*` },
                                carouselMessage: { cards },
                                contextInfo: await getSportsContext(),
                            }
                        }
                    }
                }, { quoted: m });

                await conn.relayMessage(m.chat, message.message, { messageId: message.key.id });
            } catch (err) {
                log.error('SportNews failed', err);
                throw err;
            }
        });
    }
});

// --- LEAGUE TOOLS (STRECH GOAL: REUSABLE HANDLER) ---
async function handleLeagueCommand(m, conn, type) {
    const titleMap = { scorers: 'TOP SCORERS', standings: 'LEAGUE STANDINGS', fixtures: 'UPCOMING FIXTURES' };
    const emojiMap = { scorers: '⚽', standings: '📊', fixtures: '📅' };

    const caption = formatLeagueMenu(titleMap[type], emojiMap[type]);
    const sent = await conn.sendMessage(m.chat, { text: caption, contextInfo: await getSportsContext() }, { quoted: m });
    const messageId = sent.key.id;

    const handler = async (update) => {
        const msg = update.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const responseText = msg.message.conversation || msg.message.extendedTextMessage?.text;
        const isReply = msg.message.extendedTextMessage?.contextInfo?.stanzaId === messageId;

        if (!isReply || msg.key.remoteJid !== m.chat) return;

        const choice = responseText?.trim();
        const league = LEAGUE_CONFIG[choice];
        if (!league) return;

        try {
            await react(conn, msg, emojiMap[type]);
            const endpoint = type === 'fixtures' ? 'upcomingmatches' : type;
            const { data } = await axios.get(`${SPORTS_API_BASE}/${league.code}/${endpoint}`, { timeout: 15000 });
            if (!data.status) throw new Error('Data failed');

            let output = `${emojiMap[type]} *${league.name} ${titleMap[type]}*\n${global.divider}\n\n`;

            if (type === 'scorers') {
                data.result.topScorers.slice(0, 10).forEach(s => {
                    output += `▪️ *${s.rank}. ${s.player}* (${s.team})\n   ⚽ ${s.goals} goals | 🎯 ${s.assists} assists\n\n`;
                });
            } else if (type === 'standings') {
                data.result.standings.slice(0, 20).forEach(t => {
                    output += `${t.position}. *${t.team}*\n   P:${t.played} | W:${t.won} | Pts:${t.points}\n\n`;
                });
            } else if (type === 'fixtures') {
                data.result.upcomingMatches.slice(0, 10).forEach(f => {
                    output += `📅 *MD ${f.matchday}*: ${f.homeTeam} vs ${f.awayTeam}\n   ⏰ ${f.date}\n\n`;
                });
            }

            await conn.sendMessage(m.chat, { text: output, contextInfo: await getSportsContext() }, { quoted: msg });
            conn.ev.off('messages.upsert', handler);
        } catch (err) {
            log.error(`League ${type} failed`, err);
        }
    };

    conn.ev.on('messages.upsert', handler);
    setTimeout(() => conn.ev.off('messages.upsert', handler), 60000);
}

addCommand({ pattern: 'topscorers', alias: ['scorers'], desc: 'View top goal scorers', category: 'sports', handler: async (m, { conn }) => handleLeagueCommand(m, conn, 'scorers') });
addCommand({ pattern: 'standings', alias: ['table'], desc: 'View current league standings', category: 'sports', handler: async (m, { conn }) => handleLeagueCommand(m, conn, 'standings') });
addCommand({ pattern: 'fixtures', alias: ['upcomingmatches'], desc: 'View upcoming matches', category: 'sports', handler: async (m, { conn }) => handleLeagueCommand(m, conn, 'fixtures') });

log.info('Sports plugin loaded');
