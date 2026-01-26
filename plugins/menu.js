const fs = require('fs')
const path = require('path')

module.exports = {
    cmd: 'menu',
    run: async (conn, m, args) => {
        const pluginFolder = path.join(__dirname, '../plugins')
        let commands = []

        // Read all files in plugins folder
        fs.readdirSync(pluginFolder).forEach(file => {
            if (file.endsWith('.js')) {
                const plugin = require(path.join(pluginFolder, file))
                if (plugin.cmd) commands.push(plugin.cmd)
            }
        })

        let text = `*🔮 Mantra Bot 🔮*\n\n`
        text += `*User:* @${m.sender.split('@')[0]}\n`
        text += `*Commands:* ${commands.length}\n\n`
        
        commands.forEach(cmd => {
            text += `⬡ ${global.prefa}${cmd}\n`
        })

        text += `\n*Lightweight. Dangerous. Effective.*`

        await conn.sendMessage(m.chat, { 
            text: text, 
            mentions: [m.sender] 
        }, { quoted: m })
    }
}
