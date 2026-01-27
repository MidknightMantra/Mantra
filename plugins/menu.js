import os from 'os'

export default {
    cmd: 'menu',
    run: async (conn, m, args) => {
        const menu = `┏━━⟪ 𝐌𝐀𝐍𝐓𝐑𝐀 𝐁𝐎𝐓 ⟫━━⦿\n┃ ⚡ *Prefix:* ${global.prefa[0]}\n┃ ⌚ *Uptime:* ${process.uptime().toFixed(2)}s\n┗━━━━━━━━━━━━━━━━━━⦿\n\n┌───⭓ *COMMANDS*\n│ ◦ ,sticker\n│ ◦ ,social\n│ ◦ ,google\n│ ◦ ,all\n└───────────────⭓`
        await conn.sendMessage(m.chat, { text: menu })
    }
}
