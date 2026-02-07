import { addCommand } from '../lib/plugins.js';
import { log } from '../src/utils/logger.js';
import { getSetting, setSetting } from '../lib/database.js';
import { copyFolderSync, removeDirSync } from '../src/utils/fileHelper.js';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

addCommand({
    pattern: 'update',
    alias: ['updatenow', 'updt', 'sync'],
    category: 'owner',
    desc: 'Update the bot to the latest version from GitHub.',
    handler: async (m, { conn, isOwner }) => {
        if (!isOwner) return m.reply(`${global.emojis.error} Owner only.`);

        const repo = global.githubRepo; // Defined in config.js
        if (!repo) return m.reply(`${global.emojis.error} GitHub repository not configured in config.js`);

        try {
            await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });
            await m.reply(`${global.emojis.waiting} *Checking for updates...*`);

            // 1. Check latest commit
            const { data: commitData } = await axios.get(`https://api.github.com/repos/${repo}/commits/main`);
            const latestHash = commitData.sha;
            const currentHash = await getSetting('latest_commit_hash');

            if (latestHash === currentHash) {
                await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
                return m.reply(`${global.emojis.success} *Mantra is already on the latest version!*`);
            }

            // 2. Prepare update details
            const author = commitData.commit.author.name;
            const date = new Date(commitData.commit.author.date).toLocaleString();
            const message = commitData.commit.message;

            await m.reply(
                `🔄 *Update Found! Starting upgrade...*\n\n` +
                `👤 *Author:* ${author}\n` +
                `📅 *Date:* ${date}\n` +
                `💬 *Message:* ${message}\n\n` +
                `⏳ _Downloading files..._`
            );

            // 3. Download Zip
            const zipPath = path.join(__dirname, '..', 'mantra_update.zip');
            const { data: zipData } = await axios.get(
                `https://github.com/${repo}/archive/main.zip`,
                { responseType: 'arraybuffer' }
            );
            fs.writeFileSync(zipPath, zipData);

            // 4. Extract
            const extractPath = path.join(__dirname, '..', 'temp_update');
            const zip = new AdmZip(zipPath);
            zip.extractAllTo(extractPath, true);

            // 5. Detect source folder (GitHub zips usually have a top-level dir like 'repo-main')
            const extractedDirs = fs.readdirSync(extractPath);
            const sourceDir = path.join(extractPath, extractedDirs[0]);
            const destDir = path.join(__dirname, '..');

            // 6. Copy files (exclude sensitive ones)
            const exclude = ['.env', 'database.json', 'session', 'node_modules', '.git'];
            copyFolderSync(sourceDir, destDir, exclude);

            // 7. Update hash and cleanup
            await setSetting('latest_commit_hash', latestHash);
            fs.unlinkSync(zipPath);
            removeDirSync(extractPath);

            await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
            await m.reply(`${global.emojis.success} *Update Complete!*\n\nBot will now restart to apply changes.`);

            log.action('Bot updated successfully', 'owner', { hash: latestHash });

            setTimeout(() => {
                process.exit(0);
            }, 3000);

        } catch (error) {
            log.error('Update failed', error, { repo });
            await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
            await m.reply(`${global.emojis.error} *Update Failed:*\n\n${error.message}\n\n_Please try redeploying manually if this persists._`);
        }
    }
});