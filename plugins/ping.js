module.exports = {
    cmd: 'ping',
    run: async (conn, m, args) => {
        try {
            const start = Date.now()
            
            // 1. Send a reaction to measure round-trip speed
            await conn.sendMessage(m.chat, { react: { text: '⚡', key: m.key } })
            
            const end = Date.now()
            const latency = end - start

            // 2. Reply with the speed
            await m.reply(`*MANTRA* ⚡\n📶 Latency: *${latency}ms*`)
            
        } catch (e) {
            console.error(e)
        }
    }
}
