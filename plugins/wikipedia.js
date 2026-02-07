import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import { apiCall } from '../src/utils/apiHelper.js';
import { validateText } from '../src/utils/validator.js';
import { withTimeout } from '../src/utils/timeout.js';
import axios from 'axios';

addCommand({
    pattern: 'wiki',
    alias: ['wikipedia', 'search'],
    desc: 'Search Wikipedia',
    category: 'info',
    handler: async (m, { text }) => {
        try {
            // Input validation
            const query = validateText(text, true); // Use short text (500 chars max)

            await m.reply(global.messages.wait);

            // API call with retry and timeout
            const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`;

            const data = await withTimeout(
                apiCall(searchUrl, { timeout: 10000 }, 3),
                15000,
                'Wikipedia search'
            );

            if (data.type === 'disambiguation') {
                return m.reply(UI.error(
                    'Multiple Results',
                    `"${query}" has multiple meanings`,
                    'Be more specific\\nTry a different query'
                ));
            }

            const response = `${UI.box(data.title)}\n\n${data.extract}\n\n${UI.footer(`📖 ${data.content_urls.desktop.page}`)}`;
            await m.reply(response);

        } catch (error) {
            // Error is handled by centralized middleware
            log.error('Wikipedia search failed', error, { query: text, command: 'wiki' });

            if (error.message.includes('validation')) {
                return m.reply(UI.error('Invalid Input', error.message, 'Provide a search term\\nExample: .wiki JavaScript'));
            }

            if (error.response?.status === 404) {
                return m.reply(UI.error('Not Found', `No results for "${text}"`, 'Try a different search term\\nCheck spelling'));
            }

            throw error; // Let global error handler catch it
        }
    }
});