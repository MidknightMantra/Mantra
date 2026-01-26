module.exports = {
    cmd: 'ping',
    run: async (conn, m, args) => {
        const start = new Date().getTime()
        await m.reply('Pong!')
        const end = new Date().getTime()
        await m.reply(`Response Time: ${end - start}ms`)
    }
}
