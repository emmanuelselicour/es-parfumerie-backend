// session-store.js - Sessions persistantes dans un fichier
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const path = require('path');
const fs = require('fs');

// Créer le dossier sessions s'il n'existe pas
const sessionsDir = path.join(__dirname, 'sessions');
if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
}

const fileStoreOptions = {
    path: sessionsDir,
    ttl: 24 * 60 * 60, // 24 heures en secondes
    retries: 0,
    fileExtension: '.json'
};

module.exports = session({
    store: new FileStore(fileStoreOptions),
    secret: process.env.SESSION_SECRET || 'votre_secret_tres_long_et_securise_changez_moi_123456789',
    resave: true,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 heures
        path: '/'
    },
    rolling: true
});
