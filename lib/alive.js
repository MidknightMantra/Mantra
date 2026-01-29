import express from 'express';
import chalk from 'chalk';

const app = express();
const startTime = Date.now();

// RAILWAY GIVES A PORT IN 'process.env.PORT'. WE MUST USE IT.
const port = process.env.PORT || 8080;

/**
 * Keep-Alive Server for Railway/Render/Heroku
 * Prevents the service from sleeping by exposing HTTP endpoints
 */
export function keepAlive() {
    // 1. Main Health Check Endpoint (for UptimeRobot, cron-job.org, etc.)
    app.get('/', (req, res) => {
        const uptime = Math.floor((Date.now() - startTime) / 1000);
        const memUsage = process.memoryUsage();

        res.status(200).json({
            status: 'online',
            service: 'Mantra-MD',
            uptime: `${uptime}s`,
            memory: {
                rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
                heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`
            },
            timestamp: new Date().toISOString()
        });
    });

    // 2. Simple Ping Endpoint (faster response for frequent pings)
    app.get('/ping', (req, res) => {
        res.status(200).send('pong');
    });

    // 3. Health Check Endpoint (Railway-specific)
    app.get('/health', (req, res) => {
        res.status(200).json({
            status: 'healthy',
            uptime: Math.floor((Date.now() - startTime) / 1000)
        });
    });

    // 4. Pretty HTML Status Page
    app.get('/status', (req, res) => {
        const uptime = Math.floor((Date.now() - startTime) / 1000);
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = uptime % 60;

        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Mantra-MD Status</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                    }
                    .container {
                        text-align: center;
                        background: rgba(255,255,255,0.1);
                        padding: 40px;
                        border-radius: 20px;
                        backdrop-filter: blur(10px);
                    }
                    .status { font-size: 3em; margin-bottom: 20px; }
                    .uptime { font-size: 1.5em; opacity: 0.9; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="status">🔮 Mantra-MD</div>
                    <div class="uptime">✅ Online</div>
                    <div class="uptime">⏱️ ${hours}h ${minutes}m ${seconds}s</div>
                </div>
            </body>
            </html>
        `);
    });

    // Listen on 0.0.0.0 to accept external connections from Railway/Render
    app.listen(port, '0.0.0.0', () => {
        console.log(chalk.green(`🌐 Keep-Alive Server running on Port: ${port}`));
        console.log(chalk.cyan(`📍 Health Check: http://localhost:${port}/`));
        console.log(chalk.cyan(`📍 Status Page: http://localhost:${port}/status`));
    });
}