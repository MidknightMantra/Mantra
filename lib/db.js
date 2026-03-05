const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'mantra.db');
const db = new Database(dbPath, {
    // verbose: console.log // uncomment for debugging
});

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');

// ----------------------------------------------------
// INITIALIZE TABLES
// ----------------------------------------------------
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        jid TEXT PRIMARY KEY,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 1,
        wallet INTEGER DEFAULT 0,
        bank INTEGER DEFAULT 0,
        role TEXT DEFAULT 'Peasant',
        last_daily INTEGER DEFAULT 0,
        last_mine INTEGER DEFAULT 0
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS warnings (
        jid TEXT,
        groupId TEXT,
        count INTEGER DEFAULT 0,
        reason TEXT,
        updated_at INTEGER,
        PRIMARY KEY (jid, groupId)
    )
`);

console.log('[sqlite] Database initialized successfully.');

// ----------------------------------------------------
// USER/ECONOMY FUNCTIONS
// ----------------------------------------------------
const getUserStmt = db.prepare('SELECT * FROM users WHERE jid = ?');
const insertUserStmt = db.prepare('INSERT INTO users (jid) VALUES (?)');

function getUser(jid) {
    let user = getUserStmt.get(jid);
    if (!user) {
        insertUserStmt.run(jid);
        user = getUserStmt.get(jid);
    }
    return user;
}

function updateUser(jid, updates = {}) {
    const user = getUser(jid);
    const updated = { ...user, ...updates };

    const keys = Object.keys(updated).filter(k => k !== 'jid');
    const setClause = keys.map(k => `${k} = @${k}`).join(', ');

    if (!setClause) return user;

    const stmt = db.prepare(`UPDATE users SET ${setClause} WHERE jid = @jid`);
    stmt.run(updated);

    return updated;
}

function addXP(jid, amount) {
    const user = getUser(jid);
    let newXp = user.xp + amount;
    let newLevel = user.level;

    // Simple leveling curve: NextLevel = Level * 100
    while (newXp >= newLevel * 100) {
        newXp -= newLevel * 100;
        newLevel++;
    }

    return updateUser(jid, { xp: newXp, level: newLevel });
}

function getLeaderboard(limit = 10, offset = 0) {
    return db.prepare('SELECT * FROM users ORDER BY (wallet + bank) DESC, level DESC LIMIT ? OFFSET ?').all(limit, offset);
}

// ----------------------------------------------------
// ADMIN/WARNING FUNCTIONS
// ----------------------------------------------------
const getWarnStmt = db.prepare('SELECT * FROM warnings WHERE jid = ? AND groupId = ?');
const insertWarnStmt = db.prepare(`INSERT INTO warnings (jid, groupId, count, reason, updated_at) VALUES (?, ?, 0, '', ?)`);

function getWarning(jid, groupId) {
    let warn = getWarnStmt.get(jid, groupId);
    if (!warn) {
        insertWarnStmt.run(jid, groupId, Date.now());
        warn = getWarnStmt.get(jid, groupId);
    }
    return warn;
}

function addWarning(jid, groupId, reason = "No reason provided") {
    const warn = getWarning(jid, groupId);
    const newCount = warn.count + 1;

    db.prepare('UPDATE warnings SET count = ?, reason = ?, updated_at = ? WHERE jid = ? AND groupId = ?')
        .run(newCount, reason, Date.now(), jid, groupId);

    return newCount;
}

function removeWarning(jid, groupId, amount = 1) {
    const warn = getWarning(jid, groupId);
    const newCount = Math.max(0, warn.count - amount);

    db.prepare('UPDATE warnings SET count = ?, updated_at = ? WHERE jid = ? AND groupId = ?')
        .run(newCount, Date.now(), jid, groupId);

    return newCount;
}

function resetWarnings(jid, groupId) {
    db.prepare('DELETE FROM warnings WHERE jid = ? AND groupId = ?').run(jid, groupId);
    return 0;
}

module.exports = {
    db,
    getUser,
    updateUser,
    addXP,
    getLeaderboard,
    getWarning,
    addWarning,
    removeWarning,
    resetWarnings
};
