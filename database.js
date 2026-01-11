const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Chemin vers la base de données
const dbPath = path.join(__dirname, 'database.sqlite');

// Créer une connexion à la base de données
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erreur de connexion à la base de données:', err);
    } else {
        console.log('✅ Connecté à la base de données SQLite');
    }
});

// Initialiser la base de données
async function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Table des produits
            db.run(`CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                image TEXT,
                category TEXT,
                stock INTEGER DEFAULT 0,
                featured BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);

            // Table des administrateurs
            db.run(`CREATE TABLE IF NOT EXISTS admins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);

            // Table des commandes (pour plus tard)
            db.run(`CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_name TEXT,
                customer_email TEXT,
                customer_phone TEXT,
                total_amount REAL,
                status TEXT DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);

            // Table des items de commande
            db.run(`CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER,
                product_id INTEGER,
                product_name TEXT,
                quantity INTEGER,
                price REAL,
                FOREIGN KEY (order_id) REFERENCES orders(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            )`);

            // Créer un admin par défaut (à changer après la première connexion)
            const defaultAdmin = {
                username: 'admin',
                email: 'admin@esparfumerie.com',
                password: 'admin123' // À changer immédiatement !
            };

            // Vérifier si un admin existe déjà
            db.get('SELECT id FROM admins WHERE username = ?', [defaultAdmin.username], (err, row) => {
                if (!row) {
                    bcrypt.hash(defaultAdmin.password, 10, (err, hash) => {
                        if (err) {
                            console.error('Erreur de hash:', err);
                            reject(err);
                            return;
                        }
                        
                        db.run(
                            'INSERT INTO admins (username, email, password) VALUES (?, ?, ?)',
                            [defaultAdmin.username, defaultAdmin.email, hash],
                            (err) => {
                                if (err) {
                                    console.error('Erreur de création admin:', err);
                                    reject(err);
                                } else {
                                    console.log('👑 Admin par défaut créé:');
                                    console.log('   Username: admin');
                                    console.log('   Password: admin123');
                                    console.log('⚠️  CHANGEZ CES IDENTIFIANTS IMMÉDIATEMENT !');
                                    resolve();
                                }
                            }
                        );
                    });
                } else {
                    console.log('✅ Base de données initialisée');
                    resolve();
                }
            });
        });
    });
}

module.exports = { db, initializeDatabase };
