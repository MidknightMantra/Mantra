const express = require('express')
const app = express()

function keepAlive() {
    const port = process.env.PORT || 3000
    
    app.get('/', (req, res) => {
        res.send('Mantra is Running 🟢')
    })

    app.listen(port, () => {
        console.log(`Mantra Server running on Port: ${port}`)
    })
}

module.exports = keepAlive
