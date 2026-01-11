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

// Middleware
app.use(cors({
    origin: ['https://emmanuelselicour.github.io', 'http://localhost:8000'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'votre_secret_session',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 heures
    }
}));

// Set view engine pour le panel admin
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes API
app.use('/api/products', productsRouter);
app.use('/api/auth', authRouter);

// Routes pour le panel admin
app.get('/admin', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/admin/login');
    }
    res.render('dashboard');
});

app.get('/admin/login', (req, res) => {
    res.render('login');
});

// Route pour servir les images uploadées
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Route de santé
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Initialiser la base de données et démarrer le serveur
initializeDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`✅ Serveur démarré sur le port ${PORT}`);
        console.log(`🌐 API disponible sur: http://localhost:${PORT}/api/products`);
        console.log(`👨‍💼 Panel admin: http://localhost:${PORT}/admin`);
    });
}).catch(err => {
    console.error('❌ Erreur d\'initialisation:', err);
});
