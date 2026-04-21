// models/AdminUser.js
const mongoose = require('mongoose');

const adminUserSchema = new mongoose.Schema({
  username:      { type: String, required: true, unique: true },
  password_hash: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('AdminUser', adminUserSchema);
