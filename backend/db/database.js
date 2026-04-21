// db/database.js
// Connects to MongoDB and seeds starter data if collections are empty.

const mongoose  = require('mongoose');
const bcrypt    = require('bcrypt');
const Cake      = require('../models/Cake');
const AdminUser = require('../models/AdminUser');

async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/goshen-bakery';

  await mongoose.connect(uri);
  console.log('[DB] Connected to MongoDB.');

  // ─── Seed cakes (only if collection is empty) ──────────────────────────────
  const cakeCount = await Cake.countDocuments();
  if (cakeCount === 0) {
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

    await Cake.insertMany(seedCakes);
    console.log('[DB] Seeded 8 starter cakes.');
  }

  // ─── Seed admin user (only if collection is empty) ──────────────────────────
  const adminCount = await AdminUser.countDocuments();
  if (adminCount === 0) {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = bcrypt.hashSync(password, 12);
    await AdminUser.create({ username, password_hash: hash });
    console.log(`[DB] Seeded admin user: "${username}". Change the password immediately!`);
  }
}

module.exports = connectDB;
