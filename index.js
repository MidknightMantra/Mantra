import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const MAX_RESTARTS = 10
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

    // FIXED: Corrected the template literal backticks and variable syntax
    console.log(`Child process started (PID: ${childProcess.pid}) - Restart count: ${restartCount}/${MAX_RESTARTS}`)

    // Handle messages from child (e.g., 'reset' or 'reload')
    childProcess.on('message', (data) => {
      if (data === 'reset') {
        console.log('🔄 Received reset signal from child. Restarting...')
        restartCount = 0 // Reset counter on manual restart
        restartChild()
      }
    })

    childProcess.on('error', (err) => {
      console.error('❌ Child process error:', err.message)
    })

    childProcess.on('exit', (code, signal) => {
      console.log(`⚠️ Mantra exited with code ${code} (signal: ${signal || 'none'})`)

      if (isShuttingDown) return

      // If code is not 0, it crashed or was killed
      if (code !== 0 && code !== null) {
        restartCount++
        
        if (restartCount >= MAX_RESTARTS) {
          console.error(`🚫 Max restarts (${MAX_RESTARTS}) reached. Check your code for errors!`)
          process.exit(1)
        }
        
        console.log(`🔄 Auto-restarting in 3 seconds... (${restartCount}/${MAX_RESTARTS})`)
        setTimeout(start, 3000)
      } else {
        console.log('✅ Clean exit. Standby.')
      }
    })

  } catch (err) {
    console.error('❌ Failed to spawn child process:', err.message)
    process.exit(1)
  }
}

function restartChild() {
  if (childProcess && !childProcess.killed) {
    childProcess.kill('SIGTERM')
    // Start will be triggered by the 'exit' listener above
  } else {
    start()
  }
}

// Graceful shutdown
function shutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Shutting down...`)
  isShuttingDown = true
  if (childProcess) childProcess.kill('SIGTERM')
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

start()
