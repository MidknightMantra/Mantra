import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import { validateText } from '../src/utils/validator.js';
import { withTimeout } from '../src/utils/timeout.js';
import { checkRateLimit } from '../lib/ratelimit.js';
import { react, withReaction } from '../src/utils/messaging.js';
import axios from 'axios';

/**
 * Unified AI Query Helper
 * Handles requests, timeouts, and standardized error reporting
 */
async function queryAI(m, conn, endpoint, question, modelName = 'Mantra AI') {
    try {
        // Rate limiting: 10 requests per minute
        const rateLimit = await checkRateLimit(m.sender, 'ai', 10, 60);
        if (!rateLimit.allowed) {
            return m.reply(UI.error('Rate Limit', `Too many AI requests. Wait ${rateLimit.resetIn}s`, `Limit: 10/${60}s\nRemaining: ${rateLimit.remaining}`));
        }

        const questionText = validateText(question);
        if (!questionText) return m.reply(UI.error('No Question', 'Please provide a prompt.'));

        await react(conn, m, '🤖');

        const apiUrl = `${global.giftedApiUrl}/api/ai/${endpoint}?apikey=${global.giftedApiKey}&q=${encodeURIComponent(questionText)}`;

        const response = await withReaction(conn, m, '⏳', async () => {
            const { data } = await withTimeout(
                axios.get(apiUrl, { timeout: 30000 }),
                35000,
                `AI ${modelName}`
            );

            if (!data.success || !data.result) {
                throw new Error('All AI services are currently unavailable or busy.');
            }
            return data.result;
        });

        const reply = `🤖 *${modelName.toUpperCase()}*\n${global.divider}\n\n${response}\n\n${global.divider}`;
        await m.reply(reply);
        await react(conn, m, '✅');

    } catch (error) {
        log.error(`AI ${modelName} failed`, error, { user: m.sender, questionLength: question?.length });
        await react(conn, m, '❌');

        if (error.message.includes('timed out')) {
            return m.reply(UI.error('Timeout', 'AI taking too long to respond.', 'Try a simpler prompt or check connection.'));
        }

        m.reply(UI.error('AI Error', error.message || 'Failed to get AI response.', 'Try a different model or wait a moment.'));
    }
}

/**
 * AI COMMANDS
 */

// Main Multi-Model AI (Default GPT-4o)
addCommand({
    pattern: 'ai',
    alias: ['gpt', 'chat', 'ask', 'mini', 'gifted'],
    category: 'ai',
    desc: 'Chat with GPT-4o (Default)',
    handler: async (m, { conn, text }) => {
        await queryAI(m, conn, 'gpt4o', text || 'Who are you?', 'GPT-4o');
    }
});

// GPT-4
addCommand({
    pattern: 'gpt4',
    alias: ['chatgpt4'],
    category: 'ai',
    desc: 'Chat with GPT-4',
    handler: async (m, { conn, text }) => {
        await queryAI(m, conn, 'gpt4', text, 'GPT-4');
    }
});

// Gemini
addCommand({
    pattern: 'gemini',
    alias: ['googleai'],
    category: 'ai',
    desc: 'Chat with Google Gemini',
    handler: async (m, { conn, text }) => {
        await queryAI(m, conn, 'geminiai', text, 'Gemini');
    }
});

// Gemini Pro
addCommand({
    pattern: 'geminipro',
    category: 'ai',
    desc: 'Chat with Google Gemini Pro',
    handler: async (m, { conn, text }) => {
        await queryAI(m, conn, 'geminiaipro', text, 'Gemini Pro');
    }
});

// DeepSeek R1
addCommand({
    pattern: 'deepseek',
    alias: ['r1', 'reasoning'],
    category: 'ai',
    desc: 'Chat with DeepSeek R1 (Reasoning)',
    handler: async (m, { conn, text }) => {
        await queryAI(m, conn, 'deepseek-r1', text, 'DeepSeek R1');
    }
});

// DeepSeek V3
addCommand({
    pattern: 'deepseekv3',
    category: 'ai',
    desc: 'Chat with DeepSeek V3',
    handler: async (m, { conn, text }) => {
        await queryAI(m, conn, 'deepseek-v3', text, 'DeepSeek V3');
    }
});

// Blackbox AI (Coding)
addCommand({
    pattern: 'blackbox',
    alias: ['codeai'],
    category: 'ai',
    desc: 'Chat with Blackbox (Coding Focused)',
    handler: async (m, { conn, text }) => {
        await queryAI(m, conn, 'blackbox', text, 'Blackbox AI');
    }
});

// Mistral AI
addCommand({
    pattern: 'mistral',
    category: 'ai',
    desc: 'Chat with Mistral AI',
    handler: async (m, { conn, text }) => {
        await queryAI(m, conn, 'mistral', text, 'Mistral AI');
    }
});

// OpenAI (General)
addCommand({
    pattern: 'openai',
    category: 'ai',
    desc: 'Chat with OpenAI General Model',
    handler: async (m, { conn, text }) => {
        await queryAI(m, conn, 'openai', text, 'OpenAI');
    }
});

// LetMeGPT
addCommand({
    pattern: 'letmegpt',
    category: 'ai',
    desc: 'Simple GPT-style chat',
    handler: async (m, { conn, text }) => {
        await queryAI(m, conn, 'letmegpt', text, 'LetMeGPT');
    }
});

// Additional aliases/variants
addCommand({
    pattern: 'gpt4o-mini',
    category: 'ai',
    desc: 'Chat with GPT-4o Mini (Fast)',
    handler: async (m, { conn, text }) => {
        await queryAI(m, conn, 'gpt4o-mini', text, 'GPT-4o Mini');
    }
});