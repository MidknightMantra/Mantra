import { Plugin } from '../types/index.js'
import { config } from '../config/env.js'

const menu: Plugin = {
    name: 'menu',
    triggers: ['menu', 'help', 'list', 'h'],
    category: 'system',
    description: 'Show available commands',
    execute: async ({ reply, react }) => {
        await react('📜')

        const uptime = process.uptime()
        const hours = Math.floor(uptime / 3600)
        const minutes = Math.floor((uptime % 3600) / 60)

        const prefix = config.PREFIX[0]

        let menuText = `
╭━━〔 *MANTRA TS V1.1* 〕━━┈⊷
┃ 👤 *Owner:* ${config.OWNER_NUMBER}
┃ ⏱️ *Uptime:* ${hours}h ${minutes}m
┃ 🧠 *RAM:* ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB
┃ 🛰️ *Status:* Online 🟢
┃
┃ 🛡️ *Protection*
┃ ├ Anti-Delete: ${config.ANTI_DELETE ? 'Enabled' : 'Disabled'}
┃ └ Anti-ViewOnce: ${config.ANTI_VIEW_ONCE ? 'Enabled' : 'Disabled'}
╰━━━━━━━━━━━━━━━┈⊷

✨ *AVAILABLE COMMANDS* ✨

🛠️ *SYSTEM*
❯ ${prefix}menu - _Show this interface_
❯ ${prefix}ping - _Check bot vitals_

🧠 *AI & TOOLS*
❯ ${prefix}ai [query] - _Smart AI Assistant_
❯ ${prefix}gpt4o [query] - _GPT-4o (Premium)_
❯ ${prefix}gpt4o-mini [query] - _GPT-4o Mini_
❯ ${prefix}wwdgpt [query] - _WWD-GPT Model_

🎨 *MEDIA & FUN*
❯ ${prefix}sticker - _Img/Video to Sticker_
❯ ${prefix}play [query] - _Download YT Music_
❯ ${prefix}video [query] - _Download YT Video_
❯ ${prefix}social [url] - _Download from IG/TT/FB/X_

💡 *Mantra Refactored:* Scalable, Private, Fast.
`.trim()

        await reply(menuText)
    }
}

export default menu
