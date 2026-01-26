const google = require('googlethis')

module.exports = {
    cmd: 'google',
    run: async (conn, m, args, text) => {
        if (!text) return m.reply('❌ What should I research? Example: .google best lightweight bots')
        
        await m.reply('🔎 Researching...')
        
        try {
            const options = {
                page: 0, 
                safe: false, // Dangerous efficiency
                additional_params: { 
                    hl: 'en' 
                }
            }
            
            const response = await google.search(text, options)
            
            if (!response.results.length) return m.reply('❌ No results found.')

            let txt = `*🔎 Mantra Research: ${text}*\n\n`
            
            // Limit to top 5 results to keep it lightweight
            for (let i = 0; i < 5; i++) {
                if (response.results[i]) {
                    txt += `*${i + 1}. ${response.results[i].title}*\n`
                    txt += `_${response.results[i].description}_\n`
                    txt += `🔗 ${response.results[i].url}\n\n`
                }
            }
            
            // Add a "Knowledge Graph" snippet if available (e.g. "Who is X?")
            if (response.knowledge_panel.title) {
                txt += `*💡 Quick Answer:*\n${response.knowledge_panel.description}\n`
            }

            await m.reply(txt)

        } catch (e) {
            console.error(e)
            m.reply('❌ Research failed. Google might be blocking the server IP.')
        }
    }
}
