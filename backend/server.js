// server.js — Goshen Home Bakery Express server

require('dotenv').config();

const express   = require('express');
const cors      = require('cors');
const path      = require('path');
const connectDB = require('./db/database');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve all frontend static files from the frontend and admin directories
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.use(express.static(path.join(__dirname, '..', 'admin')));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/cakes',   require('./routes/cakes'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/auth',    require('./routes/auth'));

// ─── Catch-all: serve index.html for any unmatched route ─────────────────────
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found.' });
  }
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'Image file too large. Max 8 MB.' });
  }
  console.error('[Server Error]', err.message);
  res.status(500).json({ error: err.message || 'Internal server error.' });
});

// ─── Connect to MongoDB then start ───────────────────────────────────────────
const PORT = process.env.PORT || 3000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🧁  Goshen Home Bakery server running at http://localhost:${PORT}`);
      console.log(`    Admin dashboard: http://localhost:${PORT}/admin.html\n`);
    });
  })
  .catch(err => {
    console.error('[Fatal] Could not connect to MongoDB:', err.message);
    process.exit(1);
  });
