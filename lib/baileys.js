let cachedBaileys = null;

async function loadBaileys() {
    if (cachedBaileys) return cachedBaileys;
    cachedBaileys = await import('@whiskeysockets/baileys');
    // Ensure default export is handled correctly
    if (cachedBaileys.default && typeof cachedBaileys.default === 'function') {
        cachedBaileys = { ...cachedBaileys, makeWASocket: cachedBaileys.default };
    }
    return cachedBaileys;
}

function getBaileys() {
    if (!cachedBaileys) {
        throw new Error('Baileys has not been loaded yet. Call loadBaileys() first.');
    }
    return cachedBaileys;
}

module.exports = {
    loadBaileys,
    getBaileys
};
