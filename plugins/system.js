module.exports = {
    cmd: 'restart',
    run: async (conn, m) => {
        if (!m.key.fromMe) return m.reply('Owner only!')
        await m.reply('Restarting Mantra...')
        process.send('reset') // Triggers index.js to kill and respawn main.js
    }
}
