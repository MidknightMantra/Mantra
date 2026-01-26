const fs = require('fs');

const SESSION_DIR = './session/';

const setupSession = () => {
    // 1. If we have a SESSION_ID environment variable
    if (process.env.SESSION_ID) {
        console.log('[MANTRA] Checking for Session ID...');
        
        if (!fs.existsSync(SESSION_DIR)) {
            fs.mkdirSync(SESSION_DIR, { recursive: true });
        }

        const credsPath = SESSION_DIR + 'creds.json';

        // Only write if creds.json doesn't exist yet
        if (!fs.existsSync(credsPath)) {
            console.log('[MANTRA] Restoring session from ID...');
            
            // Assume the ID is just the raw JSON content of creds.json encoded in Base64
            // (Standard for many bots)
            try {
                const decoded = Buffer.from(process.env.SESSION_ID, 'base64').toString('utf-8');
                fs.writeFileSync(credsPath, decoded);
                console.log('[MANTRA] Session restored successfully!');
            } catch (e) {
                console.error('[MANTRA] Invalid Session ID format. Starting fresh.');
            }
        }
    } else {
        console.log('[MANTRA] No Session ID found in env. Using local storage.');
    }
};

module.exports = { setupSession, SESSION_DIR };
