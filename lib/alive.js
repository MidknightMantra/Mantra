import express from 'express';
import chalk from 'chalk';

const app = express();
const port = process.env.PORT || 8080;

export function keepAlive() {
    app.get('/', (req, res) => {
        res.send('🔮 Mantra-MD is Running! 🔮');
    });

    app.listen(port, () => {
        console.log(chalk.green(`🌐 Server acts as Keep-Alive on port ${port}`));
    });
}