// routes/contact.js
// POST /api/contact — save submission, send email, return WhatsApp link.

const express    = require('express');
const nodemailer = require('nodemailer');
const ContactSubmission = require('../models/ContactSubmission');

const router = express.Router();

// ─── Nodemailer transporter (lazy init so missing SMTP config doesn't crash startup)
function getTransporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

// ─── POST /api/contact ────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { fname, lname, email, phone, occasion } = req.body;

  // Basic validation
  if (!fname || !lname || !email || !occasion) {
    return res.status(400).json({ error: 'First name, last name, email, and occasion are required.' });
  }

  // 1. Save to database
  let submission;
  try {
    submission = await ContactSubmission.create({
      first_name: fname,
      last_name:  lname,
      email,
      phone: phone || null,
      occasion
    });
  } catch (err) {
    console.error('[Contact] DB error:', err.message);
    return res.status(500).json({ error: 'Could not save your request. Please try again.' });
  }

  // 2. Build WhatsApp link
  const waNumber = process.env.WHATSAPP_NUMBER || '254745588748';
  const waText = encodeURIComponent(
    `Hi Goshen Bakery! 🎂\n\nI'm ${fname} ${lname} and I'd like to order a cake.\n\n${occasion}\n\nPlease get in touch at ${email}${phone ? ' or ' + phone : ''}.`
  );
  const whatsappLink = `https://wa.me/${waNumber}?text=${waText}`;

  // 3. Send emails (non-blocking — don't fail the request if SMTP isn't configured)
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const transporter = getTransporter();

    // Email to bakery
    const bakeryHtml = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#6a0dad">New Order Request 🎂</h2>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;color:#4a3060">Name</td>
              <td style="padding:8px;border-bottom:1px solid #eee">${fname} ${lname}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;color:#4a3060">Email</td>
              <td style="padding:8px;border-bottom:1px solid #eee"><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;font-weight:600;color:#4a3060">Phone</td>
              <td style="padding:8px;border-bottom:1px solid #eee">${phone || 'Not provided'}</td></tr>
          <tr><td style="padding:8px;font-weight:600;color:#4a3060;vertical-align:top">Details</td>
              <td style="padding:8px;white-space:pre-wrap">${occasion}</td></tr>
        </table>
        <p style="margin-top:20px">
          <a href="${whatsappLink}" style="background:#25d366;color:#fff;padding:10px 20px;border-radius:50px;text-decoration:none;font-weight:600">
            Reply via WhatsApp
          </a>
        </p>
        <p style="color:#aaa;font-size:12px;margin-top:20px">Submission #${submission._id} — Goshen Home Bakery CRM</p>
      </div>
    `;

    // Auto-reply to customer
    const customerHtml = `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
        <h2 style="color:#6a0dad">We've received your request! 🎂</h2>
        <p>Hi ${fname},</p>
        <p>Thank you for reaching out to <strong>Goshen Home Bakery</strong>. We've received your order request and our team will get back to you within the hour.</p>
        <p>In the meantime, feel free to send us a WhatsApp message for a quicker response:</p>
        <p>
          <a href="${whatsappLink}" style="background:#25d366;color:#fff;padding:10px 20px;border-radius:50px;text-decoration:none;font-weight:600">
            Chat on WhatsApp
          </a>
        </p>
        <p style="color:#888;margin-top:24px">With love,<br><strong>The Goshen Team</strong><br>Kileleshwa, Nairobi</p>
      </div>
    `;

    transporter.sendMail({
      from: `"Goshen Home Bakery" <${process.env.SMTP_USER}>`,
      to:   process.env.BAKERY_EMAIL || process.env.SMTP_USER,
      subject: `New Cake Order from ${fname} ${lname}`,
      html: bakeryHtml
    }).catch(err => console.error('[Mail] Bakery email failed:', err.message));

    transporter.sendMail({
      from: `"Goshen Home Bakery" <${process.env.SMTP_USER}>`,
      to:   email,
      subject: 'We got your order request! 🎂 — Goshen Home Bakery',
      html: customerHtml
    }).catch(err => console.error('[Mail] Customer auto-reply failed:', err.message));
  } else {
    console.warn('[Mail] SMTP credentials not configured — emails skipped.');
  }

  res.json({ success: true, whatsappLink });
});

module.exports = router;
