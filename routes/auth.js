const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../database');

const router = express.Router();

// POST /api/auth/login - Connexion admin
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Nom d\'utilisateur et mot de passe requis' });
    }

    // Rechercher l'admin
    db.get('SELECT * FROM admins WHERE username = ?', [username], async (err, admin) => {
        if (err) {
            console.error('Erreur SQL:', err);
            return res.status(500).json({ error: 'Erreur de base de données' });
        }

        if (!admin) {
            return res.status(401).json({ error: 'Identifiants incorrects' });
        }

        // Vérifier le mot de passe
        const validPassword = await bcrypt.compare(password, admin.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Identifiants incorrects' });
        }

        // Créer la session
        req.session.user = {
            id: admin.id,
            username: admin.username,
            email: admin.email
        };

        res.json({
            message: 'Connexion réussie',
            user: {
                id: admin.id,
                username: admin.username,
                email: admin.email
            }
        });
    });
});

// POST /api/auth/logout - Déconnexion
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur de déconnexion' });
        }
        res.json({ message: 'Déconnexion réussie' });
    });
});

// GET /api/auth/check - Vérifier la session
router.get('/check', (req, res) => {
    if (req.session.user) {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        res.json({ authenticated: false });
    }
});

// POST /api/auth/change-password - Changer le mot de passe
router.post('/change-password', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Non authentifié' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    // Récupérer l'admin
    db.get('SELECT * FROM admins WHERE id = ?', [req.session.user.id], async (err, admin) => {
        if (err || !admin) {
            return res.status(500).json({ error: 'Erreur de base de données' });
        }

        // Vérifier l'ancien mot de passe
        const validPassword = await bcrypt.compare(currentPassword, admin.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
        }

        // Hasher le nouveau mot de passe
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Mettre à jour le mot de passe
        db.run(
            'UPDATE admins SET password = ? WHERE id = ?',
            [hashedPassword, admin.id],
            function(err) {
                if (err) {
                    return res.status(500).json({ error: 'Erreur de mise à jour du mot de passe' });
                }
                res.json({ message: 'Mot de passe changé avec succès' });
            }
        );
    });
});

module.exports = router;
