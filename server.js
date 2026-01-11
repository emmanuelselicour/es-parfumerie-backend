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

// Middleware CORS
const allowedOrigins = [
    'https://emmanuelselicour.github.io',
    'http://localhost:8000', 
    'https://es-parfumerie-api.onrender.com',
    'http://localhost:3000',
    'http://localhost:5500',
    'https://es-parfumerie-api.onrender.com',
    'https://admin.es-parfumerie-api.onrender.com'
];

app.use(cors({
    origin: function (origin, callback) {
        // Autoriser les requêtes sans origin (comme les apps mobiles ou curl)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('CORS bloqué pour origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With', 'Accept']
}));

// Headers CORS supplémentaires
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware SIMPLIFIÉ
app.use(session({
    name: 'esparfumerie.sid',
    secret: process.env.SESSION_SECRET || 'votre_secret_tres_long_et_securise_changez_moi_123456789',
    resave: true,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        secure: false, // false pour testing, mettez true en production avec HTTPS
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 heures
        path: '/'
    },
    rolling: true
}));

// Middleware de logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Session ID:', req.sessionID);
    console.log('Session data:', req.session);
    next();
});

// Set view engine pour le panel admin
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes API
app.use('/api/products', productsRouter);
app.use('/api/auth', authRouter);

// ROUTE DE LOGIN DIRECT (NOUVELLE)
app.post('/admin/direct-login', (req, res) => {
    const { username, password } = req.body;
    
    console.log('Direct login attempt:', { username, password });
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
    }
    
    // Vérification simple
    if (username === 'admin' && password === 'admin123') {
        req.session.user = {
            id: 1,
            username: 'admin',
            email: 'admin@esparfumerie.com',
            role: 'admin'
        };
        
        console.log('Session créée:', req.session.user);
        
        return res.json({ 
            success: true, 
            redirect: '/admin',
            message: 'Connexion réussie',
            user: req.session.user
        });
    }
    
    res.status(401).json({ error: 'Identifiants incorrects' });
});

// ROUTE LOGIN SIMPLE (HTML)
app.get('/admin/simple-login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>ES Parfumerie - Admin Login</title>
            <style>
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0;
                    padding: 20px;
                }
                .login-container {
                    background: white;
                    padding: 40px;
                    border-radius: 15px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                    width: 100%;
                    max-width: 400px;
                }
                h1 {
                    color: #333;
                    text-align: center;
                    margin-bottom: 30px;
                    font-size: 28px;
                }
                .logo {
                    text-align: center;
                    color: #8a2be2;
                    font-size: 24px;
                    font-weight: bold;
                    margin-bottom: 20px;
                }
                .input-group {
                    margin-bottom: 20px;
                }
                label {
                    display: block;
                    margin-bottom: 8px;
                    color: #555;
                    font-weight: 500;
                }
                input {
                    width: 100%;
                    padding: 12px 15px;
                    border: 2px solid #e1e1e1;
                    border-radius: 8px;
                    font-size: 16px;
                    transition: border-color 0.3s;
                }
                input:focus {
                    outline: none;
                    border-color: #8a2be2;
                }
                .login-btn {
                    width: 100%;
                    background: #8a2be2;
                    color: white;
                    border: none;
                    padding: 14px;
                    border-radius: 8px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background 0.3s, transform 0.2s;
                }
                .login-btn:hover {
                    background: #7b1fa2;
                    transform: translateY(-2px);
                }
                .login-btn:active {
                    transform: translateY(0);
                }
                .error {
                    color: #ff4757;
                    text-align: center;
                    margin-top: 15px;
                    font-size: 14px;
                }
                .info {
                    background: #fff3cd;
                    border: 1px solid #ffeaa7;
                    color: #856404;
                    padding: 12px;
                    border-radius: 8px;
                    margin-top: 20px;
                    font-size: 14px;
                    text-align: center;
                }
                .loader {
                    display: none;
                    text-align: center;
                    margin-top: 10px;
                }
                .spinner {
                    border: 3px solid #f3f3f3;
                    border-top: 3px solid #8a2be2;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    animation: spin 1s linear infinite;
                    display: inline-block;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        </head>
        <body>
            <div class="login-container">
                <div class="logo">ES PARFUMERIE</div>
                <h1>Panel Administrateur</h1>
                
                <div class="input-group">
                    <label for="username">Nom d'utilisateur</label>
                    <input type="text" id="username" placeholder="Entrez votre nom d'utilisateur" value="admin">
                </div>
                
                <div class="input-group">
                    <label for="password">Mot de passe</label>
                    <input type="password" id="password" placeholder="Entrez votre mot de passe" value="admin123">
                </div>
                
                <button class="login-btn" onclick="login()">Se connecter</button>
                
                <div class="loader" id="loader">
                    <div class="spinner"></div>
                    <span>Connexion en cours...</span>
                </div>
                
                <div class="error" id="error"></div>
                
                <div class="info">
                    <strong>Identifiants par défaut :</strong><br>
                    admin / admin123<br>
                    <small>Changez-les après votre première connexion</small>
                </div>
            </div>
            
            <script>
            async function login() {
                const username = document.getElementById('username').value;
                const password = document.getElementById('password').value;
                const errorDiv = document.getElementById('error');
                const loader = document.getElementById('loader');
                const loginBtn = document.querySelector('.login-btn');
                
                // Reset
                errorDiv.textContent = '';
                loginBtn.disabled = true;
                loader.style.display = 'block';
                
                try {
                    // Essayer la connexion directe
                    const response = await fetch('/admin/direct-login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({ username, password })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok && data.success) {
                        console.log('Login réussi:', data);
                        // Attendre un peu pour que la session soit sauvegardée
                        setTimeout(() => {
                            window.location.href = '/admin';
                        }, 500);
                    } else {
                        errorDiv.textContent = data.error || 'Identifiants incorrects';
                        loginBtn.disabled = false;
                        loader.style.display = 'none';
                    }
                } catch (error) {
                    console.error('Erreur de connexion:', error);
                    errorDiv.textContent = 'Erreur de connexion au serveur. Essayez de rafraîchir la page.';
                    loginBtn.disabled = false;
                    loader.style.display = 'none';
                    
                    // Fallback: essayer avec les paramètres URL
                    setTimeout(() => {
                        window.location.href = '/admin?username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password);
                    }, 2000);
                }
            }
            
            // Permettre Enter pour se connecter
            document.getElementById('password').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    login();
                }
            });
            
            // Auto-login pour testing (optionnel)
            // setTimeout(login, 1000);
            </script>
        </body>
        </html>
    `);
});

// Route admin avec fallback GET parameters
app.get('/admin', (req, res) => {
    console.log('=== ADMIN ACCESS ===');
    console.log('Session:', req.session.user);
    console.log('Query params:', req.query);
    
    // Fallback: accepter login via paramètres GET (pour debug)
    if (!req.session.user && req.query.username && req.query.password) {
        if (req.query.username === 'admin' && req.query.password === 'admin123') {
            req.session.user = {
                id: 1,
                username: 'admin',
                email: 'admin@esparfumerie.com',
                role: 'admin'
            };
            console.log('User set via query params');
        }
    }
    
    if (!req.session.user) {
        console.log('No user session, redirecting to login');
        return res.redirect('/admin/simple-login');
    }
    
    console.log('Rendering dashboard for:', req.session.user.username);
    res.render('dashboard', { user: req.session.user });
});

// Route login originale (conservée pour compatibilité)
app.get('/admin/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/admin');
    }
    res.redirect('/admin/simple-login');
});

// Route de débug
app.get('/debug', (req, res) => {
    res.json({
        session: {
            id: req.sessionID,
            user: req.session.user,
            cookie: req.session.cookie
        },
        headers: {
            host: req.headers.host,
            origin: req.headers.origin,
            cookie: req.headers.cookie
        },
        app: {
            env: process.env.NODE_ENV,
            sessionSecretSet: !!process.env.SESSION_SECRET,
            nodeEnv: process.env.NODE_ENV
        },
        timestamp: new Date().toISOString()
    });
});

// Route de statut de session
app.get('/session-status', (req, res) => {
    res.json({
        loggedIn: !!req.session.user,
        user: req.session.user,
        sessionId: req.sessionID
    });
});

// Route pour forcer le login (debug)
app.get('/force-login', (req, res) => {
    req.session.user = {
        id: 1,
        username: 'admin',
        email: 'admin@esparfumerie.com',
        role: 'admin'
    };
    res.redirect('/admin');
});

// Route pour clear session
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/simple-login');
});

// Route pour servir les images uploadées
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Route de santé
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        sessionActive: !!req.session.user,
        environment: process.env.NODE_ENV,
        memoryUsage: process.memoryUsage()
    });
});

// Route racine
app.get('/', (req, res) => {
    res.json({
        message: 'ES Parfumerie API',
        version: '1.0.0',
        adminPanel: '/admin/simple-login',
        apiDocs: {
            products: '/api/products',
            auth: '/api/auth'
        },
        debug: '/debug',
        sessionStatus: '/session-status'
    });
});

// Route de test de connexion simple
app.get('/test-auth', (req, res) => {
    if (req.session.user) {
        res.json({ 
            authenticated: true, 
            user: req.session.user,
            sessionId: req.sessionID 
        });
    } else {
        res.json({ 
            authenticated: false,
            message: 'Non authentifié',
            loginUrl: '/admin/simple-login'
        });
    }
});

// Gestion des erreurs 404
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Route non trouvée',
        availableRoutes: {
            admin: '/admin/simple-login',
            api: '/api/products',
            health: '/health',
            debug: '/debug'
        }
    });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
    console.error('❌ Erreur globale:', err);
    res.status(500).json({ 
        error: 'Erreur interne du serveur',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Initialiser la base de données et démarrer le serveur
initializeDatabase().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`
        ╔══════════════════════════════════════════════════════╗
        ║           ES PARFUMERIE API - DÉMARRÉE              ║
        ╠══════════════════════════════════════════════════════╣
        ║ Port: ${PORT}                                         ║
        ║ Environnement: ${process.env.NODE_ENV || 'development'} ║
        ║                                                      ║
        ║ 📍 URLs importantes:                                 ║
        ║                                                      ║
        ║ 👑 Panel Admin:    /admin/simple-login               ║
        ║ 📦 API Produits:   /api/products                     ║
        ║ 🔐 Test Auth:      /test-auth                        ║
        ║ 🩺 Santé:          /health                           ║
        ║ 🐛 Debug:          /debug                            ║
        ║                                                      ║
        ║ 🔑 Identifiants par défaut:                          ║
        ║    Username: admin                                   ║
        ║    Password: admin123                                ║
        ║                                                      ║
        ╚══════════════════════════════════════════════════════╝
        `);
    });
}).catch(err => {
    console.error('❌ Erreur d\'initialisation:', err);
    process.exit(1);
});
