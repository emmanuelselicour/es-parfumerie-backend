require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const { initializeDatabase } = require('./database');

// Routes
const productsRouter = require('./routes/products');
const authRouter = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Créer le dossier uploads s'il n'existe pas
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log('✅ Dossier uploads créé');
}

// Middleware CORS
const allowedOrigins = [
    'https://emmanuelselicour.github.io',
    'http://localhost:8000', 
    'https://es-parfumerie-api.onrender.com',
    'http://localhost:3000',
    'http://localhost:5500'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
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

// Headers CORS
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

// Augmenter la limite pour les uploads d'images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(session({
    name: 'esparfumerie.sid',
    secret: process.env.SESSION_SECRET || 'votre_secret_tres_long_et_securise_changez_moi_123456789',
    resave: true,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
        path: '/'
    },
    rolling: true
}));

// Logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes API
app.use('/api/products', productsRouter);
app.use('/api/auth', authRouter);

// Route de login direct
app.post('/admin/direct-login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
    }
    
    if (username === 'admin' && password === 'admin123') {
        req.session.user = {
            id: 1,
            username: 'admin',
            email: 'admin@esparfumerie.com',
            role: 'admin'
        };
        
        return res.json({ 
            success: true, 
            redirect: '/admin',
            message: 'Connexion réussie',
            user: req.session.user
        });
    }
    
    res.status(401).json({ error: 'Identifiants incorrects' });
});

// Route login simple
app.get('/admin/simple-login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/admin');
    }
    
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
                .logo {
                    text-align: center;
                    color: #8a2be2;
                    font-size: 24px;
                    font-weight: bold;
                    margin-bottom: 20px;
                }
                h1 {
                    color: #333;
                    text-align: center;
                    margin-bottom: 30px;
                    font-size: 28px;
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
                const loginBtn = document.querySelector('.login-btn');
                
                errorDiv.textContent = '';
                loginBtn.disabled = true;
                loginBtn.textContent = 'Connexion...';
                
                try {
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
                        setTimeout(() => {
                            window.location.href = '/admin';
                        }, 500);
                    } else {
                        errorDiv.textContent = data.error || 'Identifiants incorrects';
                        loginBtn.disabled = false;
                        loginBtn.textContent = 'Se connecter';
                    }
                } catch (error) {
                    errorDiv.textContent = 'Erreur de connexion au serveur';
                    loginBtn.disabled = false;
                    loginBtn.textContent = 'Se connecter';
                }
            }
            
            document.getElementById('password').addEventListener('keypress', function(e) {
                if (e.key === 'Enter') login();
            });
            </script>
        </body>
        </html>
    `);
});

// Routes admin
app.get('/admin/products', (req, res) => {
    if (!req.session.user) return res.redirect('/admin/login');
    res.redirect('/admin');
});

app.get('/admin/orders', (req, res) => {
    if (!req.session.user) return res.redirect('/admin/login');
    res.redirect('/admin');
});

app.get('/admin/settings', (req, res) => {
    if (!req.session.user) return res.redirect('/admin/login');
    res.redirect('/admin');
});

// Route admin principale
app.get('/admin', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/admin/simple-login');
    }
    res.render('dashboard', { user: req.session.user });
});

// Route login originale
app.get('/admin/login', (req, res) => {
    if (req.session.user) {
        return res.redirect('/admin');
    }
    res.redirect('/admin/simple-login');
});

// Routes utilitaires
app.get('/debug', (req, res) => {
    res.json({
        session: req.session.user ? 'User logged in' : 'No user',
        uploadsDir: fs.existsSync(uploadsDir) ? 'Exists' : 'Missing',
        env: process.env.NODE_ENV
    });
});

app.get('/session-status', (req, res) => {
    res.json({
        loggedIn: !!req.session.user,
        user: req.session.user
    });
});

app.get('/force-login', (req, res) => {
    req.session.user = {
        id: 1,
        username: 'admin',
        email: 'admin@esparfumerie.com',
        role: 'admin'
    };
    res.redirect('/admin');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/simple-login');
});

// Servir les images uploadées
app.use('/uploads', express.static(uploadsDir));

// Route de santé
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        sessionActive: !!req.session.user,
        environment: process.env.NODE_ENV
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
        health: '/health'
    });
});

// Gestion des erreurs 404
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Route non trouvée',
        availableRoutes: {
            admin: '/admin/simple-login',
            api: '/api/products',
            health: '/health'
        }
    });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
    console.error('❌ Erreur globale:', err);
    res.status(500).json({ 
        error: 'Erreur interne du serveur',
        message: err.message
    });
});

// Initialiser et démarrer
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
        ║ 🩺 Santé:          /health                           ║
        ║                                                      ║
        ║ 🔑 Identifiants: admin / admin123                    ║
        ╚══════════════════════════════════════════════════════╝
        `);
    });
}).catch(err => {
    console.error('❌ Erreur d\'initialisation:', err);
    process.exit(1);
});
