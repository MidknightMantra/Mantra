import { addCommand } from '../lib/plugins.js';
import { runtime } from '../lib/utils.js';
import os from 'os';
import { log } from '../src/utils/logger.js';

addCommand({
    pattern: 'status',
    alias: ['info', 'botstat'],
    desc: 'Check bot system and archive status',
    handler: async (m, { conn }) => {
        const uptime = runtime(process.uptime());
        const usedMemory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const totalMemory = (os.totalmem() / 1024 / 1024).toFixed(2);
        const freeMemory = (os.freemem() / 1024 / 1024).toFixed(2);

        let statusText = `🔮 *MANTRA SYSTEM STATUS* 🔮\n\n`;
        statusText += `⏳ *Uptime:* ${uptime}\n`;
        statusText += `📟 *RAM Usage:* ${usedMemory} MB / ${totalMemory} MB\n`;
        statusText += `🌐 *Host:* Railway Cloud\n`;
        statusText += `📂 *Saved Archive:* Active ✅\n`;
        statusText += `🛡️ *Protections:* Anti-Delete, Anti-Link, Anti-VV\n`;
        statusText += `\n───────────────────\n`;
        statusText += `💡 *Note:* Deleted messages and ViewOnce media are being forwarded to your *Saved Messages* chat.`;

        await conn.sendMessage(m.chat, {
            text: statusText,
            contextInfo: {
                externalAdReply: {
                    title: "Mantra-MD Core Engine",
                    body: `System Stabilized: ${os.platform()}`,
                    thumbnailUrl: "https://i.imgur.com/6cO45Xw.jpeg",
                    sourceUrl: "https://github.com/",
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m });
    }
});