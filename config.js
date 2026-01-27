import { watchFile, unwatchFile } from 'fs'
import { fileURLToPath } from 'url'

global.owner = ['254732647560'] // Bot JID number
global.packname = 'Mantra'
global.author = 'MidknightMantra'
global.prefa = [',', '!'] 

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
