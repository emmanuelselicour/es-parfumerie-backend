// Middleware pour vérifier l'authentification
function authenticateToken(req, res, next) {
    console.log('Checking authentication...');
    console.log('Session user:', req.session.user);
    
    if (!req.session.user) {
        console.log('No user session, returning 401');
        return res.status(401).json({ 
            error: 'Accès non autorisé. Veuillez vous connecter.',
            redirect: '/admin/login'
        });
    }
    
    console.log('User authenticated:', req.session.user.username);
    next();
}

module.exports = { authenticateToken };
