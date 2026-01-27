import os from 'node:os'

export default {
    cmd: 'menu',
    run: async (conn, m, args) => {
        const uptime = process.uptime()
        const hours = Math.floor(uptime / 3600)
        const minutes = Math.floor((uptime % 3600) / 60)

        let menuText = `
✨ *MANTRA* ✨
_Privacy-Focused & Lightweight_

👤 *Owner:* @${global.owner[0].split('@')[0]}
⌨️ *Prefix:* ${global.prefa.join(' ')}
⏱️ *Uptime:* ${hours}h ${minutes}m
🔌 *Plugins:* 11 Active

🚀 *COMMANDS:*
• \`system\` - View server specs
• \`ping\` - Check bot latency
• \`vv\` - Unlock View-Once media
• \`menu\` - Show this list

🛡️ *ACTIVE FEATURES:*
• Anti-Delete: ${global.antiDelete ? '✅' : '❌'}
• Anti-ViewOnce: ${global.antiViewOnce ? '✅' : '❌'}
• Auto-Status Read: ${global.autoStatusRead ? '✅' : '❌'}

_Mantra v1.1.0 | Railway Deployment_
`.trim()

        await conn.sendMessage(m.chat, { 
            text: menuText,
            mentions: [global.owner[0] + '@s.whatsapp.net']
        }, { quoted: m })
    }
}
