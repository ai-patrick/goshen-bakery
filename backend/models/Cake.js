// models/Cake.js
const mongoose = require('mongoose');

const cakeSchema = new mongoose.Schema({
  name:        { type: String, required: false, default: '' },
  description: { type: String, default: '' },
  category:    { type: String, required: true, default: 'celebration' },
  price:       { type: Number, required: true, default: 0 },
  image_url:   { type: String, default: null },
  alt_text:    { type: String, default: '' },
  is_active:   { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Cake', cakeSchema);
