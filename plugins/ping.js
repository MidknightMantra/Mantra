import { addCommand } from '../lib/plugins.js';
import { UI, Format } from '../src/utils/design.js';
import { runtime } from '../lib/utils.js';
import os from 'os';

addCommand({
    pattern: 'ping',
    alias: ['speed', 'p'],
    desc: 'Check bot speed and status',
    category: 'main',
    handler: async (m, { conn }) => {
        const start = Date.now();

        // Send loading reaction
        await conn.sendMessage(m.chat, {
            react: { text: '⏳', key: m.key }
        });

        const latency = Date.now() - start;
        const uptime = runtime(process.uptime());
        const memUsage = process.memoryUsage();
        const memUsed = Format.bytes(memUsage.heapUsed);
        const totalMem = Format.bytes(os.totalmem());

        const statusMsg = UI.card('MANTRA',
            `${UI.stats({
                'Latency': `${latency}ms`,
                'Uptime': uptime,
            })}
            
            Powered by Mantra`
        );

        await m.reply(statusMsg);

        // Success reaction
        await conn.sendMessage(m.chat, {
            react: { text: '✅', key: m.key }
        });
    }
});