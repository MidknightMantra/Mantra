import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import { validateText } from '../src/utils/validator.js';
import { apiCall } from '../src/utils/apiHelper.js';
import { withTimeout } from '../src/utils/timeout.js';

addCommand({
    pattern: 'google',
    alias: ['g', 'search'],
    category: 'tools',
    handler: async (m, { conn, text }) => {
        try {
            // Input validation
            const query = validateText(text, true);

            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            // API call with retry and timeout
            const data = await withTimeout(
                apiCall(`https://api.guruapi.tech/google?query=${encodeURIComponent(query)}`, { timeout: 10000 }, 3),
                15000,
                'Google search'
            );

            if (!data.results || data.results.length === 0) {
                await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
                return m.reply(UI.error('No Results', `No results found for "${query}"`, 'Try different keywords\\nCheck spelling\\nMake query more specific'));
            }

            // Format results
            let msg = `🔮 *MANTRA SEARCH*\n${global.divider}\n`;
            data.results.slice(0, 3).forEach((res, i) => {
                msg += `*${i + 1}. ${res.title}*\n🔗 ${res.link}\n📝 _${res.snippet}_\n\n`;
            });
            msg += `${global.divider}`;

            await m.reply(msg);
            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (error) {
            log.error('Google search failed', error, {
                command: 'google',
                query: text?.substring(0, 50),
                user: m.sender
            });

            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });

            if (error.message.includes('validation')) {
                return m.reply(UI.error('Invalid Input', error.message, 'Provide a search query\\nExample: .google JavaScript tutorial'));
            }

            if (error.message.includes('timed out')) {
                return m.reply(UI.error('Timeout', 'Search took too long', 'Check internet connection\\nTry again later'));
            }

            m.reply(UI.error(
                'Google Search Failed',
                error.message || 'Search failed',
                'Verify search query\\nCheck internet connection\\nAPI may be down'
            ));
        }
    }
});