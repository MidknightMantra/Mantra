import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';
import axios from 'axios';
import { generateWAMessageContent, generateWAMessageFromContent } from 'gifted-baileys';

// Constants
const SPORTS_API_BASE = "https://apiskeith.top";
const LEAGUE_CONFIG = {
    1: { name: "Premier League", code: "epl", emoji: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", color: "#3d195b" },
    2: { name: "Bundesliga", code: "bundesliga", emoji: "🇩🇪", color: "#d20515" },
    3: { name: "La Liga", code: "laliga", emoji: "🇪🇸", color: "#ee8707" },
    4: { name: "Ligue 1", code: "ligue1", emoji: "🇫🇷", color: "#091c3e" },
    5: { name: "Serie A", code: "seriea", emoji: "🇮🇹", color: "#008c45" },
    6: { name: "UEFA Champions League", code: "ucl", emoji: "🏆", color: "#0a1128" },
    7: { name: "FIFA International", code: "fifa", emoji: "🌍", color: "#326295" },
    8: { name: "UEFA Euro", code: "euros", emoji: "🇪🇺", color: "#003399" },
};

// Helper: Context Info
async function getContextInfo() {
    return {
        mentionedJid: [],
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: '120363403054496228@newsletter', // Default or from config
            newsletterName: global.botName || 'Mantra-MD',
            serverMessageId: -1,
        },
    };
}

// Helper: Format Menu
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

/**
 * Surebet / Betting Tips
 */
addCommand({
    pattern: 'surebet',
    alias: ['bettips', 'odds', 'predict'],
    react: '🎲',
    category: 'sports',
    desc: 'Get betting tips and odds',
    handler: async (m, { conn }) => {
        await m.react('⏳');
        try {
            const { data } = await axios.get(`${SPORTS_API_BASE}/bet`, { timeout: 15000 });

            if (!data?.status || !data?.result?.length) {
                return m.reply("❌ No betting tips available right now.");
            }

            let txt = `╭━━━━━━━━━━━╮\n│ 🎲 *BETTING TIPS*\n├━━━━━━━━━━━┤\n│ 📊 *Today's Picks*\n╰━━━━━━━━━━━╯\n\n`;

            data.result.forEach((match, i) => {
                txt += `┏━ *Match ${i + 1}* ━┓\n`;
                txt += `┃ ⚽ *${match.match}*\n`;
                txt += `┃ 🏆 ${match.league}\n`;
                txt += `┃ 🕐 ${match.time}\n`;
                txt += `┣━━━━━━━━━┫\n`;

                if (match.predictions?.fulltime) {
                    txt += `┃ 📈 *FT Odds:*\n┃ 🏠 ${match.predictions.fulltime.home}%\n┃ 🤝 ${match.predictions.fulltime.draw}%\n┃ ✈️ ${match.predictions.fulltime.away}%\n`;
                }
                if (match.predictions?.over_2_5) txt += `┃ ⚽ *O2.5:* ✅${match.predictions.over_2_5.yes}%\n`;
                if (match.predictions?.bothTeamToScore) txt += `┃ 🎯 *BTTS:* ${match.predictions.bothTeamToScore.yes}%\n`;
                if (match.predictions?.value_bets) txt += `┃ 💰 ${match.predictions.value_bets}\n`;
                txt += `┗━━━━━━━━━┛\n\n`;
            });

            txt += `_⚠️ Bet responsibly._`;

            await conn.sendMessage(m.chat, { text: txt, contextInfo: await getContextInfo() }, { quoted: m });
            await m.react('✅');

        } catch (e) {
            log.error('Surebet error', e);
            m.reply(`❌ Failed: ${e.message}`);
        }
    }
});

/**
 * Live Score
 */
addCommand({
    pattern: 'livescore',
    alias: ['live', 'score'],
    react: '⚽',
    category: 'sports',
    desc: 'Get live/finished/upcoming matches',
    handler: async (m, { conn }) => {
        const caption = `╭━━━━━━━━━━━╮\n│ ⚽ *SCORES*\n├━━━━━━━━━━━┤\n│ _Reply with number_\n├━━━━━━━━━━━┤\n│ 1. 🔴 Live\n│ 2. ✅ Finished\n│ 3. ⏰ Upcoming\n╰━━━━━━━━━━━╯`;

        const sent = await conn.sendMessage(m.chat, { text: caption, contextInfo: await getContextInfo() }, { quoted: m });
        const messageId = sent.key.id;

        const handler = async (update) => {
            const msg = update.messages?.[0];
            if (!msg || !msg.message) return;
            if (msg.key.remoteJid !== m.chat) return; // Wrong chat

            const isReply = msg.message.extendedTextMessage?.contextInfo?.stanzaId === messageId;
            if (!isReply) return;

            const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
            const choice = text.trim();

            const optionMap = {
                1: { name: "Live", emoji: "🔴", filter: "live" },
                2: { name: "Finished", emoji: "✅", filter: "finished" },
                3: { name: "Upcoming", emoji: "⏰", filter: "upcoming" },
            };

            const selected = optionMap[choice];
            if (!selected) return conn.sendMessage(m.chat, { text: "❌ Invalid option (1-3)", contextInfo: await getContextInfo() }, { quoted: msg });

            try {
                // Remove listener to prevent duplicates if user spams (simple approach) or keep open for continuous?
                // For now, let's keep it open for 2 mins as per original logic.

                await conn.sendMessage(m.chat, { react: { text: selected.emoji, key: msg.key } });

                const res = await axios.get(`${SPORTS_API_BASE}/livescore`, { timeout: 15000 });
                if (!res.data.status || !res.data.result?.games) throw new Error('No data');

                const games = Object.values(res.data.result.games);
                // Simple filter logic
                const filtered = games.filter(g => {
                    const st = g.R?.st || "";
                    if (choice === '1') return ["1T", "2T", "HT"].includes(st);
                    if (choice === '2') return ["FT", "Pen"].includes(st);
                    if (choice === '3') return ["", "Pst", "Canc"].includes(st);
                    return false;
                });

                if (filtered.length === 0) {
                    return conn.sendMessage(m.chat, { text: `_No ${selected.name} matches found._` }, { quoted: msg });
                }

                let out = `╭━━━━━━━━━━━╮\n│ ${selected.emoji} *${selected.name}*\n╰━━━━━━━━━━━╯\n\n`;
                filtered.slice(0, 20).forEach(g => {
                    const score = g.R?.r1 !== undefined ? `${g.R.r1}-${g.R.r2}` : 'vs';
                    out += `${selected.emoji} *${g.p1}* ${score} *${g.p2}*\n   🕒 ${g.tm || g.dt}\n\n`;
                });

                await conn.sendMessage(m.chat, { text: out, contextInfo: await getContextInfo() }, { quoted: msg });

                conn.ev.off('messages.upsert', handler); // Close after successful response
            } catch (e) {
                conn.sendMessage(m.chat, { text: `❌ Error: ${e.message}` }, { quoted: msg });
            }
        };

        conn.ev.on('messages.upsert', handler);
        setTimeout(() => conn.ev.off('messages.upsert', handler), 120000);
    }
});

/**
 * Football News
 */
addCommand({
    pattern: 'sportnews',
    alias: ['footballnews'],
    react: '📰',
    category: 'sports',
    desc: 'Latest football news',
    handler: async (m, { conn }) => {
        await m.react('⏳');
        try {
            const res = await axios.get(`${SPORTS_API_BASE}/football/news`, { timeout: 15000 });
            const items = res.data?.result?.data?.items?.slice(0, 8);

            if (!items) return m.reply("❌ No news available.");

            const cards = await Promise.all(items.map(async (item) => ({
                header: {
                    title: `📰 ${item.title}`,
                    hasMediaAttachment: true,
                    imageMessage: (await generateWAMessageContent({ image: { url: item.cover?.url } }, { upload: conn.waUploadToServer })).imageMessage,
                },
                body: { text: item.summary || "Read more..." },
                footer: { text: new Date(Number(item.createdAt)).toLocaleDateString() },
                nativeFlowMessage: {
                    buttons: [{ name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "🔗 Read More", url: "https://keithsite.vercel.app/sports" }) }]
                }
            })));

            const msg = generateWAMessageFromContent(m.chat, {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                        interactiveMessage: {
                            body: { text: `⚽ *LATEST NEWS*` },
                            footer: { text: global.botName },
                            carouselMessage: { cards },
                            contextInfo: await getContextInfo(),
                        }
                    }
                }
            }, { quoted: m });

            await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
            await m.react('✅');

        } catch (e) {
            log.error('News error', e);
            m.reply(`❌ Failed: ${e.message}`);
        }
    }
});

/**
 * Top Scorers (Interactive)
 */
addCommand({
    pattern: 'topscorers',
    alias: ['scorers', 'goldenboot'],
    react: '⚽',
    category: 'sports',
    desc: 'View top scorers',
    handler: async (m, { conn }) => {
        const menu = formatLeagueMenu("TOP SCORERS", "⚽");
        const sent = await conn.sendMessage(m.chat, { text: menu, contextInfo: await getContextInfo() }, { quoted: m });

        const handler = async (update) => {
            const msg = update.messages?.[0];
            if (!msg || !msg.message || msg.key.remoteJid !== m.chat) return;
            if (msg.message.extendedTextMessage?.contextInfo?.stanzaId !== sent.key.id) return;

            const choice = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();
            const league = LEAGUE_CONFIG[choice];
            if (!league) return;

            await conn.sendMessage(m.chat, { react: { text: "⚽", key: msg.key } });

            try {
                const { data } = await axios.get(`${SPORTS_API_BASE}/${league.code}/scorers`, { timeout: 15000 });
                if (!data.status) throw new Error('Failed');

                let out = `╭━━━━━━━━━━━╮\n│ ${league.emoji} *${league.name}*\n│ ⚽ *TOP SCORERS*\n╰━━━━━━━━━━━╯\n\n`;
                data.result.topScorers.slice(0, 15).forEach(s => {
                    const rank = s.rank <= 3 ? ['🥇', '🥈', '🥉'][s.rank - 1] : '▪️';
                    out += `${rank} *${s.player}* (${s.team})\n   ⚽ ${s.goals} Goals\n`;
                });

                await conn.sendMessage(m.chat, { text: out, contextInfo: await getContextInfo() }, { quoted: msg });
                conn.ev.off('messages.upsert', handler);
            } catch (e) {
                conn.sendMessage(m.chat, { text: "❌ Fetch failed." }, { quoted: msg });
            }
        };
        conn.ev.on('messages.upsert', handler);
        setTimeout(() => conn.ev.off('messages.upsert', handler), 60000);
    }
});

/**
 * Standings (Interactive)
 */
addCommand({
    pattern: 'standings',
    alias: ['table', 'league'],
    react: '📊',
    category: 'sports',
    desc: 'View league table',
    handler: async (m, { conn }) => {
        const menu = formatLeagueMenu("LEAGUE TABLE", "📊");
        const sent = await conn.sendMessage(m.chat, { text: menu, contextInfo: await getContextInfo() }, { quoted: m });

        const handler = async (update) => {
            const msg = update.messages?.[0];
            if (!msg || !msg.message || msg.key.remoteJid !== m.chat) return;
            if (msg.message.extendedTextMessage?.contextInfo?.stanzaId !== sent.key.id) return;

            const choice = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();
            const league = LEAGUE_CONFIG[choice];
            if (!league) return;

            await conn.sendMessage(m.chat, { react: { text: "📊", key: msg.key } });

            try {
                const { data } = await axios.get(`${SPORTS_API_BASE}/${league.code}/standings`, { timeout: 15000 });

                let out = `╭━━━━━━━━━━━╮\n│ ${league.emoji} *${league.name}*\n│ 📊 *STANDINGS*\n╰━━━━━━━━━━━╯\n\n`;
                data.result.standings.forEach(t => {
                    let zone = t.position <= 4 ? "🏆" : t.position >= 18 ? "🔴" : "⚪";
                    out += `${zone} ${t.position}. *${t.team}*\n   Played: ${t.played} | Pts: ${t.points}\n`;
                });

                await conn.sendMessage(m.chat, { text: out, contextInfo: await getContextInfo() }, { quoted: msg });
                conn.ev.off('messages.upsert', handler);
            } catch (e) {
                conn.sendMessage(m.chat, { text: "❌ Fetch failed." }, { quoted: msg });
            }
        };
        conn.ev.on('messages.upsert', handler);
        setTimeout(() => conn.ev.off('messages.upsert', handler), 60000);
    }
});
