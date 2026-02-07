import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import { validateText } from '../src/utils/validator.js';
import { apiCall } from '../src/utils/apiHelper.js';
import { withTimeout } from '../src/utils/timeout.js';

addCommand({
    pattern: 'newsletter',
    alias: ['channel', 'searchchannel'],
    category: 'tools',
    handler: async (m, { conn, text }) => {
        try {
            // Input validation
            const query = validateText(text, true);

            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // API call with retry and timeout
            const data = await withTimeout(
                apiCall(`https://api.guruapi.tech/wa/channel?query=${encodeURIComponent(query)}`, { timeout: 10000 }, 3),
                15000,
                'Newsletter search'
            );

            if (!data.channels || data.channels.length === 0) {
                await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
                return m.reply(UI.error('No Results', `No channels found for "${query}"`, 'Try different keywords\\nCheck spelling\\nTry broader search terms'));
            }

            // Format results
            let msg = `🔮 *WhatsApp Channels Search* 🔮\n${global.divider}\n`;

            data.channels.slice(0, 5).forEach((ch) => {
                msg += `📺 *Name:* ${ch.name}\n`;
                msg += `👥 *Followers:* ${ch.followers}\n`;
                if (ch.id) msg += `🔗 *Link:* https://whatsapp.com/channel/${ch.id}\n`;
                msg += `──────────────────\n`;
            });

            await conn.sendMessage(m.chat, { text: msg }, { quoted: m });
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (error) {
            log.error('Newsletter search failed', error, { command: 'newsletter', query: text?.substring(0, 50), user: m.sender });

            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });

            if (error.message.includes('validation')) {
                return m.reply(UI.error('Invalid Input', error.message, 'Provide a search query\\nExample: .newsletter tech news'));
            }

            if (error.message.includes('timed out')) {
                return m.reply(UI.error('Timeout', 'Search took too long', 'Check internet connection\\nTry again later'));
            }

            m.reply(UI.error('Channel Search Failed', error.message || 'Search failed', 'Check your search term\\nAPI may be busy\\nTry again in a moment'));
        }
    }
});