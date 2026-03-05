const path = require('path');
const fs = require('fs');
const axios = require('axios');

const GITHUB_USERNAME = 'stormfiber';

/**
 * Save credentials from GitHub Gist to session/creds.json
 * @param {string} txt - Gist ID with optional prefix
 */
async function SaveCreds(txt) {
    const __dirname = path.dirname(__filename);
    const sessionDir = path.join(__dirname, '..', 'session');
    const credsPath = path.join(sessionDir, 'creds.json');

    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }

    // Handle Base64 Directly
    try {
        const decoded = Buffer.from(txt, 'base64').toString('utf-8');
        if (decoded.includes('noiseKey') && decoded.includes('signedIdentityKey')) {
            fs.writeFileSync(credsPath, decoded);
            return;
        }
    } catch (e) {
        // Not a direct base64 creds string, proceed to Gist
    }

    // Handle Gist ID (with or without Mantra~ prefix)
    const gistId = txt.startsWith('Mantra~') ? txt.replace('Mantra~', '') : txt;
    const gistUrl = `https://gist.githubusercontent.com/${GITHUB_USERNAME}/${gistId}/raw/creds.json`;

    try {
        const response = await axios.get(gistUrl);
        const data = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        fs.writeFileSync(credsPath, data);
    } catch (error) {
        console.error('❌ Error downloading or saving credentials from Gist:', error.message);
        throw error;
    }
}

module.exports = SaveCreds;
