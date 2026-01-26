const { spawn } = require('child_process');
const path = require('path');

function start() {
    let args = [path.join(__dirname, 'main.js'), ...process.argv.slice(2)];
    console.log('[MIDKNIGHT] Booting up...');
    
    let p = spawn(process.argv[0], args, {
        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    });

    p.on('message', data => {
        if (data === 'reset') {
            console.log('[MIDKNIGHT] Restarting process...');
            p.kill();
            start();
        }
    });

    p.on('exit', code => {
        console.error('[MIDKNIGHT] Exited with code:', code);
        if (code !== 0) start(); // Auto-restart on crash
    });
}

start();
