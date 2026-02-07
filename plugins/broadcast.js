import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';

// Helper to sleep/pause
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

addCommand({
    pattern: 'broadcast',
    alias: ['bc', 'notify'],
    category: 'owner',
    handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply(`${global.emojis.error} Owner only.`);
        if (!text) return m.reply(`${global.emojis.warning} *Usage:* ${global.prefix}bc <message>`);

        try {
            // 1. Initial Reaction
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // 2. Fetch all groups the bot is in
            const groups = await conn.groupFetchAllParticipating();
            const groupIds = Object.keys(groups);

            let count = 0;
            const broadcastMsg = `🔮 *MANTRA BROADCAST* 🔮\n${global.divider}\n${text}\n\n_${global.botName}_`;

            // 3. Loop and send with random delay to avoid bans
            for (let jid of groupIds) {
                try {
                    await conn.sendMessage(jid, { text: broadcastMsg });
                    count++;
                    // Sleep between 1-3 seconds
                    await sleep(Math.floor(Math.random() * 2000) + 1000);
                } catch (e) {
                    log.perf(`Failed to broadcast to ${jid}`, 0);
                }
            }

            // 4. Success Message
            await m.reply(`${global.emojis.success} *Broadcast Sent!*\n${global.divider}\n👥 *Target:* ${count} Groups`);

            // 5. Success Reaction
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            log.error('Broadcast failed', e, { command: 'broadcast', user: m.sender });
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            m.reply(UI.error('Broadcast Failed', e.message || 'Error during broadcast', 'Check group permissions\nTry again in a moment'));
        }
    }
});