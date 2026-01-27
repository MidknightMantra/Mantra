const fs = require('fs')
const chalk = require('chalk')

// Owner Settings
global.owner = ['254700000000'] 
global.packname = 'Mantra'
global.author = 'MidknightMantra'
global.sessionName = 'Mantra_Session' 

// --- PRIVACY SETTINGS ---
global.antiViewOnce = true // Set to false to disable auto-saving
global.alwaysOnline = true // true = Green Dot 24/7
// ------------------------

// ------------------------

// --- HARDCODED PREFIX ---
global.prefa = [','] 

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
