const express = require('express');
const multer = require('multer');
const path = require('path');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configuration de Multer pour l'upload d'images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Seules les images sont autorisées (jpeg, jpg, png, gif, webp)'));
        }
    }
});

// GET /api/products - Récupérer tous les produits
router.get('/', (req, res) => {
    const { category, featured, search } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params = [];

    if (category) {
        query += ' AND category = ?';
        params.push(category);
    }

    if (featured === 'true') {
        query += ' AND featured = 1';
    }

    if (search) {
        query += ' AND (name LIKE ? OR description LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
    }

    query += ' ORDER BY created_at DESC';

    db.all(query, params, (err, products) => {
        if (err) {
            console.error('Erreur SQL:', err);
            return res.status(500).json({ error: 'Erreur de base de données' });
        }
        res.json(products);
    });
});

// GET /api/products/:id - Récupérer un produit spécifique
router.get('/:id', (req, res) => {
    const { id } = req.params;
    
    db.get('SELECT * FROM products WHERE id = ?', [id], (err, product) => {
        if (err) {
            return res.status(500).json({ error: 'Erreur de base de données' });
        }
        if (!product) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }
        res.json(product);
    });
});

// POST /api/products - Créer un nouveau produit (Admin seulement)
router.post('/', authenticateToken, upload.single('image'), (req, res) => {
    const { name, description, price, category, stock, featured } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    if (!name || !price) {
        return res.status(400).json({ error: 'Nom et prix sont requis' });
    }

    db.run(
        `INSERT INTO products (name, description, price, image, category, stock, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, description, parseFloat(price), image, category, parseInt(stock || 0), featured === 'true' ? 1 : 0],
        function(err) {
            if (err) {
                console.error('Erreur SQL:', err);
                return res.status(500).json({ error: 'Erreur de création du produit' });
            }
            
            // Récupérer le produit créé
            db.get('SELECT * FROM products WHERE id = ?', [this.lastID], (err, product) => {
                if (err) {
                    return res.status(500).json({ error: 'Erreur de récupération du produit' });
                }
                res.status(201).json(product);
            });
        }
    );
});

// PUT /api/products/:id - Mettre à jour un produit (Admin seulement)
router.put('/:id', authenticateToken, upload.single('image'), (req, res) => {
    const { id } = req.params;
    const { name, description, price, category, stock, featured } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : undefined;

    // Récupérer le produit existant
    db.get('SELECT * FROM products WHERE id = ?', [id], (err, existingProduct) => {
        if (err || !existingProduct) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        // Préparer les données de mise à jour
        const updateData = {
            name: name || existingProduct.name,
            description: description !== undefined ? description : existingProduct.description,
            price: price !== undefined ? parseFloat(price) : existingProduct.price,
            image: image || existingProduct.image,
            category: category !== undefined ? category : existingProduct.category,
            stock: stock !== undefined ? parseInt(stock) : existingProduct.stock,
            featured: featured !== undefined ? (featured === 'true' ? 1 : 0) : existingProduct.featured,
            updated_at: new Date().toISOString()
        };

        db.run(
            `UPDATE products 
             SET name = ?, description = ?, price = ?, image = ?, category = ?, stock = ?, featured = ?, updated_at = ?
             WHERE id = ?`,
            [
                updateData.name,
                updateData.description,
                updateData.price,
                updateData.image,
                updateData.category,
                updateData.stock,
                updateData.featured,
                updateData.updated_at,
                id
            ],
            function(err) {
                if (err) {
                    console.error('Erreur SQL:', err);
                    return res.status(500).json({ error: 'Erreur de mise à jour du produit' });
                }
                
                db.get('SELECT * FROM products WHERE id = ?', [id], (err, updatedProduct) => {
                    if (err) {
                        return res.status(500).json({ error: 'Erreur de récupération du produit' });
                    }
                    res.json(updatedProduct);
                });
            }
        );
    });
});

// DELETE /api/products/:id - Supprimer un produit (Admin seulement)
router.delete('/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Erreur de suppression du produit' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }
        res.json({ message: 'Produit supprimé avec succès' });
    });
});

module.exports = router;
