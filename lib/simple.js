import pkg from '@whiskeysockets/baileys'
const { proto, getContentType } = pkg

export function smsg(conn, m) {
    if (!m) return m
    if (m.key) {
        m.id = m.key.id
        m.chat = m.key.remoteJid
        m.fromMe = m.key.fromMe
        m.isGroup = m.chat.endsWith('@g.us')
        m.sender = m.fromMe ? (conn.user.id.split(':')[0] + '@s.whatsapp.net') : (m.key.participant || m.key.remoteJid)
    }
    if (m.message) {
        m.mtype = getContentType(m.message)
        m.msg = (m.mtype === 'viewOnceMessageV2' ? m.message.viewOnceMessageV2.message : m.message)[m.mtype]
        
        // Robust body extraction: Works for text, captions, and extended text
        m.body = m.message.conversation || 
                 (m.msg && m.msg.caption) || 
                 (m.msg && m.msg.text) || 
                 (m.mtype === 'extendedTextMessage' && m.msg.text) || 
                 (m.mtype === 'buttonsResponseMessage' && m.msg.selectedButtonId) || ''
        
        m.reply = (text) => conn.sendMessage(m.chat, { text }, { quoted: m })
    }
    return m
}
