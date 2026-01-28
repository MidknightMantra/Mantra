import fs from 'fs';
import path from 'path';

const dbPath = './database.json';

// Initialize DB if it doesn't exist
if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ groups: {} }, null, 2));
}

export const getDB = () => {
    try {
        const data = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return { groups: {} };
    }
};

export const updateDB = (data) => {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

/** * SETTINGS HANDLERS 
 */

// Toggle Welcome
export const setWelcome = (jid, status) => {
    const db = getDB();
    if (!db.groups[jid]) db.groups[jid] = {};
    db.groups[jid].welcome = status;
    updateDB(db);
};

export const isWelcomeOn = (jid) => {
    const db = getDB();
    return db.groups[jid]?.welcome || false;
};

// Toggle Anti-Link
export const setAntilink = (jid, status) => {
    const db = getDB();
    if (!db.groups[jid]) db.groups[jid] = {};
    db.groups[jid].antilink = status;
    updateDB(db);
};

export const isAntilinkOn = (jid) => {
    const db = getDB();
    return db.groups[jid]?.antilink || false;
};