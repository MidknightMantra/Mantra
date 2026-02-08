import { addCommand } from '../lib/plugins.js';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import AdmZip from 'adm-zip';

const execAsync = util.promisify(exec);
const REPO_URL = 'https://github.com/MidknightMantra/Mantra'; // Update this to your actual repo

addCommand({
    pattern: 'update',
    alias: ['upgrade', 'updatenow', 'gitpull'],
    desc: 'Update the bot to the latest version',
    category: 'owner',
    handler: async (m, { conn, isOwner }) => {
        if (!isOwner) return m.reply('❌ This command is only for the bot owner.');

        await m.react('⏳');

        try {
            // Check if git is installed and valid .git exists
            const isGit = fs.existsSync('.git');

            if (isGit) {
                await handleGitUpdate(m);
            } else {
                await handleZipUpdate(m);
            }

        } catch (error) {
            console.error('Update Error:', error);
            await m.react('❌');
            return m.reply(`❌ Update Failed:\n\n${error.message}`);
        }
    }
});

/**
 * Handle update via Git
 */
async function handleGitUpdate(m) {
    await m.reply('🔍 Checking for updates via Git...');

    try {
        const { stdout: status } = await execAsync('git fetch');
        const { stdout: log } = await execAsync('git log HEAD..origin/main --oneline');

        if (!log) {
            await m.react('✅');
            return m.reply('✅ Bot is already up to date.');
        }

        await m.reply(`🔄 Updates available:\n\n${log}\n\nInstalling updates...`);

        await execAsync('git pull');
        await m.reply('✅ Update installed successfully! Restarting bot...');

        // Wait for message to send
        setTimeout(() => {
            process.exit(0); // PM2/Docker will restart it
        }, 1000);

    } catch (error) {
        throw new Error(`Git Error: ${error.message}`);
    }
}

/**
 * Handle update via Zip download (Fallback)
 */
async function handleZipUpdate(m) {
    await m.reply('🔍 Git not found. Checking for updates via API...');

    // 1. Get latest commit
    const { data: commitData } = await axios.get(`https://api.github.com/repos/MidknightMantra/Mantra/commits/main`);
    const latestHash = commitData.sha;

    // Check stored hash (simple check)
    let currentHash = '';
    const hashFile = '.update_hash';
    if (fs.existsSync(hashFile)) {
        currentHash = fs.readFileSync(hashFile, 'utf-8').trim();
    }

    if (currentHash === latestHash) {
        await m.react('✅');
        return m.reply('✅ Bot is already up to date (Version matched via Hash).');
    }

    await m.reply(`🔄 Update detected!\n\n📅 Date: ${commitData.commit.author.date}\n💬 Message: ${commitData.commit.message}\n\nDownloading and extracting...`);

    // 2. Download Zip
    const zipPath = 'update.zip';
    const writer = fs.createWriteStream(zipPath);
    const response = await axios({
        url: `${REPO_URL}/archive/main.zip`,
        method: 'GET',
        responseType: 'stream'
    });

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });

    // 3. Extract
    const zip = new AdmZip(zipPath);
    const extractEntryTo = (entry, targetPath) => {
        // Remove the top-level directory (e.g. Mantra-main/)
        const parts = entry.entryName.split('/');
        parts.shift(); // Remove root dir
        if (parts.length === 0) return;

        const relativePath = parts.join('/');
        const fullPath = path.join(targetPath, relativePath);

        // Don't overwrite config/envs
        if (entry.entryName.includes('.env') || entry.entryName.includes('session/')) {
            return;
        }

        if (entry.isDirectory) {
            if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
        } else {
            const content = entry.getData();
            fs.writeFileSync(fullPath, content);
        }
    };

    zip.getEntries().forEach(entry => extractEntryTo(entry, process.cwd()));

    // 4. Cleanup and Save Hash
    fs.unlinkSync(zipPath);
    fs.writeFileSync(hashFile, latestHash);

    await m.reply('✅ Update complete! Restarting bot...');

    setTimeout(() => {
        process.exit(0);
    }, 1000);
}
