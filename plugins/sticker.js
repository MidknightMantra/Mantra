export default {
    cmd: ['s', 'sticker', 'wm'],
    run: async (conn, m) => {
        const q = m.quoted ? m.quoted : m
        const mime = (q.msg || q).mimetype || ''
        
        if (/image|video/.test(mime)) {
            await conn.sendMessage(m.chat, { react: { text: '🎨', key: m.key } })
            const media = await q.download()
            await conn.sendImageAsSticker(m.chat, media, { 
                pack: 'Mantra Bot', 
                author: '@Mantra' 
            })
        } else {
            m.reply('📸 Please quote an image or short video!')
        }
    }
}
