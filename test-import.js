import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testImport(name) {
    try {
        console.log(`Testing ${name}...`);
        await import(`./plugins/${name}`);
        console.log(`✅ ${name} loaded successfully.`);
    } catch (e) {
        console.error(`❌ ${name} failed:`, e);
    }
}

async function run() {
    await testImport('owner.js');
    await testImport('group-manage.js');
    await testImport('converters.js');
    await testImport('search-advanced.js');
    await testImport('downloader.js');
    await testImport('ai.js');
}

run();
