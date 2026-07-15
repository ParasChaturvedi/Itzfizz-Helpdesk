const mongoose = require('mongoose');

// A managed, colour-coded tag that staff can apply to tickets for
// categorisation, filtering and reporting.
const tagSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    color: { type: String, default: '#64748b' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Tag || mongoose.model('Tag', tagSchema);
