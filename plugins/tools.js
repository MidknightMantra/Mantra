import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';
import { react, withReaction } from '../src/utils/messaging.js';
import { normalizeUserJid } from '../src/utils/jidHelper.js';
import { UI, Format } from '../src/utils/design.js';
import { runtime } from '../lib/utils.js';
import os from 'os';

/**
 * PING COMMAND
 * Check bot speed and status
 */
addCommand({
    pattern: 'ping',
    alias: ['speed', 'p'],
    desc: 'Check bot speed and status',
    category: 'tools',
    handler: async (m, { conn }) => {
        const start = Date.now();
        await react(conn, m, '⏳');

        const latency = Date.now() - start;
        const uptime = runtime(process.uptime());
        const memUsage = process.memoryUsage();
        const memUsed = Format.bytes(memUsage.heapUsed);
        const totalMem = Format.bytes(os.totalmem());

        const statusMsg = UI.card('MANTRA',
            `${UI.stats({
                'Latency': `${latency}ms`,
                'Uptime': uptime,
            })}\n\nPowered by Mantra`
        );

        await m.reply(statusMsg);
        await react(conn, m, '✅');
    }
});

/**
 * JID COMMAND
 * Get JID of chat or user
 */
addCommand({
    pattern: 'jid',
    alias: ['id', 'getid'],
    desc: 'Get JID of chat or user',
    category: 'tools',
    handler: async (m, { conn }) => {
        let jid = m.chat;

        if (m.quoted) {
            jid = m.quoted.sender;
        } else if (m.mentionedJid && m.mentionedJid.length > 0) {
            jid = m.mentionedJid[0];
        }

        await m.reply(`🔮 *MANTRA ID SYSTEM*\n\n🆔 *JID:* \`${jid}\``);
    }
});

/**
 * ONWA COMMAND
 * Checks if a number is on WhatsApp
 */
addCommand({
    pattern: 'onwa',
    alias: ['onwhatsapp', 'checkwa', 'checknumber'],
    desc: 'Check if a phone number is registered on WhatsApp',
    category: 'tools',
    handler: async (m, { conn, args }) => {
        const query = args.join(' ');

        if (!query) {
            return m.reply(`❌ Please provide a phone number.\n\n*Usage:* .onwa <number>\n*Example:* .onwa 254712345678\n\n_Include country code without + or spaces_`);
        }

        const num = query.replace(/[^0-9]/g, '');

        if (num.length < 7 || num.length > 15) {
            return m.reply(`❌ Invalid phone number format.\n\nPlease provide a valid number with country code.\n*Example:* .onwa 254712345678`);
        }

        await withReaction(conn, m, '⏳', async () => {
            try {
                const [result] = await conn.onWhatsApp(num);

                if (result && result.exists) {
                    return m.reply(`✅ *Number Found on WhatsApp*\n\n📞 *Number:* ${num}\n🆔 *JID:* ${result.jid}\n\n_This number is registered on WhatsApp._`);
                } else {
                    await react(conn, m, '❌');
                    return m.reply(`❌ *Not on WhatsApp*\n\n📞 *Number:* ${num}\n\n_This number is not registered on WhatsApp._`);
                }
            } catch (err) {
                log.error('onWhatsApp check failed', err, { num });
                await react(conn, m, '⚠️');
                return m.reply(`⚠️ Could not verify if ${num} is on WhatsApp.\n\nError: ${err.message}`);
            }
        });
    }
});

log.info('Tools plugin loaded (onwa)');
