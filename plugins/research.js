import googleIt from 'google-it'

export default {
    cmd: 'google',
    run: async (conn, m, args, text) => {
        if (!text) return m.reply('❌ Query?')
        const results = await googleIt({ query: text, limit: 5 })
        let msg = `🔍 *Google:* ${text}\n\n`
        results.forEach(res => msg += `🔹 ${res.title}\n🔗 ${res.link}\n\n`)
        await m.reply(msg)
    }
}
