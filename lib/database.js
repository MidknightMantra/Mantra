import fs from 'fs';
import path from 'path';

const dbPath = './database.json';

// Initialize DB if it doesn't exist
if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ groups: {}, global: { sudo: false } }, null, 2));
}

export const getDB = () => {
    try {
        const data = fs.readFileSync(dbPath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        return { groups: {}, global: { sudo: false } };
    }
};

export const updateDB = (data) => {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

/** * GROUP SETTINGS HANDLERS 
 */

// Toggle Welcome
export const setWelcome = (jid, status) => {
    const db = getDB();
    if (!db.groups[jid]) db.groups[jid] = {};
    db.groups[jid].welcome = status;
    updateDB(db);
};

export const isWelcomeOn = (jid) => getDB().groups[jid]?.welcome || false;

// Toggle Anti-Link
export const setAntilink = (jid, status) => {
    const db = getDB();
    if (!db.groups[jid]) db.groups[jid] = {};
    db.groups[jid].antilink = status;
    updateDB(db);
};

export const isAntilinkOn = (jid) => getDB().groups[jid]?.antilink || false;

// Toggle Anti-Delete
export const setAntidelete = (jid, status) => {
    const db = getDB();
    if (!db.groups[jid]) db.groups[jid] = {};
    db.groups[jid].antidelete = status;
    updateDB(db);
};

export const isAntideleteOn = (jid) => getDB().groups[jid]?.antidelete || false;

/** * GLOBAL SETTINGS HANDLERS 
 */

export const setSudoMode = (status) => {
    const db = getDB();
    if (!db.global) db.global = {};
    db.global.sudo = status;
    updateDB(db);
};

export const isSudoMode = () => getDB().global?.sudo || false;