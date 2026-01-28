import { addCommand } from '../lib/plugins.js';
import { runtime } from '../lib/utils.js';

addCommand({
    pattern: 'ping',
    handler: async (m, { conn }) => {
        const start = new Date().getTime();
        await m.reply('Pong!');
        const end = new Date().getTime();
        await m.reply(`Response Time: ${end - start}ms`);
    }
});

addCommand({
    pattern: 'runtime',
    handler: async (m, { conn }) => {
        await m.reply(`Bot Active For: ${runtime(process.uptime())}`);
    }
});