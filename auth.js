const fs = require('fs');

const SESSION_DIR = './session/';

const setupSession = () => {
    // 1. Check if SESSION_ID environment variable exists
    if (process.env.SESSION_ID) {
        console.log('[MANTRA] Checking for Session ID...');
        
        // Ensure session directory exists
        if (!fs.existsSync(SESSION_DIR)) {
            fs.mkdirSync(SESSION_DIR, { recursive: true });
        }

        const credsPath = SESSION_DIR + 'creds.json';

        // Only overwrite/restore if creds.json doesn't exist yet
        // (This prevents overwriting a valid live session on restart)
        if (!fs.existsSync(credsPath)) {
            console.log('[MANTRA] Restoring session...');
            
            let sessId = process.env.SESSION_ID.trim();

            // 2. Check for and remove the "Mantra~" prefix
            if (sessId.startsWith('Mantra~')) {
                console.log('[MANTRA] Valid prefix detected.');
                sessId = sessId.replace('Mantra~', '');
            } else {
                console.log('[WARN] Session ID missing "Mantra~" prefix. Attempting raw decode...');
            }

            // 3. Decode Base64 and Save
            try {
                const decoded = Buffer.from(sessId, 'base64').toString('utf-8');
                
                // Simple validation: Valid creds.json must start with "{"
                if (decoded.trim().startsWith('{')) {
                    fs.writeFileSync(credsPath, decoded, 'utf8');
                    console.log('[MANTRA] Session restored successfully!');
                } else {
                    console.error('[ERROR] Decoded session is not valid JSON.');
                }
            } catch (e) {
                console.error('[ERROR] Failed to decode Session ID:', e.message);
            }
        } else {
            console.log('[MANTRA] Existing session files found. Skipping restore.');
        }
    } else {
        console.log('[MANTRA] No Session ID found in env. Using local storage.');
    }
};

module.exports = { setupSession, SESSION_DIR };
