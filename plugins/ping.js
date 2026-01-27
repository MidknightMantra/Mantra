import { performance } from 'perf_hooks'

export default {
    cmd: 'ping',
    run: async (conn, m, args) => {
        const start = performance.now()
        await m.reply('Pong!!!')
        const end = performance.now()
        await conn.sendMessage(m.chat, { text: `🚀 Latency: ${(end - start).toFixed(2)}ms` }, { quoted: m })
    }
}
