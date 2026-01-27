import { WASocket, WAMessage, proto, AnyMessageContent } from '@whiskeysockets/baileys'

export interface MantraContext {
    conn: WASocket
    msg: WAMessage

    // Parsed message info
    from: string
    sender: string
    body: string
    args: string[]
    command: string

    // Helpers
    isOwner: boolean
    isGroup: boolean

    // Actions
    reply: (text: string | AnyMessageContent) => Promise<proto.WebMessageInfo | undefined>
    react: (emoji: string) => Promise<void>
}

export interface Plugin {
    name?: string
    description?: string
    usage?: string
    category?: string
    triggers: string[] // The commands that trigger this plugin
    execute: (ctx: MantraContext) => Promise<void>
}
