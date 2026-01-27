import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function start() {
    console.log('🚀 Starting Mantra...')
    
    // Spawn main.js as a child process
    let args = [path.join(__dirname, 'main.js'), ...process.argv.slice(2)]
    let p = spawn(process.argv[0], args, {
        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    })

    // Listen for messages from main.js (optional)
    p.on('message', data => {
        if (data === 'reset') {
            console.log('🔄 Restarting Bot...')
            p.kill()
            start()
            delete p
        }
    })

    // If main.js dies, restart it
    p.on('exit', code => {
        console.error('⚠️ Mantra Exited with code:', code)
        if (code !== 0) {
            console.log('🔄 Auto-Restarting in 2 seconds...')
            setTimeout(() => {
                start()
            }, 2000)
        }
    })
}

start()
