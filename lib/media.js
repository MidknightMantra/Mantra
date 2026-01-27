import { downloadContentFromMessage } from '@whiskeysockets/baileys'

export const downloadMedia = async ({ msg, mtype }) => {
    if (!msg || !mtype) return null
    const stream = await downloadContentFromMessage(msg, mtype)
    let buffer = Buffer.from([])
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk])
    }
    return buffer
}
