import { watchFile, unwatchFile } from 'fs'
import { fileURLToPath } from 'url'

// --- GLOBAL SETTINGS ---
global.owner = ['254700000000'] // Your Number
global.packname = 'Mantra'
global.author = 'Bot'
global.sessionName = 'session'
global.prefa = [',', '!'] // Prefixes
global.sessionId = process.env.SESSION_ID || "" // For Railway

// --- PRIVACY & FEATURES ---
global.antiViewOnce = true
global.antiDelete = true
global.alwaysOnline = true
global.autoStatusRead = true 

// --- RELOAD LOGIC ---
let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
    unwatchFile(file)
    console.log('Update config.js')
    import(`${file}?update=${Date.now()}`)
})
