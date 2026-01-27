import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const MAX_RESTARTS = 10          // Prevent infinite restart loops
let restartCount = 0
let childProcess = null
let isShuttingDown = false

function start() {
  if (isShuttingDown) return

  console.log('🚀 Starting Mantra...')

  const scriptPath = path.join(__dirname, 'main.js')
  const args = [scriptPath, ...process.argv.slice(2)]

  try {
    childProcess = spawn(process.argv[0], args, {
      stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
      env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'production' }
    })

    restartCount++

    console.log(`Child process started (PID: ${childProcess.pid}) - Restart count: \( {restartCount}/ \){MAX_RESTARTS}`)

    // Handle messages from child (e.g., 'reset')
    childProcess.on('message', (data) => {
      if (data === 'reset') {
        console.log('🔄 Received reset signal from child. Restarting...')
        restartChild()
      }
    })

    // Handle unexpected errors in child spawn
    childProcess.on('error', (err) => {
      console.error('❌ Child process error:', err.message)
      handleExit(1)
    })

    // Handle child exit
    childProcess.on('exit', (code, signal) => {
      console.log(`⚠️ Mantra exited with code ${code} (signal: ${signal || 'none'})`)

      if (isShuttingDown) return

      if (code !== 0 && code !== null) {
        if (restartCount >= MAX_RESTARTS) {
          console.error(`🚫 Max restarts (${MAX_RESTARTS}) reached. Giving up.`)
          process.exit(1)
        }
        console.log('🔄 Auto-restarting in 3 seconds...')
        setTimeout(restartChild, 3000)
      } else {
        console.log('✅ Clean exit. Not restarting.')
      }
    })

  } catch (err) {
    console.error('❌ Failed to spawn child process:', err.message)
    if (restartCount < MAX_RESTARTS) {
      console.log('🔄 Retrying spawn in 5 seconds...')
      setTimeout(start, 5000)
    } else {
      console.error('🚫 Too many spawn failures. Exiting.')
      process.exit(1)
    }
  }
}

function restartChild() {
  if (childProcess && !childProcess.killed) {
    console.log(`Killing child PID ${childProcess.pid}...`)
    childProcess.kill('SIGTERM')
    // Give it time to gracefully shut down
    setTimeout(() => {
      if (!childProcess.killed) {
        console.warn('Child did not exit gracefully. Force killing...')
        childProcess.kill('SIGKILL')
      }
      start()
    }, 2000)
  } else {
    start()
  }
}

// Graceful shutdown handler
function shutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`)
  isShuttingDown = true

  if (childProcess && !childProcess.killed) {
    childProcess.send({ type: 'shutdown' }) // Optional: notify child if it supports
    childProcess.kill('SIGTERM')
    setTimeout(() => {
      if (!childProcess.killed) childProcess.kill('SIGKILL')
      process.exit(0)
    }, 5000)
  } else {
    process.exit(0)
  }
}

// Listen for termination signals
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGHUP', () => shutdown('SIGHUP'))

// Global error handlers to prevent full crashes
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.stack || err)
  // Optionally restart or shutdown
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

// Start the bot
start()
