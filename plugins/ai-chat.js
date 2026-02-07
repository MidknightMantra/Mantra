import { addCommand } from '../lib/plugins.js';
import { UI } from '../src/utils/design.js';
import { log } from '../src/utils/logger.js';
import axios from 'axios';
import pkg from 'gifted-btns';
const { sendButtons } = pkg;

addCommand({
    pattern: 'ai',
    alias: ['gpt', 'chat', '4o', 'mini', 'gifted', 'ask'],
    category: 'ai',
    handler: async (m, { conn, text }) => {
        if (!text) {
            // Show AI options with buttons
            await sendButtons(conn, m.chat, {
                title: '🤖 AI Assistant',
                text: 'Choose an AI model or ask a question directly:\n\nUsage: `.ai <your question>`',
                footer: 'Powered by multiple AI APIs',
                buttons: [
                    { id: 'ai_example_hello', text: '👋 Say Hello' },
                    { id: 'ai_example_joke', text: '😄 Tell a Joke' },
                    { id: 'ai_example_fact', text: '🧠 Random Fact' }
                ]
            });
            return;
        }

        try {
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

            const apis = [
                {
                    name: 'GPT-4',
                    url: `https://api.guruapi.tech/ai/gpt4?text=${encodeURIComponent(text)}`,
                    extract: (d) => d.msg || d.response
                },
                {
                    name: 'Gifted-AI',
                    url: `https://api.giftedtech.co.ke/api/ai/ai?apikey=gifted&q=${encodeURIComponent(text)}`,
                    extract: (d) => d.result
                },
                {
                    name: 'GPT-4o',
                    url: `https://api.giftedtech.co.ke/api/ai/gpt4o?apikey=gifted&q=${encodeURIComponent(text)}`,
                    extract: (d) => d.result
                },
                {
                    name: 'GPT-4o-Mini',
                    url: `https://api.giftedtech.co.ke/api/ai/gpt4o-mini?apikey=gifted&q=${encodeURIComponent(text)}`,
                    extract: (d) => d.result
                }
            ];

            const racers = apis.map(api =>
                axios.get(api.url, { timeout: 10000 })
                    .then(res => {
                        const result = api.extract(res.data);
                        if (!result) throw new Error('Empty payload');
                        return { content: result, source: api.name };
                    })
            );

            const winner = await Promise.any(racers);

            // Send AI response with follow-up buttons
            await sendButtons(conn, m.chat, {
                text: winner.content,
                footer: `Powered by Mantra`,
                buttons: [
                    { id: 'ai_continue', text: '💬 Continue' },
                    { id: 'ai_new', text: '🔄 New Chat' }
                ]
            });

            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        } catch (e) {
            log.error('AI command failed', e, { command: 'ai', query: text?.substring(0, 50), user: m.sender });
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            m.reply(UI.error('AI Error', 'All AI nodes are currently unreachable', 'Try again in a few moments\nCheck your internet connection'));
        }
    }
});

// AI Example Handlers
addCommand({
    pattern: 'ai_example_hello',
    handler: async (m, { conn, args, isOwner, isGroup, groupMetadata, isUserAdmin, isBotAdmin }) => {
        const cmd = (await import('../lib/plugins.js')).commands['ai'];
        if (cmd) await cmd.handler(m, { conn, args, text: 'Hello! How are you today?', isOwner, isGroup, groupMetadata, isUserAdmin, isBotAdmin });
    }
});

addCommand({
    pattern: 'ai_example_joke',
    handler: async (m, { conn, args, isOwner, isGroup, groupMetadata, isUserAdmin, isBotAdmin }) => {
        const cmd = (await import('../lib/plugins.js')).commands['ai'];
        if (cmd) await cmd.handler(m, { conn, args, text: 'Tell me a funny joke', isOwner, isGroup, groupMetadata, isUserAdmin, isBotAdmin });
    }
});

addCommand({
    pattern: 'ai_example_fact',
    handler: async (m, { conn, args, isOwner, isGroup, groupMetadata, isUserAdmin, isBotAdmin }) => {
        const cmd = (await import('../lib/plugins.js')).commands['ai'];
        if (cmd) await cmd.handler(m, { conn, args, text: 'Tell me an interesting fact', isOwner, isGroup, groupMetadata, isUserAdmin, isBotAdmin });
    }
});

addCommand({
    pattern: 'ai_continue',
    handler: async (m, { conn }) => {
        await m.reply('💬 Continue our conversation by using `.ai <your question>`');
    }
});

addCommand({
    pattern: 'ai_new',
    handler: async (m, { conn }) => {
        await sendButtons(conn, m.chat, {
            title: '🔄 New AI Chat Started',
            text: 'What would you like to talk about?',
            footer: 'Use .ai <question> to continue',
            buttons: [
                { id: 'ai_example_hello', text: '👋 Greetings' },
                { id: 'ai_example_joke', text: '😄 Jokes' },
                { id: 'ai_example_fact', text: '🧠 Facts' }
            ]
        });
    }
});