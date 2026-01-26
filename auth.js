const fs = require('fs');

const SESSION_DIR = './session/';

const setupSession = () => {
    if (process.env.SESSION_ID) {
        console.log('[MANTRA] Checking for Session ID...');
        
        if (!fs.existsSync(SESSION_DIR)) {
            fs.mkdirSync(SESSION_DIR, { recursive: true });
        }

        const credsPath = SESSION_DIR + 'creds.json';

        if (!fs.existsSync(credsPath)) {
            console.log('[MANTRA] Restoring session...');
            
            // 1. Get the Raw ID
            let sessId = process.env.SESSION_ID;

            // 2. Check for the Prefix "Mantra~"
            if (sessId.startsWith('Mantra~')) {
                // Remove the prefix to get the real data
                sessId = sessId.replace('Mantra~', '');
            } else {
                // Optional: Warn if the user pasted a raw code without the prefix
                console.log('[WARN] Session ID missing "Mantra~" prefix, trying raw decode...');
            }

            // 3. Decode and Save
            try {
                const decoded = Buffer.from(sessId, 'base64').toString('utf-8');
                
                // Safety check: Ensure the result looks like JSON
                if (decoded.startsWith('{')) {
                    fs.writeFileSync(credsPath, decoded);
                    console.log('[MANTRA] Session restored successfully!');
                } else {
                    console.error('[ERROR] Session ID decoding failed (Not JSON).');
                }
            } catch (e) {
                console.error('[ERROR] Invalid Session ID format.');
            }
        }
    } else {
        console.log('[MANTRA] No Session ID found in env. Using local storage.');
    }
};

module.exports = { setupSession, SESSION_DIR };
