const { spawn } = require('child_process')
const path = require('path')
const keepAlive = require('./lib/alive') // Import the heartbeat

function start() {
    let args = [path.join(__dirname, 'main.js'), ...process.argv.slice(2)]
    
    let p = spawn(process.argv[0], args, {
        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    })

    // Message from main.js (e.g., "reset")
    p.on('message', data => {
        if (data === 'reset') {
            console.log('Restarting Bot...')
            p.kill()
            start()
            delete p
        }
    })

    // Handle exit code
    p.on('exit', code => {
        console.error('Exited with code:', code)
        if (code === '.' || code === 1 || code === 0) start()
    })
}

// Initialize the Heartbeat for Railway
keepAlive()

// Start the Bot Process
start()
