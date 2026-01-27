import { WAMessage, proto, WASocket } from '@whiskeysockets/baileys'

export function getMessageContent(m: WAMessage) {
    if (!m.message) return null
    const type = Object.keys(m.message)[0]
    // specialized handling if needed
    return m.message[type as keyof typeof m.message]
}

export function getBody(m: WAMessage): string {
    if (!m.message) return ''
    const type = Object.keys(m.message)[0]
    if (type === 'conversation') return m.message.conversation || ''
    if (type === 'imageMessage') return m.message.imageMessage?.caption || ''
    if (type === 'videoMessage') return m.message.videoMessage?.caption || ''
    if (type === 'extendedTextMessage') return m.message.extendedTextMessage?.text || ''
    return ''
}

export function getSender(m: WAMessage, fromMe: boolean): string {
    if (fromMe && m.key.participant) return m.key.participant
    if (fromMe) return 'me' // Should use actual bot JID
    return m.key.participant || m.key.remoteJid || ''
}
