module.exports = {
    cmd: 'ping',
    run: async (conn, m, args) => {
        const start = new Date().getTime()
        const { key } = await conn.sendMessage(m.chat, { text: 'Pinging...' }, { quoted: m })
        const end = new Date().getTime()
        const ping = end - start
        
        // Edit the message with the speed
        await conn.sendMessage(m.chat, { text: `Pong! 🏓\nSpeed: ${ping}ms`, edit: key })
    }
}
