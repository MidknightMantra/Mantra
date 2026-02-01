import { addCommand } from '../lib/plugins.js';
import { runtime } from '../lib/utils.js';
import pkg from 'gifted-btns';
const { sendButtons } = pkg;

addCommand({
    pattern: 'ping',
    alias: ['speed', 'p'],
    desc: 'Check bot latency and runtime',
    category: 'main',
    handler: async (m, { conn }) => {
        try {
            const start = Date.now();
            await conn.sendMessage(m.chat, { react: { text: '⚡', key: m.key } });
            const latency = Date.now() - start;

            let rating = 'Excellent';
            let emoji = '🟢';
            if (latency > 200) { rating = 'Good'; emoji = '🟡'; }
            if (latency > 500) { rating = 'Slow'; emoji = '🟠'; }
            if (latency > 1000) { rating = 'Critical'; emoji = '🔴'; }

            const response = `⚡ *Performance Report*\n\n` +
                `${emoji} *Latency:* ${latency}ms\n` +
                `🚥 *Status:* ${rating}\n` +
                `⏳ *Uptime:* ${runtime(process.uptime())}`;

            // Send with action buttons
            await sendButtons(conn, m.chat, {
                text: response,
                footer: 'Bot Performance Monitor',
                buttons: [
                    { id: 'ping_refresh', text: '🔄 Refresh' },
                    { id: 'ping_status', text: '📊 Full Status' }
                ]
            });

            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            console.error('Ping Error:', e);
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
        }
    }
});

// Button handlers
addCommand({
    pattern: 'ping_refresh',
    handler: async (m, { conn, args, text, isOwner, isGroup, groupMetadata, isUserAdmin, isBotAdmin }) => {
        // Call ping command directly
        const cmd = (await import('../lib/plugins.js')).commands['ping'];
        if (cmd) await cmd.handler(m, { conn, args, text, isOwner, isGroup, groupMetadata, isUserAdmin, isBotAdmin });
    }
});

addCommand({
    pattern: 'ping_status',
    handler: async (m, { conn }) => {
        const uptime = runtime(process.uptime());
        const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

        const status = `📊 *Detailed System Status*\n\n` +
            `⏱️ *Uptime:* ${uptime}\n` +
            `💾 *Memory:* ${memUsage} MB\n` +
            `🤖 *Platform:* ${process.platform}\n` +
            `📦 *Node:* ${process.version}\n` +
            `🔌 *Connections:* Active`;

        await m.reply(status);
    }
});