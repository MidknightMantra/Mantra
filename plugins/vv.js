import { downloadMedia } from '../lib/media.js'

function unwrapViewOnce(message) {
  if (!message) return null
  const unwrap = (msg) => {
    if (msg?.viewOnceMessage?.message) return unwrap(msg.viewOnceMessage.message)
    if (msg?.viewOnceMessageV2?.message) return unwrap(msg.viewOnceMessageV2.message)
    if (msg?.viewOnceMessageV2Extension?.message) return unwrap(msg.viewOnceMessageV2Extension.message)
    return msg
  }
  return unwrap(message)
}

export default {
  cmd: 'vv',
  run: async (conn, m, args) => {
    try {
      // 1. Get quoted message
      let quotedMsg = m.msg?.contextInfo?.quotedMessage || m.quoted?.message
      if (!quotedMsg) return m.reply('❌ Please reply to a View Once message.')

      // 2. Unwrap
      const unwrapped = unwrapViewOnce(quotedMsg)
      const mediaContent = unwrapped?.imageMessage || unwrapped?.videoMessage
      
      if (!mediaContent) {
        return m.reply('❌ No View Once media found in that message.')
      }

      // React to indicate processing
      await conn.sendMessage(m.chat, { react: { text: '🔓', key: m.key } })

      // 3. Determine type & download
      const isImage = !!unwrapped.imageMessage
      const type = isImage ? 'image' : 'video'
      
      // downloadMedia expects the clean type (image/video)
      const buffer = await downloadMedia({ msg: mediaContent, mtype: type })
      
      if (!buffer) throw new Error('Failed to download media.')

      // 4. Prepare metadata
      const sender = m.quoted?.sender || m.sender
      const caption = `🔓 *View Once Revealed*\n\n` +
                      `👤 *From:* @${sender.split('@')[0]}\n` +
                      `⏰ *Time:* ${new Date().toLocaleString()}`

      // 5. Send to bot's own chat (Saved Messages)
      let botJid = conn.user.id.split(':')[0] + '@s.whatsapp.net'

      await conn.sendMessage(botJid, { 
        [type]: buffer, 
        caption, 
        mentions: [sender] 
      })

      // 6. Success reaction
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

    } catch (e) {
      console.error('VV Command Error:', e)
      await m.reply(`❌ Error: ${e.message}`)
    }
  }
}
