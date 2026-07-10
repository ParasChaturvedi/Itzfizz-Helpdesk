const mongoose = require('mongoose');

// File attachments stored in their own collection (kept out of the ticket doc
// so the ticket stays light). Served via GET /api/attachments/:id with access
// control. Fine for small files on the Atlas free tier; swap for Vercel Blob /
// Cloudinary later if volume grows.
const attachmentSchema = new mongoose.Schema(
  {
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', index: true, required: true },
    name: { type: String, required: true },
    type: { type: String, default: 'application/octet-stream' },
    size: { type: Number, default: 0 },
    data: { type: Buffer, required: true, select: false }, // not returned by default
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Attachment || mongoose.model('Attachment', attachmentSchema);
