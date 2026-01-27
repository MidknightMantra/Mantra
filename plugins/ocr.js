import axios from 'axios'

export default {
    cmd: ['ocr', 'read'],
    run: async (conn, m) => {
        const q = m.quoted ? m.quoted : m
        const mime = (q.msg || q).mimetype || ''
        
        if (!/image/.test(mime)) return m.reply('📸 Please quote an image to read the text.')
        
        await conn.sendMessage(m.chat, { react: { text: '🔍', key: m.key } })
        
        try {
            const media = await q.download()
            // Using a free OCR API bridge
            const { data } = await axios.post('https://api.ocr.space/parse/image', {
                base64Image: `data:${mime};base64,${media.toString('base64')}`,
                apikey: 'helloworld' // Public testing key
            })
            
            const text = data.ParsedResults[0].ParsedText
            await m.reply(text || '❌ No text found in this image.')
        } catch (e) {
            m.reply('❌ OCR Service is currently down.')
        }
    }
}
