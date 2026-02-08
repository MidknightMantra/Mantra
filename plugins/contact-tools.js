import { addCommand } from '../lib/plugins.js';
import { normalizeUserJid } from '../src/utils/jidHelper.js';

/**
 * Check if a number is registered on WhatsApp
 */
addCommand({
    pattern: 'onwa',
    alias: ['onwhatsapp', 'checkwa', 'checknumber'],
    react: '🔍',
    category: 'tools',
    desc: 'Check if a phone number is registered on WhatsApp',
    handler: async (m, { conn, text }) => {
        if (!text) {
            return m.reply(`❌ Please provide a phone number.\n\n*Usage:* .onwa <number>\n*Example:* .onwa 254712345678\n\n_Include country code without + or spaces_`);
        }

        const num = text.replace(/[^0-9]/g, '');

        if (num.length < 7 || num.length > 15) {
            return m.reply(`❌ Invalid phone number format.\n\nPlease provide a valid number with country code.\n*Example:* .onwa 254712345678`);
        }

        await m.react('⏳');

        try {
            const [result] = await conn.onWhatsApp(num + '@s.whatsapp.net');

            if (result && result.exists) {
                await m.react('✅');
                return m.reply(`✅ *Number Found on WhatsApp*\n\n📞 *Number:* ${num}\n🆔 *JID:* ${result.jid}\n\n_This number is registered on WhatsApp._`);
            } else {
                await m.react('❌');
                return m.reply(`❌ *Not on WhatsApp*\n\n📞 *Number:* ${num}\n\n_This number is not registered on WhatsApp._`);
            }
        } catch (err) {
            await m.react('⚠️');
            return m.reply(`⚠️ Could not verify if ${num} is on WhatsApp.\n\nError: ${err.message}`);
        }
    }
});

/**
 * Export group contacts as VCF
 */
addCommand({
    pattern: 'vcf',
    alias: ['contacts', 'savecontact', 'scontact'],
    react: '📇',
    category: 'group',
    desc: 'Export all group participants as VCF contact file',
    handler: async (m, { conn, isGroup, groupMetadata }) => {
        if (!isGroup) return m.reply('❌ This command can only be used in groups.');

        await m.react('⏳');

        try {
            const participants = groupMetadata?.participants || [];
            const groupName = groupMetadata?.subject || 'Group';

            if (participants.length === 0) {
                return m.reply('❌ No participants found in this group.');
            }

            let vcfContent = '';
            let index = 1;

            for (const member of participants) {
                const jid = member.id || member.jid;
                if (!jid) continue;

                // Ensure clean phone number
                const phoneNumber = jid.split('@')[0];
                const displayName = `MEMBER ${index++}`;

                vcfContent += `BEGIN:VCARD\nVERSION:3.0\nFN:${displayName}\nTEL;type=CELL;type=VOICE;waid=${phoneNumber}:+${phoneNumber}\nEND:VCARD\n`;
            }

            const count = index - 1;

            if (count === 0) {
                return m.reply('❌ Could not extract any valid contacts from this group.');
            }

            const fileName = `${groupName.replace(/[^a-zA-Z0-9]/g, '_')}_contacts.vcf`;

            await conn.sendMessage(
                m.chat,
                {
                    document: Buffer.from(vcfContent, 'utf-8'),
                    mimetype: 'text/vcard',
                    fileName: fileName,
                    caption: `✅ *Contacts Exported*\n\n📁 *Group:* ${groupName}\n👥 *Count:* ${count} contacts`
                },
                { quoted: m }
            );

            await m.react('✅');

        } catch (err) {
            await m.react('❌');
            return m.reply(`❌ Failed to export contacts: ${err.message}`);
        }
    }
});
