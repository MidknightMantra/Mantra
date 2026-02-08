import { addCommand } from '../lib/plugins.js';
import axios from 'axios';

/**
 * NEWSLETTER/CHANNEL LINK TO JID CONVERTER
 * Converts WhatsApp channel links to JID format
 */
addCommand({
    pattern: 'newsletter',
    alias: ['channeljid', 'newsjid'],
    category: 'tools',
    desc: 'Convert channel link to JID',
    handler: async (m, { conn, text }) => {
        if (!text) {
            return m.reply(`📢 *NEWSLETTER JID CONVERTER*

*Usage:*
\`${global.prefix}newsletter <channel_link>\`

*Example:*
\`${global.prefix}newsletter https://whatsapp.com/channel/0029VbBs1ph6RGJIhteNql3r\`

This will convert the channel invite link to its JID format (e.g., 120363403054496228@newsletter)`);
        }

        // Extract channel code from link
        const channelMatch = text.match(/whatsapp\.com\/channel\/([A-Za-z0-9]+)/i);

        if (!channelMatch) {
            return m.reply('❌ Invalid WhatsApp channel link.\n\nPlease provide a valid link like:\n`https://whatsapp.com/channel/0029VbBs1ph6RGJIhteNql3r`');
        }

        const inviteCode = channelMatch[1];

        try {
            await m.react('🔄');

            // Try to get channel metadata using the invite code
            // Note: This requires the bot to be able to access channel info
            const jid = await conn.newsletterMetadata('invite', inviteCode).then(meta => meta.id).catch(() => null);

            if (jid) {
                await m.react('✅');
                return m.reply(`📢 *CHANNEL JID*\n\n\`${jid}\`\n\n_Copy this JID to use programmatically_`);
            } else {
                // Fallback: Show the invite code and explain
                await m.react('⚠️');
                return m.reply(`📢 *CHANNEL INFO*

*Invite Code:* \`${inviteCode}\`

⚠️ Unable to retrieve full JID. The bot needs to follow this channel first or the channel may be private.

*To get the JID:*
1. Follow the channel
2. Run this command again`);
            }
        } catch (error) {
            console.error('Newsletter JID error:', error);
            await m.react('❌');
            m.reply(`❌ *Error:* ${error.message}\n\n*Invite Code:* \`${inviteCode}\`\n\nThe channel JID format would typically be:\n\`<channel_id>@newsletter\``);
        }
    }
});
