// Bootloader to dynamically load ESM Baileys before starting the CJS application
const { loadBaileys } = require('./lib/baileys');

async function boot() {
    console.log('[boot] Loading @whiskeysockets/baileys (ESM)...');
    try {
        await loadBaileys();
        console.log('[boot] Baileys loaded successfully.');

        // Start the web server
        require('./lib/server');

        // Start the bot
        require('./mantra');
    } catch (err) {
        console.error('[boot] Failed to load Baileys or start application:', err);
        process.exit(1);
    }
}

boot();
