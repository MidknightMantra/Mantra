const googleIt = require('google-it')

module.exports = {
    cmd: 'google',
    run: async (conn, m, args, text) => {
        try {
            // 1. Validation
            if (!text) return m.reply('❌ Please provide a search query.\nExample: *,google best nodejs bot*')

            // 2. React (Searching)
            await conn.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })

            // 3. Search
            // We fetch the top 5 results
            const results = await googleIt({ query: text, limit: 5 })

            if (!results || results.length === 0) {
                return m.reply('❌ No results found.')
            }

            // 4. Formatting
            // We build a nice text list with Titles, Snippets, and Links
            let msg = `🔍 *Google Search Results for:* ${text}\n\n`

            results.forEach(res => {
                msg += `🔹 *${res.title}*\n`
                msg += `_${res.snippet}_\n`
                msg += `🔗 ${res.link}\n\n`
            })

            // 5. Send
            // We add a link preview to the first result to make it look premium
            await conn.sendMessage(m.chat, { 
                text: msg.trim(),
                contextInfo: {
                    externalAdReply: {
                        title: results[0].title,
                        body: "Top Search Result",
                        thumbnailUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/1024px-Google_%22G%22_Logo.svg.png",
                        sourceUrl: results[0].link,
                        mediaType: 1,
                        renderLargerThumbnail: true
                    }
                }
            }, { quoted: m })

        } catch (e) {
            console.error(e)
            m.reply('❌ Google Search Failed.')
        }
    }
}
