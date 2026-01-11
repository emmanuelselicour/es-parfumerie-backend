// keep-alive.js - Garde Render actif
const https = require('https');
const http = require('http');

function pingServer() {
    const urls = [
        'https://es-parfumerie-api.onrender.com/health',
        'https://es-parfumerie-api.onrender.com/'
    ];
    
    urls.forEach(url => {
        const protocol = url.startsWith('https') ? https : http;
        
        protocol.get(url, (res) => {
            console.log(`✅ Keep-alive ping to ${url}: ${res.statusCode}`);
        }).on('error', (err) => {
            console.log(`❌ Keep-alive error for ${url}:`, err.message);
        });
    });
}

// Ping toutes les 10 minutes (600000 ms)
setInterval(pingServer, 10 * 60 * 1000);

// Premier ping immédiat
pingServer();

console.log('🔄 Keep-alive service started');
