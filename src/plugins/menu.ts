import { Plugin } from '../types/index.js'
import { config } from '../config/env.js'

const menu: Plugin = {
    name: 'menu',
    triggers: ['menu', 'help', 'list'],
    category: 'system',
    description: 'Show available commands',
    execute: async ({ reply, react }) => {
        const uptime = process.uptime()
        const hours = Math.floor(uptime / 3600)
        const minutes = Math.floor((uptime % 3600) / 60)

        const prefix = config.PREFIX[0]

        let menuText = `
╭━━〔 *MANTRA (TS)* 〕━━┈⊷
┃ 👤 *Owner:* ${config.OWNER_NUMBER}
┃ ⏱️ *Uptime:* ${hours}h ${minutes}m
┃ 🧠 *RAM:* ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB
┃ 🛰️ *Values:*
┃    • Anti-Delete: ${config.ANTI_DELETE ? 'ON' : 'OFF'}
┃    • Anti-ViewOnce: ${config.ANTI_VIEW_ONCE ? 'ON' : 'OFF'}
╰━━━━━━━━━━━━━━┈⊷

✨ *COMMANDS*
❯ ${prefix}ai [query] - _Ask AI_
❯ ${prefix}ping - _Check bot speed_
❯ ${prefix}menu - _Show this list_

💡 *Dev Mode:* running in strict TypeScript
`.trim()

        await reply(menuText)
        await react('📜')
    }
}

export default menu
