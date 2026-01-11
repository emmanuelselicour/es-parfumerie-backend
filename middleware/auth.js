// Middleware pour vérifier l'authentification
function authenticateToken(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ error: 'Accès non autorisé. Veuillez vous connecter.' });
    }
    next();
}

module.exports = { authenticateToken };
