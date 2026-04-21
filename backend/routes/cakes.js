// routes/cakes.js
// Public: GET /api/cakes, GET /api/cakes/:id
// Admin (JWT):  GET|POST /api/admin/cakes, PUT|DELETE /api/admin/cakes/:id, PUT /api/admin/cakes/bulk-price

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../db/database');
const auth    = require('../middleware/auth');

const router = express.Router();

// ─── Multer (image uploads) ───────────────────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `cake-${unique}${ext}`);
  }
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only image files are allowed (jpg, png, webp, gif).'), false);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 8 * 1024 * 1024 } }); // 8 MB max

// ─── Helper ───────────────────────────────────────────────────────────────────
function formatPrice(price) {
  return price; // raw number; frontend formats as KES X,XXX
}

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

// GET /api/cakes?category=wedding
router.get('/', (req, res) => {
  const { category } = req.query;
  let stmt;
  if (category && category !== 'all') {
    stmt = db.prepare('SELECT * FROM cakes WHERE is_active = 1 AND category = ? ORDER BY id ASC');
    return res.json(stmt.all(category));
  }
  stmt = db.prepare('SELECT * FROM cakes WHERE is_active = 1 ORDER BY id ASC');
  res.json(stmt.all());
});

// GET /api/cakes/:id
router.get('/:id', (req, res) => {
  const cake = db.prepare('SELECT * FROM cakes WHERE id = ? AND is_active = 1').get(req.params.id);
  if (!cake) return res.status(404).json({ error: 'Cake not found.' });
  res.json(cake);
});

// ─── ADMIN ROUTES (all require JWT) ──────────────────────────────────────────

// GET /api/admin/cakes — all cakes including inactive
router.get('/admin/all', auth, (req, res) => {
  const cakes = db.prepare('SELECT * FROM cakes ORDER BY id ASC').all();
  res.json(cakes);
});

// POST /api/admin/cakes — create new cake
router.post('/admin', auth, upload.single('image'), (req, res) => {
  const { name, description, category, price, alt_text } = req.body;

  if (!name || !category) {
    return res.status(400).json({ error: 'Name and category are required.' });
  }

  const image_url = req.file
    ? `/uploads/${req.file.filename}`
    : (req.body.image_url || null);

  const result = db.prepare(`
    INSERT INTO cakes (name, description, category, price, image_url, alt_text)
    VALUES (@name, @description, @category, @price, @image_url, @alt_text)
  `).run({ name, description, category, price: parseFloat(price) || 0, image_url, alt_text });

  const cake = db.prepare('SELECT * FROM cakes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(cake);
});

// PUT /api/admin/cakes/bulk-price — batch update prices
router.put('/admin/bulk-price', auth, (req, res) => {
  const { updates } = req.body; // [{ id, price }, ...]
  if (!Array.isArray(updates)) return res.status(400).json({ error: 'updates must be an array.' });

  const update = db.prepare('UPDATE cakes SET price = @price, updated_at = CURRENT_TIMESTAMP WHERE id = @id');
  const bulkUpdate = db.transaction(() => {
    for (const u of updates) update.run({ price: parseFloat(u.price) || 0, id: u.id });
  });
  bulkUpdate();
  res.json({ success: true, updated: updates.length });
});

// PUT /api/admin/cakes/:id — update a cake
router.put('/admin/:id', auth, upload.single('image'), (req, res) => {
  const { name, description, category, price, alt_text, is_active } = req.body;

  const existing = db.prepare('SELECT * FROM cakes WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Cake not found.' });

  // If a new image was uploaded and there was a local old image, delete it
  let image_url = existing.image_url;
  if (req.file) {
    if (existing.image_url && existing.image_url.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '..', existing.image_url);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    image_url = `/uploads/${req.file.filename}`;
  } else if (req.body.image_url !== undefined) {
    image_url = req.body.image_url;
  }

  db.prepare(`
    UPDATE cakes SET
      name        = @name,
      description = @description,
      category    = @category,
      price       = @price,
      image_url   = @image_url,
      alt_text    = @alt_text,
      is_active   = @is_active,
      updated_at  = CURRENT_TIMESTAMP
    WHERE id = @id
  `).run({
    name:        name        ?? existing.name,
    description: description ?? existing.description,
    category:    category    ?? existing.category,
    price:       price !== undefined ? parseFloat(price) : existing.price,
    image_url,
    alt_text:    alt_text    ?? existing.alt_text,
    is_active:   is_active !== undefined ? Number(is_active) : existing.is_active,
    id:          req.params.id
  });

  const updated = db.prepare('SELECT * FROM cakes WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/admin/cakes/:id — soft delete
router.delete('/admin/:id', auth, (req, res) => {
  const existing = db.prepare('SELECT id FROM cakes WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Cake not found.' });

  db.prepare('UPDATE cakes SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── ADMIN: contact submissions ───────────────────────────────────────────────

// GET /api/admin/contacts
router.get('/admin/contacts', auth, (req, res) => {
  const submissions = db
    .prepare('SELECT * FROM contact_submissions ORDER BY created_at DESC')
    .all();
  res.json(submissions);
});

// PUT /api/admin/contacts/:id — update status
router.put('/admin/contacts/:id', auth, (req, res) => {
  const { status } = req.body;
  const allowed = ['new', 'contacted', 'completed'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status.' });

  const existing = db.prepare('SELECT id FROM contact_submissions WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Submission not found.' });

  db.prepare('UPDATE contact_submissions SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

module.exports = router;
