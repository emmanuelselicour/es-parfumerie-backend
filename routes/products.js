const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Configuration de Multer CORRIGÉE
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadsDir = path.join(__dirname, '../uploads');
        // Créer le dossier s'il n'existe pas
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
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
    console.log('Fetching products...');
    db.all('SELECT * FROM products ORDER BY created_at DESC', [], (err, products) => {
        if (err) {
            console.error('Erreur SQL:', err);
            return res.status(500).json({ error: 'Erreur de base de données' });
        }
        console.log(`Found ${products.length} products`);
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

// POST /api/products - Créer un nouveau produit
router.post('/', authenticateToken, upload.single('image'), (req, res) => {
    console.log('Creating product...');
    console.log('Body:', req.body);
    console.log('File:', req.file);
    
    try {
        const { name, description, price, category, stock, featured } = req.body;
        
        // Validation
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Le nom du produit est requis' });
        }
        
        if (!price || isNaN(parseFloat(price))) {
            return res.status(400).json({ error: 'Le prix est invalide' });
        }
        
        // Chemin de l'image
        let imagePath = null;
        if (req.file) {
            imagePath = `/uploads/${req.file.filename}`;
        }
        
        // Convertir les valeurs
        const productPrice = parseFloat(price);
        const productStock = stock ? parseInt(stock) : 0;
        const isFeatured = featured === 'true' || featured === true ? 1 : 0;
        
        // Insertion dans la base de données
        db.run(
            `INSERT INTO products (name, description, price, image, category, stock, featured)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                name.trim(),
                description ? description.trim() : null,
                productPrice,
                imagePath,
                category ? category.trim() : null,
                productStock,
                isFeatured
            ],
            function(err) {
                if (err) {
                    console.error('Erreur SQL:', err);
                    return res.status(500).json({ error: 'Erreur lors de la création du produit' });
                }
                
                console.log('Product created with ID:', this.lastID);
                
                // Récupérer le produit créé
                db.get('SELECT * FROM products WHERE id = ?', [this.lastID], (err, product) => {
                    if (err) {
                        console.error('Erreur récupération:', err);
                        return res.status(500).json({ error: 'Produit créé mais erreur de récupération' });
                    }
                    res.status(201).json(product);
                });
            }
        );
        
    } catch (error) {
        console.error('Erreur création produit:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// PUT /api/products/:id - Mettre à jour un produit
router.put('/:id', authenticateToken, upload.single('image'), (req, res) => {
    console.log('Updating product ID:', req.params.id);
    
    const { id } = req.params;
    const { name, description, price, category, stock, featured } = req.body;
    
    // Récupérer le produit existant
    db.get('SELECT * FROM products WHERE id = ?', [id], (err, existingProduct) => {
        if (err || !existingProduct) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }
        
        // Validation
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Le nom du produit est requis' });
        }
        
        if (!price || isNaN(parseFloat(price))) {
            return res.status(400).json({ error: 'Le prix est invalide' });
        }
        
        // Gérer l'image
        let imagePath = existingProduct.image;
        if (req.file) {
            imagePath = `/uploads/${req.file.filename}`;
            // Supprimer l'ancienne image si elle existe
            if (existingProduct.image && existingProduct.image.startsWith('/uploads/')) {
                const oldImagePath = path.join(__dirname, '..', existingProduct.image);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
        }
        
        // Convertir les valeurs
        const productPrice = parseFloat(price);
        const productStock = stock ? parseInt(stock) : 0;
        const isFeatured = featured === 'true' || featured === true ? 1 : 0;
        
        // Mise à jour
        db.run(
            `UPDATE products 
             SET name = ?, description = ?, price = ?, image = ?, category = ?, stock = ?, featured = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [
                name.trim(),
                description ? description.trim() : null,
                productPrice,
                imagePath,
                category ? category.trim() : null,
                productStock,
                isFeatured,
                id
            ],
            function(err) {
                if (err) {
                    console.error('Erreur SQL:', err);
                    return res.status(500).json({ error: 'Erreur lors de la mise à jour du produit' });
                }
                
                // Récupérer le produit mis à jour
                db.get('SELECT * FROM products WHERE id = ?', [id], (err, updatedProduct) => {
                    if (err) {
                        return res.status(500).json({ error: 'Produit mis à jour mais erreur de récupération' });
                    }
                    res.json(updatedProduct);
                });
            }
        );
    });
});

// DELETE /api/products/:id - Supprimer un produit
router.delete('/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    
    // Récupérer le produit pour supprimer l'image
    db.get('SELECT * FROM products WHERE id = ?', [id], (err, product) => {
        if (err || !product) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }
        
        // Supprimer l'image si elle existe
        if (product.image && product.image.startsWith('/uploads/')) {
            const imagePath = path.join(__dirname, '..', product.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }
        
        // Supprimer le produit de la base de données
        db.run('DELETE FROM products WHERE id = ?', [id], function(err) {
            if (err) {
                return res.status(500).json({ error: 'Erreur de suppression du produit' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Produit non trouvé' });
            }
            res.json({ 
                message: 'Produit supprimé avec succès',
                deletedId: id 
            });
        });
    });
});

module.exports = router;
