import { useMultiFileAuthState } from '@whiskeysockets/baileys'
import path from 'path'
import fs from 'fs/promises'

export class AuthService {
    private sessionDir: string

    constructor() {
        this.sessionDir = path.resolve('session')
    }

    async init() {
        await fs.mkdir(this.sessionDir, { recursive: true })
        const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir)
        return { state, saveCreds }
    }
}
