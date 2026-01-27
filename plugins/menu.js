const os = require('os')

module.exports = {
    cmd: 'menu',
    run: async (conn, m, args) => {
        try {
            // 1. Calculate Uptime
            const uptime = process.uptime()
            const uptimeString = formatUptime(uptime)
            
            // 2. Get User Info
            const pushName = m.pushName || "User"
            const date = new Date().toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric'
            })
            const time = new Date().toLocaleTimeString('en-GB', {
                hour: '2-digit', minute: '2-digit'
            })

            // 3. The Dashboard Layout
            let menu = `
┏━━⟪ 𝐌𝐀𝐍𝐓𝐑𝐀 𝐁𝐎𝐓 ⟫━━⦿
┃
┃ 👤 *User:* ${pushName}
┃ ⌚ *Uptime:* ${uptimeString}
┃ 📅 *Date:* ${date}
┃ ⏰ *Time:* ${time}
┃ 💻 *Platform:* ${os.platform()}
┃
┗━━━━━━━━━━━━━━━━━━⦿

┌───⭓ *COMMANDS*
│
│ ◦ ,ping
│ ◦ ,google <query>
│ ◦ ,sticker (reply to img)
│ ◦ ,vv (reply to viewonce)
│ ◦ ,all (tag everyone)
│
└───────────────⭓

_Simple. Lightweight. Dangerous._
`
            // 4. Send with Rich Link Preview
            await conn.sendMessage(m.chat, { 
                text: menu.trim(),
                contextInfo: {
                    externalAdReply: {
                        title: "MANTRA SYSTEM",
                        body: "Tap to view Source Code",
                        thumbnailUrl: "https://i.imgur.com/M8k2kLd.png", // Replace this with your own logo later
                        sourceUrl: "https://github.com/MidknightMantra/Mantra",
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m })

        } catch (e) {
            console.error(e)
            m.reply('Menu Error.')
        }
    }
}

// --- Helper: Format Uptime ---
function formatUptime(seconds) {
    seconds = Number(seconds)
    var d = Math.floor(seconds / (3600 * 24))
    var h = Math.floor(seconds % (3600 * 24) / 3600)
    var m = Math.floor(seconds % 3600 / 60)
    var s = Math.floor(seconds % 60)
    
    var dDisplay = d > 0 ? d + (d == 1 ? "d " : "d ") : ""
    var hDisplay = h > 0 ? h + (h == 1 ? "h " : "h ") : ""
    var mDisplay = m > 0 ? m + (m == 1 ? "m " : "m ") : ""
    var sDisplay = s > 0 ? s + (s == 1 ? "s" : "s") : ""
    return dDisplay + hDisplay + mDisplay + sDisplay
}
