import { Plugin, MantraContext } from '../types/index.js'

const ping: Plugin = {
    name: 'ping',
    triggers: ['ping', 'test'],
    category: 'system',
    execute: async (ctx: MantraContext) => {
        await ctx.react('🏓')
        await ctx.reply('Pong! Mantra Refactored is alive 🚀')
    }
}

export default ping
