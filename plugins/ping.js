import { addCommand } from '../lib/plugins.js';
import { runtime } from '../lib/utils.js';

addCommand({
    pattern: 'ping',
    alias: ['speed', 'p'],
    desc: 'Check bot latency and runtime',
    category: 'main',
    handler: async (m, { conn }) => {
        try {
            // 1. Mark start time
            const start = Date.now();

            // 2. Visual Status (Reaction)
            await conn.sendMessage(m.chat, { react: { text: '⚡', key: m.key } });

            // 3. Simple latency calculation
            // We measure how long it took to perform the reaction above
            const latency = Date.now() - start;

            // 4. Performance Rating
            let rating = 'Excellent';
            if (latency > 200) rating = 'Good';
            if (latency > 500) rating = 'Slow';
            if (latency > 1000) rating = 'Critical';

            // 5. Build and Send Final Stats
            const response = `*Pong!* \n\n` +
                `⚡ *Latency:* ${latency}ms\n` +
                `🚥 *Status:* ${rating}\n` +
                `⏳ *Uptime:* ${runtime(process.uptime())}`;

            await m.reply(response);

            // Update reaction to success
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            console.error('Ping Error:', e);
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
        }
    }
});