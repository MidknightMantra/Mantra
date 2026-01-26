const { spawn } = require('child_process');
const path = require('path');

function start() {
    let args = [path.join(__dirname, 'main.js'), ...process.argv.slice(2)];
    let p = spawn(process.argv[0], args, {
        stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    });

    p.on('message', data => {
        if (data === 'reset') {
            console.log('Restarting Mantra...');
            p.kill();
            start();
            delete p;
        }
    });

    p.on('exit', code => {
        console.error('Exited with code:', code);
        if (code !== 0) {
            start(); // Auto-restart on crash
        }
    });
}

start();
