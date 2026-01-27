const fs = require('fs')
const chalk = require('chalk')

// Owner Settings
global.owner = ['254700000000'] 
global.packname = 'Mantra'
global.author = 'MidknightMantra'
global.sessionName = 'Mantra_Session' 

// --- PREFIX FIX ---
// This logic prevents empty strings "" from becoming prefixes
const envPrefix = process.env.PREFIX
global.prefa = (envPrefix && envPrefix.trim().length > 0) 
    ? envPrefix.split(',').map(p => p.trim()) 
    : ['.', '!', '/']
// ------------------

// Session ID
global.sessionId = process.env.SESSION_ID

// Watch for file changes
let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Update'${__filename}'`))
    delete require.cache[file]
    require(file)
})
