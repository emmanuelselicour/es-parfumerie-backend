require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const { initializeDatabase } = require('./database');

// Routes
const productsRouter = require('./routes/products');
const authRouter = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware CORS CORRIGÉ
app.use(cors({
    origin: [
        'https://emmanuelselicour.github.io',
        'http://localhost:8000', 
        'https://es-parfumerie-api.onrender.com',
        'http://localhost:3000',
        'http://localhost:5500'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With']
}));

// Middleware pour headers CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Origin', req.headers.origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware CORRIGÉ
app.use(session({
    name: 'es-parfumerie.sid',
    secret: process.env.SESSION_SECRET || 'votre_secret_session_tres_long_et_securise_123!',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 heures
    }
}));

// Middleware pour logger les sessions (debug)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Session:`, req.session.user ? 'User logged in' : 'No user');
    next();
});

// Set view engine pour le panel admin
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes API
app.use('/api/products', productsRouter);
app.use('/api/auth', authRouter);

// Routes pour le panel admin
app.get('/admin', (req, res) => {
    console.log('Accessing /admin, user:', req.session.user);
    if (!req.session.user) {
        return res.redirect('/admin/login');
    }
    res.render('dashboard', { user: req.session.user });
});

app.get('/admin/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/admin');
    }
    res.render('login');
});

// Page de login alternative (pour debug)
app.get('/admin-login-test', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Test Login</title>
            <style>
                body { font-family: Arial; padding: 20px; }
                input, button { padding: 10px; margin: 5px; }
            </style>
        </head>
        <body>
            <h1>Test Login Admin</h1>
            <input type="text" id="username" value="admin" placeholder="Username"><br>
            <input type="password" id="password" value="admin123" placeholder="Password"><br>
            <button onclick="login()">Login</button>
            <div id="result"></div>
            
            <script>
            async function login() {
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                
                const resultDiv = document.getElementById('result');
                resultDiv.innerHTML = 'Connexion en cours...';
                
                try {
                    const response = await fetch('/api/auth/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        credentials: 'include',
                        body: JSON.stringify({ username, password })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        resultDiv.innerHTML = '<span style="color: green">✓ Connecté! Redirection...</span>';
                        setTimeout(() => {
                            window.location.href = '/admin';
                        }, 1000);
                    } else {
                        resultDiv.innerHTML = '<span style="color: red">✗ Erreur: ' + (data.error || 'Unknown error') + '</span>';
                    }
                } catch (error) {
                    resultDiv.innerHTML = '<span style="color: red">✗ Erreur réseau: ' + error.message + '</span>';
                }
            }
            
            // Tester la session
            async function checkSession() {
                try {
                    const response = await fetch('/api/auth/check', {
                        credentials: 'include'
                    });
                    const data = await response.json();
                    console.log('Session check:', data);
                } catch (error) {
                    console.error('Session check error:', error);
                }
            }
            
            // Vérifier la session au chargement
            window.onload = checkSession;
            </script>
        </body>
        </html>
    `);
});

// Route pour vérifier la configuration
app.get('/debug', (req, res) => {
    res.json({
        session: req.session,
        cookies: req.cookies,
        headers: req.headers,
        env: {
            NODE_ENV: process.env.NODE_ENV,
            SESSION_SECRET_SET: !!process.env.SESSION_SECRET
        }
    });
});

// Route pour servir les images uploadées
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Route de santé
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        session_active: !!req.session.user,
        environment: process.env.NODE_ENV
    });
});

// Route racine
app.get('/', (req, res) => {
    res.json({
        message: 'ES Parfumerie API',
        version: '1.0.0',
        endpoints: {
            api: '/api/products',
            admin: '/admin',
            admin_test: '/admin-login-test',
            health: '/health',
            debug: '/debug'
        },
        documentation: 'Accédez à /admin pour le panel administrateur'
    });
});

// Gestion des erreurs 404
app.use((req, res) => {
    res.status(404).json({ error: 'Route non trouvée' });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
    console.error('Erreur globale:', err);
    res.status(500).json({ 
        error: 'Erreur interne du serveur',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Initialiser la base de données et démarrer le serveur
initializeDatabase().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ Serveur démarré sur le port ${PORT}`);
        console.log(`🌐 API disponible sur: http://localhost:${PORT}/api/products`);
        console.log(`👨‍💼 Panel admin: http://localhost:${PORT}/admin`);
        console.log(`🔧 Test login: http://localhost:${PORT}/admin-login-test`);
        console.log(`⚠️  Mode: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🔐 Session secret set: ${!!process.env.SESSION_SECRET}`);
    });
}).catch(err => {
    console.error('❌ Erreur d\'initialisation:', err);
    process.exit(1);
});
