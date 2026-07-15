const mongoose = require('mongoose');

// A macro / canned response: reusable reply text plus optional one-click
// actions (set status/priority, add tags). Shared macros are available to the
// whole team; personal macros only to their owner.
const macroSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '' },
    actions: {
      status: { type: String, default: '' }, // '' | one of Ticket.STATUSES
      priority: { type: String, default: '' }, // '' | one of Ticket.PRIORITIES
      addTags: [{ type: String }],
    },
    scope: { type: String, enum: ['shared', 'personal'], default: 'shared' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ownerName: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Macro || mongoose.model('Macro', macroSchema);
