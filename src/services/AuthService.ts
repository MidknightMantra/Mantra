import { useMultiFileAuthState } from '@whiskeysockets/baileys'
import path from 'path'
import fs from 'fs/promises'
import { config } from '../config/env.js'
import { logger } from '../utils/logger.js'

export class AuthService {
    private sessionDir: string

    constructor() {
        this.sessionDir = path.resolve('session')
    }

    async init() {
        await fs.mkdir(this.sessionDir, { recursive: true })

        // Check if creds.json exists, if not, try to restore from SESSION_ID
        const credsPath = path.join(this.sessionDir, 'creds.json')

        try {
            await fs.access(credsPath)
        } catch {
            // File does not exist, try restoring
            if (config.SESSION_ID) {
                const sessionData = config.SESSION_ID.replace('Mantra~', '').trim()
                if (sessionData) {
                    try {
                        const decoded = Buffer.from(sessionData, 'base64').toString('utf-8')
                        // Validate it looks like JSON
                        JSON.parse(decoded)
                        await fs.writeFile(credsPath, decoded)
                        logger.info('🔓 Session restored from SESSION_ID')
                    } catch (err) {
                        logger.error('❌ Invalid SESSION_ID. Starting fresh.')
                    }
                }
            }
        }

        const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir)
        return { state, saveCreds }
    }
}
