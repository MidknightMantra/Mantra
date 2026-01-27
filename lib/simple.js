import { proto } from '@whiskeysockets/baileys'

export function smsg(conn, m, hasParent) {
    if (!m) return m
    let M = proto.WebMessageInfo
    if (m.key) {
        m.id = m.key.id
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16
        m.chat = m.key.remoteJid
        m.fromMe = m.key.fromMe
        m.isGroup = m.chat.endsWith('@g.us')
        m.sender = m.fromMe ? (conn.user.id.split(':')[0]+'@s.whatsapp.net' || conn.user.id) : (m.key.participant || m.key.remoteJid)
    }
    if (m.message) {
        m.mtype = Object.keys(m.message)[0]
        m.msg = m.message[m.mtype]
        if (m.mtype === 'ephemeralMessage') {
            smsg(conn, m.msg)
            m.mtype = m.msg.mtype
            m.msg = m.msg.msg
        }
        m.body = m.message.conversation || m.msg.caption || m.msg.text || (m.mtype == 'listResponseMessage') && m.msg.singleSelectReply.selectedRowId || (m.mtype == 'buttonsResponseMessage') && m.msg.selectedButtonId || (m.mtype == 'viewOnceMessage') && m.msg.caption || m.text
        m.reply = (text, chatId = m.chat, options = {}) => Buffer.isBuffer(text) ? conn.sendFile(chatId, text, 'file', '', m, { ...options }) : conn.sendMessage(chatId, { text: text, ...options }, { quoted: m })
    }
    return m
}
