import os from 'node:os' // Fixed import for ESM
import { performance } from 'perf_hooks'

export default {
    cmd: 'system',
    run: async (conn, m, args) => {
        const used = process.memoryUsage()
        
        // Calculate uptime in a readable format
        const uptime = process.uptime()
        const hours = Math.floor(uptime / 3600)
        const minutes = Math.floor((uptime % 3600) / 60)
        const seconds = Math.floor(uptime % 60)

        const cpus = os.cpus()
        const cpuModel = cpus[0] ? cpus[0].model : 'Unknown'

        let text = `
💻 *Mantra System Status*

🧠 *RAM Usage:* ${(used.rss / 1024 / 1024).toFixed(2)} MB
📊 *Total RAM:* ${Math.round(os.totalmem() / 1024 / 1024)} MB
🚀 *CPU Model:* ${cpuModel}
⚙️ *Cores:* ${cpus.length}
⏱️ *Uptime:* ${hours}h ${minutes}m ${seconds}s
🛰️ *Platform:* ${os.platform()} (${os.release()})
`.trim()

        await m.reply(text)
    }
}
