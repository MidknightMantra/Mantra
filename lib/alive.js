import express from 'express';
import chalk from 'chalk';

const app = express();

// RAILWAY GIVES A PORT IN 'process.env.PORT'. WE MUST USE IT.
const port = process.env.PORT || 8080;

export function keepAlive() {
    app.get('/', (req, res) => {
        res.send('🔮 Mantra-MD is Running! 🔮');
    });

    // Listen on 0.0.0.0 to accept external connections
    app.listen(port, '0.0.0.0', () => {
        console.log(chalk.green(`🌐 Keep-Alive Server running on Port: ${port}`));
    });
}