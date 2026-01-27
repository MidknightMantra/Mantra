import { SocketService } from './services/SocketService.js'
import { connectDB } from './database/index.js'
import { logger } from './utils/logger.js'

async function main() {
    try {
        logger.info('🚀 Starting Mantra Refactored...')

        // 1. Connect to DB
        await connectDB()

        // 2. Start Socket Service
        const socketService = new SocketService()
        await socketService.start()

    } catch (err) {
        logger.fatal(err, '🔥 Fatal startup error')
        process.exit(1)
    }
}

main()
