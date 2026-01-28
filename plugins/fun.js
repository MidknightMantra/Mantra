import { addCommand } from '../lib/plugins.js';
import axios from 'axios';

// 1. JOKE
addCommand({
    pattern: 'joke',
    desc: 'Get a random joke',
    handler: async (m, { conn }) => {
        try {
            const { data } = await axios.get('https://official-joke-api.appspot.com/random_joke');
            m.reply(`🔮 *Mantra Joke*\n\n❓ ${data.setup}\n\n😂 *${data.punchline}*`);
        } catch (e) {
            m.reply(`${global.emojis.error} No jokes found.`);
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
            m.reply(`🔮 *Mantra Fact*\n\n📜 _${data.text}_`);
        } catch (e) {
            m.reply(`${global.emojis.error} No facts found.`);
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
            m.reply(`🔮 *Mantra Quote*\n\n"_${data.content}_"\n\n~ *${data.author}*`);
        } catch (e) {
            m.reply(`${global.emojis.error} No quotes found.`);
        }
    }
});