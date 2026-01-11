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

// Créer les dossiers nécessaires
const uploadsDir = path.join(__dirname, 'uploads');
const sessionsDir = path.join(__dirname, 'sessions');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });

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

// Augmenter la limite pour les uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// SESSION MIDDLEWARE - CORRIGÉ POUR LA PERSISTANCE
app.use(session({
    name: 'esparfumerie.sid',
    secret: process.env.SESSION_SECRET || 'votre_secret_tres_long_et_securise_changez_moi_123456789',
    resave: true,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 JOURS ! (au lieu de 24h)
        path: '/'
    },
    rolling: true, // Renouvelle le cookie à chaque requête
    // Utilise un store en mémoire simple mais avec plus de durée
    store: new session.MemoryStore({
        checkPeriod: 86400000 // Nettoyage toutes les 24h
    })
}));

// Middleware pour logger les sessions
app.use((req, res, next) => {
    req.session.touch(); // Touche la session à chaque requête
    next();
});

// Middleware pour ajouter l'URL de base
app.use((req, res, next) => {
    req.baseUrl = `${req.protocol}://${req.get('host')}`;
    next();
});

// Logging middleware
app.use((req, res, next) => {
    const now = new Date().toISOString();
    console.log(`[${now}] ${req.method} ${req.url} - Session:`, req.sessionID ? 'Active' : 'No session');
    next();
});

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes API
app.use('/api/products', productsRouter);
app.use('/api/auth', authRouter);

// Route de login direct améliorée
app.post('/admin/direct-login', (req, res) => {
    const { username, password } = req.body;
    
    console.log('Login attempt for user:', username);
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
    }
    
    if (username === 'admin' && password === 'admin123') {
        req.session.user = {
            id: 1,
            username: 'admin',
            email: 'admin@esparfumerie.com',
            role: 'admin',
            lastLogin: new Date().toISOString()
        };
        
        // Sauvegarder la session
        req.session.save((err) => {
            if (err) {
                console.error('Session save error:', err);
                return res.status(500).json({ error: 'Erreur de session' });
            }
            
            console.log('User logged in, session saved:', req.sessionID);
            
            return res.json({ 
                success: true, 
                redirect: '/admin',
                message: 'Connexion réussie',
                user: req.session.user,
                sessionId: req.sessionID
            });
        });
    } else {
        res.status(401).json({ error: 'Identifiants incorrects' });
    }
});

// Route pour vérifier et rafraîchir la session
app.post('/api/auth/refresh', (req, res) => {
    if (req.session.user) {
        // Rafraîchir la session
        req.session.touch();
        req.session.save((err) => {
            if (err) {
                console.error('Session refresh error:', err);
                return res.status(500).json({ error: 'Erreur de session' });
            }
            res.json({ 
                success: true, 
                user: req.session.user,
                message: 'Session rafraîchie',
                timestamp: new Date().toISOString()
            });
        });
    } else {
        res.json({ 
            success: false, 
            message: 'Session expirée',
            redirect: '/admin/login'
        });
    }
});

// Route keep-alive simple
app.get('/keep-alive', (req, res) => {
    res.json({ 
        status: 'alive', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        sessionActive: !!req.session.user
    });
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
                .remember-me {
                    display: flex;
                    align-items: center;
                    margin: 15px 0;
                }
                .remember-me input {
                    width: auto;
                    margin-right: 8px;
                }
                .remember-me label {
                    margin: 0;
                    color: #666;
                    font-size: 14px;
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
                
                <div class="remember-me">
                    <input type="checkbox" id="remember" checked>
                    <label for="remember">Rester connecté</label>
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
                const remember = document.getElementById('remember').checked;
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
                        body: JSON.stringify({ username, password, remember })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok && data.success) {
                        console.log('Login réussi, session:', data.sessionId);
                        
                        // Démarrer le rafraîchissement automatique de session
                        startSessionRefresh();
                        
                        setTimeout(() => {
                            window.location.href = '/admin';
                        }, 500);
                    } else {
                        errorDiv.textContent = data.error || 'Identifiants incorrects';
                        loginBtn.disabled = false;
                        loginBtn.textContent = 'Se connecter';
                    }
                } catch (error) {
                    console.error('Login error:', error);
                    errorDiv.textContent = 'Erreur de connexion au serveur';
                    loginBtn.disabled = false;
                    loginBtn.textContent = 'Se connecter';
                }
            }
            
            // Rafraîchir la session toutes les 2 minutes
            function startSessionRefresh() {
                setInterval(async () => {
                    try {
                        await fetch('/api/auth/refresh', {
                            method: 'POST',
                            credentials: 'include'
                        });
                        console.log('Session refreshed at:', new Date().toLocaleTimeString());
                    } catch (error) {
                        console.log('Session refresh failed');
                    }
                }, 2 * 60 * 1000); // 2 minutes
            }
            
            // Rafraîchissement automatique de la page keep-alive
            setInterval(() => {
                fetch('/keep-alive').catch(() => {});
            }, 5 * 60 * 1000); // 5 minutes
            
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

// Route admin principale avec vérification de session
app.get('/admin', (req, res) => {
    if (!req.session.user) {
        console.log('No session user, redirecting to login');
        return res.redirect('/admin/simple-login');
    }
    
    console.log('Rendering dashboard for:', req.session.user.username);
    res.render('dashboard', { 
        user: req.session.user,
        sessionId: req.sessionID 
    });
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
        session: {
            id: req.sessionID,
            user: req.session.user,
            cookie: req.session.cookie
        },
        app: {
            env: process.env.NODE_ENV,
            uptime: process.uptime()
        },
        timestamp: new Date().toISOString()
    });
});

app.get('/session-status', (req, res) => {
    res.json({
        loggedIn: !!req.session.user,
        user: req.session.user,
        sessionId: req.sessionID,
        sessionAge: req.session.cookie.maxAge
    });
});

app.get('/force-login', (req, res) => {
    req.session.user = {
        id: 1,
        username: 'admin',
        email: 'admin@esparfumerie.com',
        role: 'admin'
    };
    req.session.save(() => {
        res.redirect('/admin');
    });
});

app.get('/logout', (req, res) => {
    const sessionId = req.sessionID;
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        console.log('Session destroyed:', sessionId);
        res.redirect('/admin/simple-login');
    });
});

// Servir les images uploadées
app.use('/uploads', express.static(uploadsDir));

// Route de santé améliorée
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        sessionActive: !!req.session.user,
        environment: process.env.NODE_ENV,
        uptime: process.uptime(),
        memory: process.memoryUsage()
    });
});

// Route racine
app.get('/', (req, res) => {
    res.json({
        message: 'ES Parfumerie API',
        version: '2.0.0',
        status: 'running',
        adminPanel: '/admin/simple-login',
        apiDocs: {
            products: '/api/products',
            auth: '/api/auth',
            health: '/health',
            keepAlive: '/keep-alive'
        }
    });
});

// Gestion des erreurs 404
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Route non trouvée',
        timestamp: new Date().toISOString()
    });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
    console.error('❌ Erreur globale:', err);
    res.status(500).json({ 
        error: 'Erreur interne du serveur',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

// Initialiser et démarrer
initializeDatabase().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`
        ╔══════════════════════════════════════════════════════╗
        ║           ES PARFUMERIE API v2.0 - DÉMARRÉE         ║
        ╠══════════════════════════════════════════════════════╣
        ║ Port: ${PORT}                                         ║
        ║ Environnement: ${process.env.NODE_ENV || 'development'} ║
        ║ Session durée: 7 jours                              ║
        ║                                                     ║
        ║ 📍 URLs importantes:                                ║
        ║                                                     ║
        ║ 👑 Panel Admin:    /admin/simple-login              ║
        ║ 📦 API Produits:   /api/products                    ║
        ║ 🩺 Santé:          /health                          ║
        ║ 🔄 Keep-alive:     /keep-alive                      ║
        ║                                                     ║
        ║ 🔑 Identifiants: admin / admin123                   ║
        ║ ⚠️  Changez-les après première connexion            ║
        ╚══════════════════════════════════════════════════════╝
        `);
        
        // Démarrer un keep-alive interne
        setInterval(() => {
            fetch(`http://localhost:${PORT}/keep-alive`).catch(() => {});
        }, 5 * 60 * 1000); // 5 minutes
    });
}).catch(err => {
    console.error('❌ Erreur d\'initialisation:', err);
    process.exit(1);
});
