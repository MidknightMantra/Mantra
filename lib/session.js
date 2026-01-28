import fs from 'fs';
import chalk from 'chalk';

export const validateSession = async (sessionId, sessionDir) => {
    if (!sessionId) return;

    // Check format
    if (!sessionId.startsWith("Mantra~")) {
        console.log(chalk.red("⚠️ Invalid Session ID format. Must start with 'Mantra~'"));
        return;
    }

    try {
        console.log(chalk.blue("🔮 Found SESSION_ID, restoring session..."));

        // Ensure session directory exists
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir);
        }

        // Extract data (remove 'Mantra~')
        const sessionData = sessionId.replace("Mantra~", "");

        // Decode Base64 to JSON text
        const credsJson = Buffer.from(sessionData, 'base64').toString('utf-8');

        // Write to creds.json
        fs.writeFileSync(`${sessionDir}/creds.json`, credsJson);

        console.log(chalk.green("✅ Session restored successfully from ID!"));
    } catch (error) {
        console.error(chalk.red("❌ Error restoring session:", error.message));
    }
};