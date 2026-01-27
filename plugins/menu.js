import os from 'os'

export default {
    cmd: 'menu',
    run: async (conn, m, args) => {
        try {
            // 1. Calculate Uptime
            const uptime = process.uptime()
            const hours = Math.floor(uptime / 3600)
            const minutes = Math.floor((uptime % 3600) / 60)
            const seconds = Math.floor(uptime % 60)
            const uptimeStr = `${hours}h ${minutes}m ${seconds}s`

            // 2. Get User Info
            const pushname = m.pushName || "Mantra User"
            const time = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })

            // 3. The Menu Layout
            const menuText = `
┏━━⟪ 𝐌𝐀𝐍𝐓𝐑𝐀 𝐁𝐎𝐓 ⟫━━⦿
┃ 👤 *User:* ${pushname}
┃ ⌚ *Time:* ${time}
┃ 🚀 *Uptime:* ${uptimeStr}
┃ 🛡️ *Mode:* Big Boy (ESM)
┗━━━━━━━━━━━━━━━━━━⦿

┌───⭓ *PRIVACY (Passive)*
│ 🕵️ *Anti-ViewOnce* (Auto-Save)
│ 🗑️ *Anti-Delete* (Auto-Recover)
│ 💾 *Status Saver* (Auto-Download)
│ 👀 *Auto-View* (Always Blue Tick)
└────────────────⭓

┌───⭓ *MEDIA & TOOLS*
│ ⬇️ *,social* <link>
│    _(TikTok, IG, FB, Twitter)_
│ 📦 *,sticker* │    _(Reply to Image/Video)_
│ 🔓 *,vv* │    _(Reply to ViewOnce)_
│ 🔍 *,google* <query>
└────────────────⭓

┌───⭓ *GROUP ADMIN*
│ 📣 *,hidetag* <text>
│ 👢 *,kick* @user
│ 👑 *,promote* @user
│ 📉 *,demote* @user
└────────────────⭓

> _Mantra: Silence is Power._`

            // 4. Send with Reaction
            await conn.sendMessage(m.chat, { react: { text: '⚡', key: m.key } })
            
            // 5. Send Menu (with Link Preview enabled for style)
            await conn.sendMessage(m.chat, { 
                text: menuText,
                contextInfo: {
                    externalAdReply: {
                        title: "Mantra System Online",
                        body: "Privacy. Power. Speed.",
                        thumbnailUrl: "https://cdn-icons-png.flaticon.com/512/9376/9376991.png", // Cool Icon
                        sourceUrl: "https://github.com/MidknightMantra",
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m })

        } catch (e) {
            console.error(e)
            m.reply('❌ Menu Error.')
        }
    }
}
