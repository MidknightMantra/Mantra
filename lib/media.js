import pkg from '@whiskeysockets/baileys'
const { downloadContentFromMessage } = pkg

export const downloadMedia = async ({ msg, mtype }) => {
    if (!msg || !mtype) return null
    try {
        const stream = await downloadContentFromMessage(msg, mtype)
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        return buffer
    } catch (err) {
        console.error('Media download error:', err.message)
        return null
    }
}
