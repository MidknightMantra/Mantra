import { addCommand } from '../lib/plugins.js';
import chalk from 'chalk';

// Helper to sleep/pause
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

addCommand({
    pattern: 'broadcast',
    alias: ['bc', 'notify'],
    desc: 'Send a message to all groups',
    handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply(`${global.emojis.error} Owner only.`);
        if (!text) return m.reply(`${global.emojis.warning} *Usage:* ${global.prefix}bc <message>`);

        try {
            await m.reply(`${global.emojis.waiting} *Starting Broadcast...*`);

            // 1. Fetch all groups the bot is in
            const groups = await conn.groupFetchAllParticipating();
            const groupIds = Object.keys(groups);

            let count = 0;
            const broadcastMsg = `🔮 *MANTRA BROADCAST* 🔮\n\n${text}\n\n_${global.botName}_`;

            // 2. Loop and send with random delay to avoid bans
            for (let jid of groupIds) {
                try {
                    await conn.sendMessage(jid, { text: broadcastMsg });
                    count++;
                    // Sleep between 1-3 seconds
                    await sleep(Math.floor(Math.random() * 2000) + 1000);
                } catch (e) {
                    // Ignore errors (like if kicked from group)
                    console.log(chalk.red(`Failed to broadcast to ${jid}`));
                }
            }

            await m.reply(`${global.emojis.success} *Broadcast Sent!*\n\n👥 *Target:* ${count} Groups`);

        } catch (e) {
            console.error(e);
            m.reply(`${global.emojis.error} Error during broadcast.`);
        }
    }
});