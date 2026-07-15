const mongoose = require('mongoose');
const Counter = require('./Counter');

const STATUSES = ['open', 'in_progress', 'on_hold', 'resolved', 'closed'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const DEPARTMENTS = ['General', 'Design', 'Development', 'Sales', 'Billing'];

const messageSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Snapshot of who sent it (email-sourced messages may have no User).
    authorName: { type: String, default: '' },
    authorEmail: { type: String, default: '' },
    authorType: {
      type: String,
      enum: ['client', 'agent', 'system'],
      default: 'agent',
    },
    body: { type: String, default: '' },
    // File attachments (references into the Attachment collection).
    attachments: [
      {
        ref: { type: mongoose.Schema.Types.ObjectId, ref: 'Attachment' },
        name: { type: String },
        type: { type: String }, // explicit — "type" is a reserved key in Mongoose
        size: { type: Number },
      },
    ],
    // Internal notes are visible to agents/admins only, never to the client.
    isInternalNote: { type: Boolean, default: false },
    via: { type: String, enum: ['web', 'email'], default: 'web' },
    // Read receipts — who has received / seen this message.
    deliveredTo: [
      { user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: Date },
    ],
    readBy: [
      { user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: Date },
    ],
  },
  { timestamps: true }
);

const activitySchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorName: { type: String, default: '' },
    action: { type: String, required: true }, // e.g. "changed status to in_progress"
  },
  { timestamps: true }
);

const ticketSchema = new mongoose.Schema(
  {
    number: { type: Number, unique: true, index: true },
    reference: { type: String, unique: true, index: true }, // TKT-000123
    subject: { type: String, required: true, trim: true },

    status: { type: String, enum: STATUSES, default: 'open', index: true },
    priority: { type: String, enum: PRIORITIES, default: 'medium', index: true },
    department: { type: String, enum: DEPARTMENTS, default: 'General', index: true },
    tags: [{ type: String }],

    // The client who owns the ticket. May be created on the fly from an email.
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    requesterEmail: { type: String, default: '' },
    requesterName: { type: String, default: '' },

    // The agent responsible for it.
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },

    estimatedTime: { type: String, default: '' }, // free text, e.g. "2-3 days"
    dueDate: { type: Date },

    // SLA tracking.
    slaDueAt: { type: Date }, // when a resolution is due, computed from priority
    firstResponseAt: { type: Date }, // first staff reply
    resolvedAt: { type: Date }, // when moved to resolved/closed

    // First-response SLA + auto-escalation (managed by the SLA engine).
    firstResponseDueAt: { type: Date },
    firstResponseBreached: { type: Boolean, default: false },
    escalationLevel: { type: Number, default: 0 },
    slaBreachedAt: { type: Date }, // resolution breach — set once, prevents re-escalation
    slaWarned: { type: Boolean, default: false }, // approaching-breach warning sent

    // Customer satisfaction rating — the client rates once the ticket is resolved.
    csat: {
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String, default: '' },
      submittedAt: { type: Date },
    },

    source: { type: String, enum: ['web', 'email'], default: 'web' },
    messages: [messageSchema],
    activity: [activitySchema],

    lastReplyAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Assign a sequential number + reference before the first save.
ticketSchema.pre('validate', async function (next) {
  if (this.isNew && !this.number) {
    try {
      const seq = await Counter.next('ticket');
      this.number = seq;
      this.reference = `TKT-${String(seq).padStart(6, '0')}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

ticketSchema.statics.STATUSES = STATUSES;
ticketSchema.statics.PRIORITIES = PRIORITIES;
ticketSchema.statics.DEPARTMENTS = DEPARTMENTS;

const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', ticketSchema);
Ticket.STATUSES = STATUSES;
Ticket.PRIORITIES = PRIORITIES;
Ticket.DEPARTMENTS = DEPARTMENTS;
module.exports = Ticket;
