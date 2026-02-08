import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';
import axios from 'axios';
import {
    setUserEmail,
    getUserEmailWithExpiry,
    deleteUserEmail,
    EXPIRY_MINUTES
} from '../lib/database.js'; // Imported from main database file
import { getConfig } from '../src/config/constants.js';
import { normalizeUserJid } from '../src/utils/jidHelper.js';

const API_URL = global.giftedApiUrl || 'https://api.giftedtech.my.id';
const API_KEY = global.giftedApiKey || '';

/**
 * Extract code from text
 */
function extractCode(text) {
    if (!text) return null;
    const codePatterns = [
        /\b(\d{4,8})\b/,
        /code[:\s]+(\d{4,8})/i,
        /verification[:\s]+(\d{4,8})/i,
        /otp[:\s]+(\d{4,8})/i,
        /pin[:\s]+(\d{4,8})/i,
    ];

    for (const pattern of codePatterns) {
        const match = text.match(pattern);
        if (match) return match[1];
    }
    return null;
}

/**
 * Generate Temp Mail
 */
addCommand({
    pattern: 'tempmail',
    alias: ['tempmailgen', 'generatemail', 'newmail', 'getmail'],
    react: '📧',
    category: 'tempmail',
    desc: 'Generate a new temporary email address',
    handler: async (m, { conn }) => {
        const userJid = normalizeUserJid(m.sender);

        const existingData = await getUserEmailWithExpiry(userJid);
        if (existingData) {
            return m.reply(`⚠️ *ACTIVE EMAIL EXISTS*\n\n📬 *Email:* ${existingData.email}\n⏰ *Expires in:* ${existingData.timeRemaining}\n\nUse *.delmail* first to delete it.\n📥 Use *.tempinbox* to check messages.`);
        }

        await m.react('⏳');

        try {
            const res = await axios.get(`${API_URL}/api/tempmail/generate`, {
                params: { apikey: API_KEY },
                timeout: 30000
            });

            if (!res.data?.success || !res.data?.result?.email) {
                return m.reply('❌ Failed to generate temp email. Try again later.');
            }

            const email = res.data.result.email;
            await setUserEmail(userJid, email);

            await m.reply(`📧 *TEMP MAIL GENERATED*\n\n📬 *Email:* ${email}\n⏰ *Expires in:* ${EXPIRY_MINUTES} minutes\n\n📥 *.tempinbox* Check messages\n📖 *.readmail <number>* Read email\n🗑️ *.delmail* Delete & create new`);
            await m.react('✅');
        } catch (e) {
            log.error('Tempmail generate error', e);
            m.reply(`❌ Failed: ${e.message}`);
        }
    }
});

/**
 * Check Inbox
 */
addCommand({
    pattern: 'tempinbox',
    alias: ['checkinbox', 'inbox', 'myinbox'],
    react: '📥',
    category: 'tempmail',
    desc: 'Check inbox of your generated temp email',
    handler: async (m, { conn }) => {
        const userJid = normalizeUserJid(m.sender);
        const emailData = await getUserEmailWithExpiry(userJid);

        if (!emailData) {
            return m.reply('❌ You don\'t have an active temp email. Use *.tempmail* first.');
        }

        await m.react('⏳');
        const email = emailData.email;

        try {
            const res = await axios.get(`${API_URL}/api/tempmail/inbox`, {
                params: { apikey: API_KEY, email: email },
                timeout: 30000
            });

            // Handle "No Emails" case
            if (!res.data?.success || (res.data?.message && res.data.message.includes('No Emails'))) {
                await m.react('📭');
                return m.reply(`📭 *EMPTY INBOX*\n\n📬 ${email}\n⏰ Expires in: ${emailData.timeRemaining}\n\n_Wait a few seconds after sending an email._`);
            }

            const emails = res.data.result;
            if (!emails || emails.length === 0) {
                await m.react('📭');
                return m.reply(`📭 *EMPTY INBOX*\n\n📬 ${email}`);
            }

            let inboxText = `📥 *TEMP MAIL INBOX*\n\n📬 ${email}\n⏰ Expires in: ${emailData.timeRemaining}\n\n`;

            emails.forEach((mail, index) => {
                inboxText += `━━━━━━━━━━━━━━━━━━\n📩 *#${index + 1}*\n👤 *From:* ${mail.from || mail.sender || 'Unknown'}\n📋 *Subject:* ${mail.subject || 'No Subject'}\n📅 *Date:* ${mail.date || mail.received || ''}\n`;
            });

            inboxText += `\n━━━━━━━━━━━━━━━━━━\n📖 Use *.readmail <number>* to read`;

            await m.reply(inboxText);
            await m.react('✅');

        } catch (e) {
            log.error('Tempmail inbox error', e);
            if (e.message?.includes('expired') || e.response?.status === 404) {
                return m.reply('❌ Your temp email has expired. Generate a new one.');
            }
            m.reply(`❌ Failed: ${e.message}`);
        }
    }
});

/**
 * Read Email
 */
addCommand({
    pattern: 'readmail',
    alias: ['getmsg', 'viewmail'],
    react: '📖',
    category: 'tempmail',
    desc: 'Read a specific email',
    handler: async (m, { text, conn }) => {
        const userJid = normalizeUserJid(m.sender);
        const emailData = await getUserEmailWithExpiry(userJid);

        if (!emailData) return m.reply('❌ No active temp email.');

        const mailNum = parseInt(text);
        if (isNaN(mailNum) || mailNum < 1) return m.reply('❌ Please provide email number (e.g., .readmail 1)');

        await m.react('⏳');
        const email = emailData.email;

        try {
            // Fetch inbox first to get ID
            const inboxRes = await axios.get(`${API_URL}/api/tempmail/inbox`, {
                params: { apikey: API_KEY, email: email },
                timeout: 30000
            });

            if (!inboxRes.data?.success || !inboxRes.data?.result) {
                return m.reply('❌ Failed to fetch inbox or empty.');
            }

            const emails = inboxRes.data.result;
            if (mailNum > emails.length) {
                return m.reply(`❌ You only have ${emails.length} emails.`);
            }

            const targetMail = emails[mailNum - 1];
            const messageId = targetMail.id || targetMail.mail_id || targetMail.messageId; // Try different ID keys

            // Try to fetch full message if ID exists
            let body = targetMail.body || targetMail.text || targetMail.content || '';

            if (messageId) {
                try {
                    const msgRes = await axios.get(`${API_URL}/api/tempmail/message`, {
                        params: { apikey: API_KEY, email: email, message_id: messageId }
                    });
                    if (msgRes.data?.success && msgRes.data?.result) {
                        const fullMail = msgRes.data.result;
                        body = fullMail.textBody || fullMail.body || fullMail.content || body;
                    }
                } catch (e) { /* Ignore detail fetch error, use summary */ }
            }

            // Cleanup body
            let cleanBody = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
            if (!cleanBody) cleanBody = '(No text content)';

            const code = extractCode(cleanBody);

            let messageText = `📧 *EMAIL #${mailNum}*\n\n👤 *From:* ${targetMail.from}\n📋 *Subject:* ${targetMail.subject}\n\n━━━━━━━━━━━━━━━━━━\n\n${cleanBody}\n\n━━━━━━━━━━━━━━━━━━`;

            if (code) {
                messageText += `\n\n🔐 *Code Found:* ${code}`;
            }

            await m.reply(messageText);
            await m.react('✅');

        } catch (e) {
            log.error('Readmail error', e);
            m.reply(`❌ Failed: ${e.message}`);
        }
    }
});

/**
 * Delete Email
 */
addCommand({
    pattern: 'delmail',
    alias: ['deletemail', 'cleartempmail'],
    react: '🗑️',
    category: 'tempmail',
    desc: 'Delete your temp email',
    handler: async (m, { conn }) => {
        const userJid = normalizeUserJid(m.sender);
        const emailData = await getUserEmailWithExpiry(userJid);

        if (!emailData) return m.reply('❌ No active temp email.');

        await deleteUserEmail(userJid);
        await m.reply(`✅ Temp email *${emailData.email}* deleted.`);
        await m.react('✅');
    }
});
