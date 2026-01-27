import { watchFile, unwatchFile } from 'fs'
import { fileURLToPath } from 'url'

// --- GLOBAL SETTINGS ---
global.owner = ['254732647560'] // Updated to match your Bot JID from logs
global.packname = 'Mantra'
global.author = 'MidknightMantra'
global.sessionName = 'session'
global.prefa = [',', '!'] // Your active prefixes
global.sessionId = process.env.SESSION_ID || ""

// --- BIG BOY FEATURES ---
global.alwaysOnline = true      
global.antiDelete = true        
global.antiViewOnce = true      
global.autoStatusRead = true    
global.autoStatusSave = false    

// --- RELOAD LOGIC ---
let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
    unwatchFile(file)
    console.log('Update config.js')
    import(`${file}?update=${Date.now()}`)
})
