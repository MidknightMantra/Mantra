import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import { validateText } from '../src/utils/validator.js';
import { withTimeout, retryWithTimeout } from '../src/utils/timeout.js';
import { checkRateLimit } from '../lib/ratelimit.js';
import axios from 'axios';

addCommand({
    pattern: 'ai',
    alias: ['gpt', 'chat', '4o', 'mini', 'gifted', 'ask'],
    category: 'ai',
    handler: async (m, { conn, text }) => {
        if (!text) {
            return m.reply(UI.error('No Question', 'Ask me anything!', 'Example: .ai What is JavaScript?\\nExample: .ai Tell me a joke\\nExample: .ai Explain quantum physics'));
        }

        try {
            // Rate limiting: 10 requests per minute
            const rateLimit = await checkRateLimit(m.sender, 'ai', 10, 60);
            if (!rateLimit.allowed) {
                return m.reply(UI.error('Rate Limit', `Too many AI requests. Wait ${rateLimit.resetIn}s`, `You can make ${10} requests per minute\nRemaining: ${rateLimit.remaining}\nTry again in ${rateLimit.resetIn} seconds`));
            }

            // Input validation
            const question = validateText(text);

            await conn.sendMessage(m.chat, { react: { text: '🤖', key: m.key } });

            // Multiple AI endpoints with fallback
            const apis = [
                {
                    name: 'GPT-4o',
                    url: `https://api.giftedtech.co.ke/api/ai/gpt4o?apikey=gifted&q=${encodeURIComponent(question)}`,
                    extract: (d) => d.result
                },
                {
                    name: 'Gifted-AI',
                    url: `https://api.giftedtech.co.ke/api/ai/ai?apikey=gifted&q=${encodeURIComponent(question)}`,
                    extract: (d) => d.result
                },
                {
                    name: 'GPT-4',
                    url: `https://api.guruapi.tech/ai/gpt4?text=${encodeURIComponent(question)}`,
                    extract: (d) => d.msg || d.response
                }
            ];

            let response = null;
            let lastError = null;

            // Try each API with timeout
            for (const api of apis) {
                try {
                    const { data } = await withTimeout(
                        axios.get(api.url, { timeout: 15000 }),
                        20000,
                        `AI ${api.name}`
                    );

                    response = api.extract(data);

                    if (response && response.trim()) {
                        log.info('AI response success', { api: api.name, questionLength: question.length });
                        break;
                    }
                } catch (err) {
                    log.warn(`AI API ${api.name} failed`, { error: err.message });
                    lastError = err;
                    continue; // Try next API
                }
            }

            if (!response || !response.trim()) {
                throw lastError || new Error('All AI APIs failed to respond');
            }

            // Format and send response
            const reply = `🤖 *Mantra AI*\n${global.divider}\n\n${response}\n\n${global.divider}`;
            await m.reply(reply);

            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (error) {
            log.error('AI chat failed', error, {
                command: 'ai',
                questionLength: text?.length,
                user: m.sender
            });

            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });

            if (error.message.includes('validation')) {
                return m.reply(UI.error('Invalid Input', error.message, 'Question is too long (max 5000 chars)\\nTry a shorter question'));
            }

            if (error.message.includes('timed out')) {
                return m.reply(UI.error('Timeout', 'AI took too long to respond', 'Try a simpler question\\nTry again later\\nCheck internet connection'));
            }

            m.reply(UI.error(
                'AI Failed',
                'All AI services are currently unavailable',
                'Try again in a few minutes\\nServices may be under maintenance\\nTry a different question'
            ));
        }
    }
});