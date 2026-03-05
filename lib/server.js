const express = require('express');
const path = require('path');
const { db } = require('./db');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const BOT_NAME = process.env.BOT_NAME || 'MANTRA';
const START_TIME = new Date();

// Middleware
app.use(express.static(path.join(__dirname, '..', 'public')));

// Helper for uptime
function getUptime() {
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

// API Endpoints for the Dashboard
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: getUptime() });
});

app.get('/api/stats', (req, res) => {
  try {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalWealth = db.prepare('SELECT SUM(wallet + bank) as total FROM users').get().total || 0;
    const warnCount = db.prepare('SELECT COUNT(*) as count FROM warnings').get().count;

    res.json({
      botName: BOT_NAME,
      uptime: getUptime(),
      userCount,
      totalWealth: totalWealth.toLocaleString(),
      warnCount,
      startTime: START_TIME.toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Fallback to index.html
app.get('(.*)', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const server = app.listen(PORT, () => {
  console.log(`[server] Express dashboard running on port ${PORT}`);
});

module.exports = server;
