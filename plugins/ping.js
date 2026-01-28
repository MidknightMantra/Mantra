import { addCommand } from '../lib/plugins.js';
import { runtime } from '../lib/utils.js';

addCommand({
    pattern: 'ping',
    alias: ['speed', 'p'],
    desc: 'Check bot latency and runtime',
    handler: async (m, { conn }) => {
        try {
            // 1. Capture start time
            const start = new Date().getTime();

            // 2. React to indicate processing
            await conn.sendMessage(m.chat, { react: { text: global.emojis.ping, key: m.key } });

            // 3. Send initial message
            const msg = await conn.sendMessage(m.chat, { text: `${global.emojis.waiting} *Measuring speed...*` }, { quoted: m });

            // 4. Capture end time & Calculate latency
            const end = new Date().getTime();
            const latency = end - start;

            // 5. Edit the message with final stats
            await conn.sendMessage(m.chat, {
                text: `*${global.emojis.ping} Pong!* \n\n⚡ *Speed:* ${latency}ms\n⏳ *Uptime:* ${runtime(process.uptime())}`,
                edit: msg.key
            });

        } catch (e) {
            console.error(e);
            m.reply(`${global.emojis.error} Error calculating ping.`);
        }
    }
});