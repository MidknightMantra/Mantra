import os from 'node:os'
import { Plugin, MantraContext } from '../types/index.js'

const ping: Plugin = {
    name: 'ping',
    triggers: ['ping', 'test', 'status'],
    category: 'system',
    execute: async (ctx: MantraContext) => {
        const start = Date.now()
        await ctx.react('⚡')

        const uptime = process.uptime()
        const hours = Math.floor(uptime / 3600)
        const minutes = Math.floor((uptime % 3600) / 60)
        const seconds = Math.floor(uptime % 60)

        const end = Date.now()
        const latency = end - start

        const response = `
🚀 *Mantra Status* 🚀

🏓 *Latency:* ${latency}ms
⏱️ *Uptime:* ${hours}h ${minutes}m ${seconds}s
📦 *Node:* ${process.version}
💻 *OS:* ${os.platform()} (${os.release()})
🧠 *RAM:* ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB / ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB
`.trim()

        await ctx.reply(response)
    }
}

export default ping
