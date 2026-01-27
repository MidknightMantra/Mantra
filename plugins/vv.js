import { downloadMedia } from '../lib/media.js'

// Helper to unwrap any view-once layers and get the real content
function unwrapViewOnce(message) {
  if (!message) return null

  // Recursive unwrap (handles multiple layers or future-proof)
  const unwrap = (msg) => {
    if (msg?.viewOnceMessage) return unwrap(msg.viewOnceMessage?.message)
    if (msg?.viewOnceMessageV2) return unwrap(msg.viewOnceMessageV2?.message)
    if (msg?.viewOnceMessageV2Extension) return unwrap(msg.viewOnceMessageV2Extension?.message)
    // Add other known wrappers if needed (e.g. future ones)
    // if (msg?.editedMessage) return unwrap(msg.editedMessage?.message)
    return msg
  }

  return unwrap(message)
}

export default {
  cmd: 'vv',
  run: async (conn, m, args) => {
    try {
      // 1. Safely get quoted message (support different Baileys structures)
      let quotedMsg = m.quoted?.message || m.message?.extendedTextMessage?.contextInfo?.quotedMessage
      if (!quotedMsg) {
        return m.reply('❌ Please reply to a View Once message.')
      }

      // 2. Unwrap the view once structure
      const unwrapped = unwrapViewOnce(quotedMsg)
      if (!unwrapped) {
        return m.reply('❌ Could not unwrap View Once structure.')
      }

      // 3. Extract actual media content from unwrapped message
      const mediaContent = unwrapped.imageMessage || unwrapped.videoMessage
      if (!mediaContent) {
        return m.reply('❌ No image or video found in this View Once message.')
      }

      // Optional: confirm it's marked as view once (defensive)
      const isViewOnce = !!mediaContent.viewOnce
      if (!isViewOnce) {
        console.warn('Warning: Media not marked as viewOnce, but proceeding anyway.')
      }

      // React to indicate processing
      await conn.sendMessage(m.chat, { react: { text: '🔓', key: m.key } })

      // 4. Determine type & download the INNER media content
      const isImage = !!unwrapped.imageMessage
      const mediaType = isImage ? 'imageMessage' : 'videoMessage'

      const buffer = await downloadMedia({ msg: mediaContent, mtype: mediaType })
      if (!buffer || buffer.length === 0) {
        throw new Error('Downloaded buffer is empty or null')
      }

      // 5. Prepare caption with more info
      const sender = m.sender || m.key?.fromMe ? conn.user.id : m.key?.participant || m.key?.remoteJid
      const fromText = m.isGroup ? `Group: ${m.chat.split('@')[0]}` : 'DM'
      const caption = `🔓 *View Once Revealed* (${isImage ? 'Image' : 'Video'})\n\n` +
                      `👤 *From:* @${sender.split('@')[0]}\n` +
                      `📍 *Chat:* ${fromText}\n` +
                      `⏰ *Revealed:* ${new Date().toLocaleString()}`

      // 6. Send to bot's own chat (Saved Messages / self DM)
      // Robust bot JID extraction
      let botJid = conn.user?.id || conn.user?.jid
      if (!botJid) throw new Error('Could not determine bot JID')
      botJid = botJid.replace(/:\d+/, '') + '@s.whatsapp.net'  // normalize to user@s.whatsapp.net

      if (isImage) {
        await conn.sendMessage(botJid, { 
          image: buffer, 
          caption, 
          mentions: [sender] 
        })
      } else {
        await conn.sendMessage(botJid, { 
          video: buffer, 
          caption, 
          mentions: [sender] 
        })
      }

      // 7. Success reaction
      await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
      await m.reply('✅ View Once saved to your saved messages!')

    } catch (e) {
      console.error('VV command error:', e.stack || e)
      await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
      await m.reply(`❌ Failed to reveal View Once: ${e.message || 'Unknown error'}`)
    }
  }
}
