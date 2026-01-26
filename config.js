const fs = require('fs')
const chalk = require('chalk')

global.owner = ['254700000000'] 
global.packname = 'Mantra'
global.author = 'MidknightMantra'
global.sessionName = 'Mantra_Session' 
global.prefa = ['.', '!', '/'] 

// PASTE YOUR SESSION ID BELOW (OR USE ENV VAR)
global.sessionId = process.env.SESSION_ID || '' 

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Update'${__filename}'`))
    delete require.cache[file]
    require(file)
})
