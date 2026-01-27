import axios from 'axios'

export default {
    cmd: 'social',
    run: async (conn, m, args, text) => {
        if (!text) return m.reply('❌ Send URL.')
        try {
            await conn.sendMessage(m.chat, { react: { text: '⬇️', key: m.key } })
            let apiUrl = `https://api.giftedtech.my.id/api/download/tiktokdl?url=${text}&apikey=gifted`
            if (text.includes('instagram')) apiUrl = `https://api.giftedtech.my.id/api/download/instagram?url=${text}&apikey=gifted`
            
            const { data } = await axios.get(apiUrl)
            const url = data.result?.url || data.result?.video || (Array.isArray(data.result) ? data.result[0].url : null)
            
            if (url) await conn.sendMessage(m.chat, { video: { url: url }, caption: '⚡ Mantra' }, { quoted: m })
            else m.reply('❌ Failed.')
        } catch (e) {
            m.reply('❌ Error.')
        }
    }
}
