const fs = require('fs')
const chalk = require('chalk')

// Owner Settings
global.owner = ['254700000000'] 
global.packname = 'Mantra'
global.author = 'MidknightMantra'
global.sessionName = 'Mantra_Session' 

// Prefix Logic (Environment Variable > Default)
// In Railway, set PREFIX to: .,#,!
global.prefa = process.env.PREFIX ? process.env.PREFIX.split(',') : ['.', '!', '/']

// Session ID Logic (Strictly Environment Variable)
// You MUST set SESSION_ID in Railway/Heroku Variables
global.sessionId = process.env.SESSION_ID

// Watch for file changes
let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Update'${__filename}'`))
    delete require.cache[file]
    require(file)
})
