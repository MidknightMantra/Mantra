const { proto, getContentType } = require('@whiskeysockets/baileys');

exports.smsg = (conn, m, store) => {
    if (!m) return m;
    let M = proto.WebMessageInfo;
    
    if (m.key) {
        m.id = m.key.id;
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16;
        m.chat = m.key.remoteJid;
        m.fromMe = m.key.fromMe;
        m.isGroup = m.chat.endsWith('@g.us');
        m.sender = m.fromMe ? (conn.user.id.split(':')[0]+'@s.whatsapp.net' || conn.user.id) : (m.key.participant || m.key.remoteJid);
    }
    
    if (m.message) {
        m.mtype = getContentType(m.message);
        m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype]);
        
        // Easy access to text content
        m.text = m.msg.text || m.msg.caption || m.message.conversation || m.msg.contentText || m.msg.selectedDisplayText || m.msg.title || '';
        
        // Easy Reply Function
        m.reply = (text, chatId = m.chat, options = {}) => 
            conn.sendMessage(chatId, { text: text }, { quoted: m, ...options });
    }
    return m;
};
