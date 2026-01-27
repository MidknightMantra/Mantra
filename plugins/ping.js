import { performance } from 'perf_hooks'

export default {
    cmd: 'ping',
    run: async (conn, m, args) => {
        const start = performance.now()
        
        // Use m.reply which we defined in smsg (lib/simple.js)
        await m.reply('Mantra is Active! 🚀')
        
        const end = performance.now()
        const latency = (end - start).toFixed(2)
        
        await conn.sendMessage(m.chat, { 
            text: `📍 *Latency:* ${latency}ms` 
        }, { quoted: m })
    }
}
