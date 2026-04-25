// routes/cakes.js
// Public: GET /api/cakes, GET /api/cakes/:id
// Admin (JWT):  GET|POST /api/admin/cakes, PUT|DELETE /api/admin/cakes/:id, PUT /api/admin/cakes/bulk-price

const express = require('express');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const mongoose = require('mongoose');
const Cake    = require('../models/Cake');
const ContactSubmission = require('../models/ContactSubmission');
const auth    = require('../middleware/auth');

const router = express.Router();

// ─── Cloudinary & Multer ───────────────────────────────────────────────────
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'goshen-bakery',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    // Use the filename format if desired, or let Cloudinary generate a unique one
    public_id: (req, file) => {
      const name = path.parse(file.originalname).name;
      return `cake-${Date.now()}-${name}`;
    }
  },
});

const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } }); // 8 MB max

// ─── PUBLIC ROUTES ────────────────────────────────────────────────────────────

// GET /api/cakes?category=wedding
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { is_active: true };
    if (category && category !== 'all') filter.category = category;
    const cakes = await Cake.find(filter).sort({ createdAt: 1 });
    res.json(cakes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cakes/:id
router.get('/:id', async (req, res) => {
  try {
    const cake = await Cake.findOne({ _id: req.params.id, is_active: true });
    if (!cake) return res.status(404).json({ error: 'Cake not found.' });
    res.json(cake);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN ROUTES (all require JWT) ──────────────────────────────────────────

// GET /api/admin/cakes — all cakes including inactive
router.get('/admin/all', auth, async (req, res) => {
  try {
    const cakes = await Cake.find().sort({ createdAt: 1 });
    res.json(cakes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/cakes — create new cake
router.post('/admin', auth, upload.single('image'), async (req, res) => {
  try {
    const { name, description, category, price, alt_text } = req.body;

    if (!category) {
      return res.status(400).json({ error: 'Category is required.' });
    }

    const image_url = req.file
      ? req.file.path   // Cloudinary secure URL
      : (req.body.image_url || null);

    const cake = await Cake.create({
      name, description, category,
      price: parseFloat(price) || 0,
      image_url, alt_text
    });

    res.status(201).json(cake);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/cakes/bulk-price — batch update prices
router.put('/admin/bulk-price', auth, async (req, res) => {
  try {
    const { updates } = req.body; // [{ id, price }, ...]
    if (!Array.isArray(updates)) return res.status(400).json({ error: 'updates must be an array.' });

    const ops = updates.map(u => ({
      updateOne: {
        filter: { _id: u.id },
        update: { price: parseFloat(u.price) || 0 }
      }
    }));
    await Cake.bulkWrite(ops);
    res.json({ success: true, updated: updates.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/cakes/:id — update a cake
router.put('/admin/:id', auth, upload.single('image'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid cake ID.' });
    }

    const { name, description, category, price, alt_text, is_active } = req.body;

    const existing = await Cake.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Cake not found.' });

    // If a new image was uploaded and there was a local old image, delete it
    let image_url = existing.image_url;
    if (req.file) {
      // If a new image was uploaded and there was a local old image, delete it
      if (existing.image_url && existing.image_url.startsWith('/uploads/')) {
        const oldPath = path.join(__dirname, '..', existing.image_url);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      // Note: We are not deleting the old image from Cloudinary here to avoid complexity,
      // but it could be done if existing.image_url is a Cloudinary URL.
      image_url = req.file.path;
    } else if (req.body.image_url !== undefined) {
      image_url = req.body.image_url;
    }

    existing.name        = name        !== undefined ? name : existing.name;
    existing.description = description !== undefined ? description : existing.description;
    existing.category    = category    ?? existing.category;
    existing.price       = price !== undefined ? parseFloat(price) : existing.price;
    existing.image_url   = image_url;
    existing.alt_text    = alt_text    ?? existing.alt_text;
    existing.is_active   = is_active !== undefined ? (is_active === 'true' || is_active === true || is_active === 1) : existing.is_active;

    await existing.save();
    res.json(existing);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/cakes/:id — soft delete
router.delete('/admin/:id', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid cake ID.' });
    }
    const existing = await Cake.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Cake not found.' });

    existing.is_active = false;
    await existing.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/cakes/:id/permanent — permanent delete
router.delete('/admin/:id/permanent', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid cake ID.' });
    }
    const existing = await Cake.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Cake not found.' });

    // Physically delete image file if it exists locally
    if (existing.image_url && existing.image_url.startsWith('/uploads/')) {
      const imgPath = path.join(__dirname, '..', existing.image_url);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
    // For Cloudinary, we could also delete it here if we had the public_id stored,
    // but the user primarily wanted to fix the loading issue.

    await Cake.deleteOne({ _id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ADMIN: contact submissions ───────────────────────────────────────────────

// GET /api/admin/contacts
router.get('/admin/contacts', auth, async (req, res) => {
  try {
    const submissions = await ContactSubmission.find().sort({ createdAt: -1 });
    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/contacts/:id — update status
router.put('/admin/contacts/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['new', 'contacted', 'completed'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status.' });

    const existing = await ContactSubmission.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Submission not found.' });

    existing.status = status;
    await existing.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
