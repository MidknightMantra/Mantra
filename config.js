const fs = require('fs')
const chalk = require('chalk')

// Owner Settings
global.owner = ['254700000000'] 
global.packname = 'Mantra'
global.author = 'MidknightMantra'
global.sessionName = 'Mantra_Session' 

// --- HARDCODED PREFIX ---
// No Env Variables. Just comma.
global.prefa = [','] 
// ------------------------

// Session ID (Keep this as Env or it won't login)
global.sessionId = process.env.SESSION_ID

// Watch for file changes
let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Update'${__filename}'`))
    delete require.cache[file]
    require(file)
})
