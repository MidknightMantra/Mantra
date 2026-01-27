import { watchFile, unwatchFile } from 'fs'
import { fileURLToPath } from 'url'

// --- GLOBAL SETTINGS ---
global.owner = ['254700000000'] // Put your number here
global.packname = 'Mantra'
global.author = 'MidknightMantra'
global.sessionName = 'session'
global.prefa = [',' , '!']
global.sessionId = process.env.SESSION_ID || ""

// --- BIG BOY FEATURES ---
global.alwaysOnline = true      // 🟢 Green dot 24/7
global.antiDelete = true        // 🗑️ Catch deleted messages
global.antiViewOnce = true      // 🕵️ Save ViewOnce media
global.autoStatusRead = true    // 👀 Appear in their view list
global.autoStatusSave = false    // 💾 Save ALL status medias to your Saved Messages

// --- RELOAD LOGIC ---
let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
    unwatchFile(file)
    console.log('Update config.js')
    import(`${file}?update=${Date.now()}`)
})
