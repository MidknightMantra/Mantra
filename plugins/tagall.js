export default {
    cmd: 'all',
    run: async (conn, m, args, text) => {
        if (!m.isGroup) return
        const meta = await conn.groupMetadata(m.chat)
        const mentions = meta.participants.map(p => p.id)
        await conn.sendMessage(m.chat, { text: text || '.', mentions: mentions }, { quoted: m })
    }
}
