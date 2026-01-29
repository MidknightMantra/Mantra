import { addCommand } from '../lib/plugins.js';
import chalk from 'chalk';

addCommand({
    pattern: 'save',
    alias: ['get', 'download'],
    category: 'tools',
    handler: async (m, { conn }) => {
        try {
            // 1. Check for quoted message
            if (!m.quoted) {
                return m.reply(`${global.emojis.warning} Reply to a Status or Media message.`);
            }

            const q = m.quoted;
            const mime = (q.msg || q).mimetype || '';

            // 2. Validate Media Type
            if (!/image|video|audio|sticker/.test(mime)) {
                return m.reply(`${global.emojis.error} I can only save Images, Videos, Audio, or Stickers.`);
            }

            // 3. Status Reaction (Processing)
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // 4. Destination (Saved Messages)
            const myJid = conn.user.id.split(':')[0] + '@s.whatsapp.net';

            // 5. Archive Logic
            // Using copyNForward is the gold standard—it handles buffers and types internally
            const archiveHeader = `📥 *Status/Media Saved*\n${global.divider}\n✦ *From:* @${q.sender.split('@')[0]}\n✦ *Caption:* ${q.text || 'None'}`;

            await conn.copyNForward(myJid, q, false, {
                caption: archiveHeader,
                mentions: [q.sender]
            });

            // 6. Success Reaction
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
            console.log(chalk.green(`[SAVE] Media archived from ${q.sender}`));

        } catch (e) {
            console.error("Save Error:", e);
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            m.reply(`${global.emojis.error} Failed to archive. Media may have expired.`);
        }
    }
});