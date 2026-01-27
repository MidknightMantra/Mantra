import axios from 'axios'

export default {
    cmd: 'ai',
    run: async (conn, m, args, text) => {
        try {
            if (!text) return m.reply('❌ Ask me something.\nExample: *,ai What is the meaning of life?*')

            // React to show it's thinking
            await conn.sendMessage(m.chat, { react: { text: '🧠', key: m.key } })

            // Use a free API (Hercai or Gifted)
            const apiUrl = `https://hercai.onrender.com/v3/hercai?question=${encodeURIComponent(text)}`
            
            const { data } = await axios.get(apiUrl)
            
            if (data && data.reply) {
                await m.reply(data.reply)
                await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
            } else {
                m.reply('❌ My brain is offline. Try again later.')
            }

        } catch (e) {
            console.error(e)
            m.reply('❌ Error connecting to AI.')
        }
    }
}
