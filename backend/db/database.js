// db/database.js
// Initialises the SQLite database, creates tables, and seeds starter data.

const path = require('path');
const bcrypt = require('bcrypt');

// ─── Open / create the DB file ───────────────────────────────────────────────
const Database = require('better-sqlite3');
const DB_PATH = path.join(__dirname, '..', 'goshen.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ──────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS cakes (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT,
    category    TEXT NOT NULL DEFAULT 'celebration',
    price       REAL NOT NULL DEFAULT 0,
    image_url   TEXT,
    alt_text    TEXT,
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS contact_submissions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name  TEXT NOT NULL,
    last_name   TEXT NOT NULL,
    email       TEXT NOT NULL,
    phone       TEXT,
    occasion    TEXT,
    status      TEXT NOT NULL DEFAULT 'new',
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ─── Seed cakes (only if table is empty) ─────────────────────────────────────
const cakeCount = db.prepare('SELECT COUNT(*) AS n FROM cakes').get().n;

if (cakeCount === 0) {
  const insert = db.prepare(`
    INSERT INTO cakes (name, description, category, price, image_url, alt_text)
    VALUES (@name, @description, @category, @price, @image_url, @alt_text)
  `);

  const seedCakes = [
    {
      name: 'Velvet Dream Cake',
      description: 'Classic red velvet with cream cheese frosting & rose petals',
      category: 'celebration',
      price: 3500,
      image_url: 'https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=600&q=80',
      alt_text: 'Three-tier red velvet cake decorated with cream cheese frosting and fresh rose petals'
    },
    {
      name: 'Ivory Tiered Wedding',
      description: 'Elegant fondant tiers with sugar flowers & gold leaf',
      category: 'wedding',
      price: 12000,
      image_url: 'https://images.unsplash.com/photo-1519869325930-281384150729?w=600&q=80',
      alt_text: 'Multi-tier white wedding cake decorated with sugar flowers and gold leaf accents'
    },
    {
      name: 'Dark Chocolate Drip',
      description: 'Fudgy sponge, ganache drip & salted caramel drizzle',
      category: 'celebration',
      price: 4200,
      image_url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&q=80',
      alt_text: 'Dark chocolate drip cake on a white stand with ganache and caramel decorations'
    },
    {
      name: 'Tropical Mango Layer',
      description: 'Light vanilla sponge, mango curd & toasted coconut',
      category: 'custom',
      price: 3800,
      image_url: 'https://images.unsplash.com/photo-1562440499-64c9a111f713?w=600&q=80',
      alt_text: 'Layered tropical cake with mango curd filling and toasted coconut on top'
    },
    {
      name: 'Lemon Drizzle Gateau',
      description: 'Zesty lemon sponge, lemon curd & mirror glaze',
      category: 'celebration',
      price: 3200,
      image_url: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=600&q=80',
      alt_text: 'Lemon drizzle gateau with glossy yellow mirror glaze and lemon zest garnish'
    },
    {
      name: 'Floral Garden Cake',
      description: 'Vanilla buttercream canvas with hand-piped wildflowers',
      category: 'custom',
      price: 5500,
      image_url: 'https://images.unsplash.com/photo-1535141192574-5d4897c12636?w=600&q=80',
      alt_text: 'White buttercream cake adorned with hand-piped colourful wildflowers'
    },
    {
      name: 'Rustic Berry Wreath',
      description: 'Naked sponge with fresh berries, mint & honey glaze',
      category: 'wedding',
      price: 8500,
      image_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80',
      alt_text: 'Semi-naked wedding cake layered with fresh strawberries, blueberries and mint leaves'
    },
    {
      name: 'Galaxy Mirror Cake',
      description: 'Dark chocolate sponge beneath a swirling galaxy glaze',
      category: 'custom',
      price: 6000,
      image_url: 'https://images.unsplash.com/photo-1600850056064-a8b380df8395?w=600&q=80',
      alt_text: 'Spectacular galaxy-effect mirror glaze cake in purple and blue tones'
    }
  ];

  const seedAll = db.transaction(() => {
    for (const cake of seedCakes) insert.run(cake);
  });
  seedAll();
  console.log('[DB] Seeded 8 starter cakes.');
}

// ─── Seed admin user (only if table is empty) ─────────────────────────────────
const adminCount = db.prepare('SELECT COUNT(*) AS n FROM admin_users').get().n;

if (adminCount === 0) {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const hash = bcrypt.hashSync(password, 12);
  db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(username, hash);
  console.log(`[DB] Seeded admin user: "${username}". Change the password immediately!`);
}

module.exports = db;
