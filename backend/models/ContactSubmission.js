// models/ContactSubmission.js
const mongoose = require('mongoose');

const contactSubmissionSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name:  { type: String, required: true },
  email:      { type: String, required: true },
  phone:      { type: String, default: null },
  occasion:   { type: String, default: '' },
  status:     { type: String, default: 'new', enum: ['new', 'contacted', 'completed'] }
}, { timestamps: true });

module.exports = mongoose.model('ContactSubmission', contactSubmissionSchema);
