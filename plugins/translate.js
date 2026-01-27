import axios from 'axios'

export default {
    cmd: ['tr', 'translate'],
    run: async (conn, m, { args, text }) => {
        const lang = args[0] || 'en'
        const input = m.quoted ? m.quoted.text : text.replace(lang, '').trim()
        
        if (!input) return m.reply('✍️ Provide text or quote a message.\nExample: *.tr es Hello*')

        try {
            const { data } = await axios.get(`https://api.vreden.web.id/api/tools/translate?text=${encodeURIComponent(input)}&to=${lang}`)
            await m.reply(`🌐 *Translation (${lang}):*\n\n${data.result}`)
        } catch (e) {
            m.reply('❌ Translation failed.')
        }
    }
}
