import { watchFile, unwatchFile } from 'fs'
import { fileURLToPath } from 'url'

global.owner = ['254732647560'] // Your number (from logs)
global.packname = 'Mantra'
global.author = 'MidknightMantra'
global.prefa = [',', '!'] // Your active prefixes
global.sessionId = process.env.SESSION_ID || ""

global.alwaysOnline = true      
global.antiDelete = true        
global.antiViewOnce = true      
global.autoStatusRead = true    

let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
    unwatchFile(file)
    console.log('Update config.js')
    import(`${file}?update=${Date.now()}`)
})
