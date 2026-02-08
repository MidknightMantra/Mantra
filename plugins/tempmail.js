import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';
import { react, withReaction } from '../src/utils/messaging.js';
import { normalizeUserJid, getUserName } from '../src/utils/jidHelper.js';
import { setUserEmail, getUserEmailWithExpiry, deleteUserEmail, EXPIRY_MINUTES } from '../lib/database.js';
import { sendSimpleButtons } from '../src/utils/buttons.js';
import axios from 'axios';

// API Configuration
const API_BASE = global.giftedApiUrl || 'https://api.giftedtech.my.id';
const API_KEY = global.giftedApiKey || '';

/**
 * OTP Extraction Logic
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
 * GENERATE TEMP EMAIL
 */
addCommand({
    pattern: 'tempmail',
    alias: ['getmail', 'newmail', 'tempmailgen'],
    desc: 'Generate a new temporary email address',
    category: 'tools',
    handler: async (m, { conn }) => {
        const userJid = normalizeUserJid(m.sender);
        const name = getUserName(m.sender);

        const existing = await getUserEmailWithExpiry(userJid);
        if (existing) {
            await react(conn, m, '⚠️');
            const msg = `⚠️ *Active Email Exists*\n\nHey @${name}, you already have an active temp email:\n\n📬 *Email:* ${existing.email}\n⏰ *Expires in:* ${existing.timeRemaining}\n\nUse *.delmail* first to delete it if you want a new one.`;

            await conn.sendMessage(m.chat, { text: msg, mentions: [m.sender] }, { quoted: m });
            return await sendSimpleButtons(conn, m.chat, '📋 Copy your email:', [
                {
                    name: 'cta_copy',
                    buttonParamsJson: JSON.stringify({
                        display_text: 'Copy Email 📋',
                        copy_code: existing.email
                    })
                }
            ], { footer: global.botName });
        }

        await withReaction(conn, m, '📧', async () => {
            try {
                const res = await axios.get(`${API_BASE}/api/tempmail/generate`, { params: { apikey: API_KEY } });
                if (!res.data?.success || !res.data?.result?.email) throw new Error('API failed to generate email');

                const email = res.data.result.email;
                await setUserEmail(userJid, email);

                const msg = `📧 *Temp Mail Generated*\n\nHey @${name}, your temporary email:\n\n📬 *Email:* ${email}\n\n⏰ *Expires in:* ${EXPIRY_MINUTES} minutes\n📥 Use *.tempinbox* to check messages\n📖 Use *.readmail <number>* to read specific email\n🗑️ Use *.delmail* to delete\n\n_Copy the email below and use it for verification_`;

                await conn.sendMessage(m.chat, { text: msg, mentions: [m.sender] }, { quoted: m });
                await sendSimpleButtons(conn, m.chat, '📋 Copy your email:', [
                    {
                        name: 'cta_copy',
                        buttonParamsJson: JSON.stringify({
                            display_text: 'Copy Email 📋',
                            copy_code: email
                        })
                    }
                ], { footer: global.botName });

            } catch (error) {
                log.error('Tempmail generation failed', error);
                throw error;
            }
        });
    }
});

/**
 * CHECK INBOX
 */
addCommand({
    pattern: 'tempinbox',
    alias: ['inbox', 'checkmail'],
    desc: 'Check inbox of your temp email',
    category: 'tools',
    handler: async (m, { conn }) => {
        const userJid = normalizeUserJid(m.sender);
        const name = getUserName(m.sender);

        const emailData = await getUserEmailWithExpiry(userJid);
        if (!emailData) return m.reply(`❌ Hey @${name}, you don't have an active temp email. Use *.tempmail* first.`);

        await withReaction(conn, m, '📥', async () => {
            try {
                const res = await axios.get(`${API_BASE}/api/tempmail/inbox`, {
                    params: { apikey: API_KEY, email: emailData.email }
                });

                if (!res.data?.success || !res.data?.result?.length) {
                    return m.reply(`📭 *Empty Inbox*\n\nHey @${name}, no emails received yet.\n\n📬 *Email:* ${emailData.email}\n⏰ *Expires in:* ${emailData.timeRemaining}`);
                }

                const emails = res.data.result;
                let txt = `📥 *Temp Mail Inbox*\n\nHey @${name}, you have *${emails.length}* email(s)\n\n📬 *Email:* ${emailData.email}\n⏰ *Expires in:* ${emailData.timeRemaining}\n\n`;

                emails.forEach((mail, i) => {
                    const from = mail.from || mail.sender || 'Unknown';
                    const sub = mail.subject || 'No Subject';
                    txt += `${global.divider}\n📩 *#${i + 1}*\n👤 *From:* ${from}\n📋 *Sub:* ${sub}\n`;
                });

                txt += `${global.divider}\n\n📖 Use *.readmail <number>* to read`;
                await m.reply(txt);

            } catch (error) {
                log.error('Tempmail inbox check failed', error);
                throw error;
            }
        });
    }
});

/**
 * READ MAIL
 */
addCommand({
    pattern: 'readmail',
    alias: ['viewmail'],
    desc: 'Read a specific email from your inbox',
    category: 'tools',
    handler: async (m, { conn, text }) => {
        const userJid = normalizeUserJid(m.sender);
        const name = getUserName(m.sender);

        const emailData = await getUserEmailWithExpiry(userJid);
        if (!emailData) return m.reply(`❌ No active temp email found.`);

        const mailNum = parseInt(text?.trim());
        if (isNaN(mailNum) || mailNum < 1) return m.reply(`❌ Usage: .readmail <number>\nExample: .readmail 1`);

        await withReaction(conn, m, '📖', async () => {
            try {
                // 1. Get inbox to find message ID
                const inboxRes = await axios.get(`${API_BASE}/api/tempmail/inbox`, {
                    params: { apikey: API_KEY, email: emailData.email }
                });

                if (!inboxRes.data?.success || !inboxRes.data?.result) throw new Error('Failed to fetch inbox');
                const emails = inboxRes.data.result;

                if (mailNum > emails.length) return m.reply(`❌ You only have ${emails.length} email(s).`);

                const target = emails[mailNum - 1];
                const messageId = target.id || target.mail_id || target.message_id || target.messageId;

                // 2. Fetch full message
                let body = target.body || target.text || '';
                if (messageId) {
                    const msgRes = await axios.get(`${API_BASE}/api/tempmail/message`, {
                        params: { apikey: API_KEY, email: emailData.email, message_id: messageId }
                    });
                    if (msgRes.data?.success && msgRes.data?.result) {
                        const full = msgRes.data.result;
                        body = full.body || full.text || full.content || body;
                    }
                }

                const cleanBody = body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || '(No text content)';
                const otpCode = extractCode(cleanBody);

                let txt = `📧 *Email #${mailNum}*\n\n👤 *From:* ${target.from || 'Unknown'}\n📋 *Sub:* ${target.subject || 'No Subject'}\n\n${global.divider}\n📝 *Message:*\n\n${cleanBody}\n${global.divider}`;

                await m.reply(txt);

                if (otpCode) {
                    await sendSimpleButtons(conn, m.chat, `🔐 *OTP Found:* ${otpCode}`, [
                        {
                            name: 'cta_copy',
                            buttonParamsJson: JSON.stringify({
                                display_text: 'Copy OTP 📋',
                                copy_code: otpCode
                            })
                        }
                    ], { footer: global.botName });
                }

            } catch (error) {
                log.error('Read mail failed', error);
                throw error;
            }
        });
    }
});

/**
 * DELETE EMAIL
 */
addCommand({
    pattern: 'delmail',
    alias: ['deletemail'],
    desc: 'Delete your current temp email',
    category: 'tools',
    handler: async (m, { conn }) => {
        const userJid = normalizeUserJid(m.sender);
        const name = getUserName(m.sender);

        const emailData = await getUserEmailWithExpiry(userJid);
        if (!emailData) return m.reply(`❌ No active temp email to delete.`);

        await deleteUserEmail(userJid);
        await react(conn, m, '✅');
        await m.reply(`✅ *Email Deleted*\n\nYour temp email *${emailData.email}* has been removed.\nUse *.tempmail* to generate a new one.`);
    }
});

log.action('TempMail plugin loaded', 'system');
