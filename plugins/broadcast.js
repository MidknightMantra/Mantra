import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import { validateText } from '../src/utils/validator.js';
import { withTimeout } from '../src/utils/timeout.js';
import { checkRateLimit } from '../lib/ratelimit.js';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

addCommand({
    pattern: 'broadcast',
    alias: ['bc', 'notify'],
    category: 'owner',
    handler: async (m, { conn, text, isOwner }) => {
        if (!isOwner) return m.reply(UI.error('Owner Only', 'This is a bot owner command', 'Only the bot owner can broadcast messages'));

        try {
            // Strict rate limiting: 1 broadcast per hour
            const rateLimit = await checkRateLimit(m.sender, 'broadcast', 1, 3600);
            if (!rateLimit.allowed) {
                const minutes = Math.ceil(rateLimit.resetIn / 60);
                return m.reply(UI.error('Rate Limit', `Broadcast limit reached`, `You can only broadcast once per hour\nWait ${minutes} minutes before next broadcast`));
            }

            // Input validation
            const message = validateText(text, false);

            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // Fetch all groups with timeout
            const groups = await withTimeout(
                conn.groupFetchAllParticipating(),
                10000,
                'Fetching groups'
            );

            const groupIds = Object.keys(groups);

            if (groupIds.length === 0) {
                await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
                return m.reply(UI.error('No Groups', 'Bot is not in any groups', 'Add bot to groups first'));
            }

            let successCount = 0;
            let failCount = 0;
            const broadcastMsg = `🔮 *MANTRA BROADCAST* 🔮\n${global.divider}\n${message}\n\n_${global.botName}_`;

            // Send to groups with rate limiting
            for (let i = 0; i < groupIds.length; i++) {
                try {
                    await withTimeout(
                        conn.sendMessage(groupIds[i], { text: broadcastMsg }),
                        5000,
                        'Sending broadcast'
                    );
                    successCount++;

                    // Rate limiting: 1-3 second delay between messages
                    // More aggressive for larger broadcasts
                    const delay = Math.floor(Math.random() * 2000) + 1000;
                    if (i < groupIds.length - 1) await sleep(delay);

                } catch (error) {
                    failCount++;
                    log.warn(`Broadcast failed for group ${groupIds[i]}`, { error: error.message });
                }
            }

            // Summary
            await m.reply(
                `${global.emojis.success} *Broadcast Complete!*\n${global.divider}\n` +
                `✅ *Sent:* ${successCount}/${groupIds.length} groups\n` +
                (failCount > 0 ? `❌ *Failed:* ${failCount}\n` : '') +
                `\n💡 Broadcasts sent with delay to avoid spam detection`
            );

            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

            log.action('Broadcast completed', 'owner', {
                total: groupIds.length,
                success: successCount,
                failed: failCount
            });

        } catch (error) {
            log.error('Broadcast failed', error, { command: 'broadcast', user: m.sender });

            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });

            if (error.message.includes('validation')) {
                return m.reply(UI.error('Invalid Message', error.message, 'Provide a broadcast message\\nExample: .bc Hello everyone!'));
            }

            if (error.message.includes('timed out')) {
                return m.reply(UI.error('Timeout', 'Operation took too long', 'Check internet connection\\nTry with fewer groups\\nTry again later'));
            }

            m.reply(UI.error(
                'Broadcast Failed',
                error.message || 'Error during broadcast',
                'Check group permissions\\nEnsure bot is in groups\\nTry again in a moment'
            ));
        }
    }
});