/**
 * Web Uptime Server
 * A lightweight HTTP server (no external deps) for 24/7 hosting platforms.
 * Compatible with Render, Koyeb, Railway, Heroku, etc.
 */

const http = require('http');

const PORT = Number(process.env.PORT || 3000);
const BOT_NAME = process.env.BOT_NAME || 'MANTRA';
const START_TIME = new Date();

function uptime() {
    const ms = Date.now() - START_TIME.getTime();
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const parts = [];
    if (d) parts.push(`${d}d`);
    if (h) parts.push(`${h}h`);
    if (m) parts.push(`${m}m`);
    parts.push(`${sec}s`);
    return parts.join(' ');
}

function buildPage() {
    const up = uptime();
    const ts = new Date().toUTCString();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta http-equiv="refresh" content="30"/>
  <title>${BOT_NAME} — Status</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#0d0d0d;color:#e5e5e5;font-family:'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}
    .card{background:#1a1a2e;border:1px solid #25d366;border-radius:16px;padding:40px 48px;text-align:center;max-width:480px;width:90%;box-shadow:0 0 40px rgba(37,211,102,0.15)}
    .dot{display:inline-block;width:12px;height:12px;border-radius:50%;background:#25d366;box-shadow:0 0 10px #25d366;margin-right:8px;animation:pulse 1.5s infinite}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    h1{font-size:2rem;margin:16px 0 6px;color:#25d366}
    .sub{color:#aaa;font-size:.9rem;margin-bottom:28px}
    .stat{background:#12122a;border-radius:10px;padding:12px 20px;margin:8px 0;display:flex;justify-content:space-between}
    .stat-label{color:#888}
    .stat-value{color:#25d366;font-weight:600}
    footer{margin-top:28px;color:#555;font-size:.8rem}
  </style>
</head>
<body>
  <div class="card">
    <div><span class="dot"></span><strong>Online</strong></div>
    <h1>${BOT_NAME}</h1>
    <div class="sub">WhatsApp Bot — Powered by Mantra-Baileys</div>
    <div class="stat"><span class="stat-label">Uptime</span><span class="stat-value">${up}</span></div>
    <div class="stat"><span class="stat-label">Started</span><span class="stat-value">${START_TIME.toUTCString()}</span></div>
    <div class="stat"><span class="stat-label">Checked</span><span class="stat-value">${ts}</span></div>
    <div class="stat"><span class="stat-label">Status</span><span class="stat-value">✅ Running</span></div>
    <footer>Auto-refreshes every 30s</footer>
  </div>
</body>
</html>`;
}

const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/ping') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', uptime: uptime(), bot: BOT_NAME, time: new Date().toISOString() }));
        return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(buildPage());
});

server.listen(PORT, () => {
    console.log(`[server] Web uptime server running on port ${PORT}`);
});

server.on('error', (err) => {
    console.error('[server] HTTP server error:', err?.message || err);
});

module.exports = server;
