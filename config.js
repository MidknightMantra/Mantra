const fs = require('fs')

global.owner = ['254700000000'] // Put your number here
global.prefix = '.'
global.sessionName = 'mantra-session'

// Hot Reload mechanism for config.js
let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(`Update ${__filename}`)
    delete require.cache[file]
    require(file)
})
