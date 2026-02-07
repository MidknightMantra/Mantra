import { addCommand } from '../lib/plugins.js';
import axios from 'axios';
import { log } from '../src/utils/logger.js';
import { UI } from '../src/utils/design.js';

// 1. JOKE
addCommand({
    pattern: 'joke',
    desc: 'Get a random joke',
    handler: async (m, { conn }) => {
        try {
            const { data } = await axios.get('https://official-joke-api.appspot.com/random_joke');
            m.reply(`✧ *Mantra Humour* ✧\n${global.divider}\n✦ ${data.setup}\n\n😂 *${data.punchline}*`);
        } catch (e) {
            log.error('Joke API failed', e, { command: 'joke', user: m.sender });
            m.reply(UI.error('Joke Failed', e.message, 'API temporarily unavailable\nTry again later'));
        }
    }
});

// 2. FACT
addCommand({
    pattern: 'fact',
    desc: 'Get a random fact',
    handler: async (m, { conn }) => {
        try {
            const { data } = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en');
            m.reply(`✧ *Obscure Truth* ✧\n${global.divider}\n✦ _${data.text}_`);
        } catch (e) {
            log.error('Fact API failed', e, { command: 'fact', user: m.sender });
            m.reply(UI.error('Fact Failed', e.message, 'API temporarily unavailable\nTry again later'));
        }
    }
});

// 3. QUOTE
addCommand({
    pattern: 'quote',
    desc: 'Get a random quote',
    handler: async (m, { conn }) => {
        try {
            const { data } = await axios.get('https://api.quotable.io/random');
            m.reply(`✧ *Echoes of Wisdom* ✧\n${global.divider}\n"_${data.content}_"\n\n~ *${data.author}*`);
        } catch (e) {
            log.error('Quote API failed', e, { command: 'quote', user: m.sender });
            m.reply(UI.error('Quote Failed', e.message, 'API temporarily unavailable\nTry again later'));
        }
    }
});