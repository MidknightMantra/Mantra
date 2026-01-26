const fs = require('fs')
const chalk = require('chalk')

global.owner = ['254700000000'] // Put your number here
global.packname = 'Mantra'
global.author = 'MidknightMantra'
global.sessionName = 'Mantra_Session' // Session folder
global.prefa = ['.', '!', '/'] // Prefixes

// Watch for file changes
let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(chalk.redBright(`Update'${__filename}'`))
    delete require.cache[file]
    require(file)
})
