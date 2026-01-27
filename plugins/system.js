import os from 'os'
import { performance } from 'perf_hooks'

export default {
    cmd: 'system',
    run: async (conn, m, args) => {
        const used = process.memoryUsage()
        const cpus = os.cpus().map(cpu => {
            cpu.total = Object.keys(cpu.times).reduce((last, type) => last + cpu.times[type], 0)
            return cpu
        })
        const cpu = cpus.reduce((last, cpu, _, { length }) => {
            last.total += cpu.total
            last.speed += cpu.speed / length
            last.times.user += cpu.times.user
            last.times.nice += cpu.times.nice
            last.times.sys += cpu.times.sys
            last.times.idle += cpu.times.idle
            last.times.irq += cpu.times.irq
            return last
        }, {
            speed: 0,
            total: 0,
            times: {
                user: 0,
                nice: 0,
                sys: 0,
                idle: 0,
                irq: 0
            }
        })

        let text = `
💻 *Mantra Specs*

🧠 *RAM:* ${(used.rss / 1024 / 1024).toFixed(2)} MB / ${Math.round(os.totalmem() / 1024 / 1024)} MB
🚀 *CPU:* ${cpus[0].model}
⏱️ *Uptime:* ${process.uptime().toFixed(2)}s
🔋 *Speed:* ${cpu.speed} MHz
`.trim()

        await m.reply(text)
    }
}
