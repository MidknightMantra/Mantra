import os from 'node:os'

export default {
    cmd: 'menu',
    run: async (conn, m, args) => {
        const uptime = process.uptime()
        const hours = Math.floor(uptime / 3600)
        const minutes = Math.floor((uptime % 3600) / 60)
        
        const prefix = global.prefa[0] // Uses your primary prefix (e.g. ,)

        let menuText = `
╭━━〔 *MANTRA* 〕━━┈⊷
┃ 👤 *Owner:* @${global.owner[0]}
┃ ⏱️ *Uptime:* ${hours}h ${minutes}m
┃ 🧠 *RAM:* ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB
┃ 🛰️ *Prefix:* [ ${global.prefa.join(' ')} ]
╰━━━━━━━━━━━━━━┈⊷

✨ *MAIN COMMANDS*
❯ ${prefix}ping - _Check bot speed_
❯ ${prefix}system - _View server info_
❯ ${prefix}menu - _Show this list_

📥 *DOWNLOADER*
❯ ${prefix}social [link] - _IG, TikTok, FB, X_
❯ ${prefix}vv - _Unlock View-Once media_

🛡️ *STATUS & PRIVACY*
❯ Anti-Delete: *${global.antiDelete ? 'ON' : 'OFF'}*
❯ Anti-ViewOnce: *${global.antiViewOnce ? 'ON' : 'OFF'}*
❯ Auto-Read Status: *${global.autoStatusRead ? 'ON' : 'OFF'}*

💡 *Tip:* _Reply to a View-Once image with ${prefix}vv to save it!_
`.trim()

        await conn.sendMessage(m.chat, { 
            text: menuText,
            mentions: [global.owner[0] + '@s.whatsapp.net']
        }, { quoted: m })
        
        // React to the command to show it's working
        await conn.sendMessage(m.chat, { react: { text: '📜', key: m.key } })
    }
}
