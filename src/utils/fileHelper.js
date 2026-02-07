import fs from 'fs';
import path from 'path';

/**
 * Recursively copy a folder
 * @param {string} source - Source directory
 * @param {string} target - Target directory
 * @param {string[]} exclude - Files/folders to exclude
 */
export function copyFolderSync(source, target, exclude = []) {
    if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
    }

    const files = fs.readdirSync(source);

    files.forEach((file) => {
        const sourcePath = path.join(source, file);
        const targetPath = path.join(target, file);

        // Check if excluded
        if (exclude.some(ex => file.includes(ex))) {
            return;
        }

        const stat = fs.lstatSync(sourcePath);

        if (stat.isDirectory()) {
            copyFolderSync(sourcePath, targetPath, exclude);
        } else {
            fs.copyFileSync(sourcePath, targetPath);
        }
    });
}

/**
 * Remove a directory recursively
 * @param {string} dirPath 
 */
export function removeDirSync(dirPath) {
    if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
    }
}

export default {
    copyFolderSync,
    removeDirSync
};
