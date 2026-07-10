const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Settings = require('../models/Settings');
const {
  sendEmail,
  ticketCreatedEmail,
  ticketReplyEmail,
  ticketStatusEmail,
  ticketAssignedEmail,
} = require('../utils/email');
const { sendWhatsApp } = require('../utils/notify');

// Clients may only ever touch their own tickets.
function scopeFor(user) {
  if (user.role === 'client') return { requester: user._id };
  return {};
}

function isStaff(user) {
  return user.isStaff === true || User.STAFF_ROLES.includes(user.role);
}

// Compute the SLA due date from a priority using the configured hours.
async function slaDueFrom(priority, from = new Date()) {
  const s = await Settings.get();
  const hours = s.slaHours?.[priority] ?? 24;
  return new Date(from.getTime() + hours * 3600 * 1000);
}

// Fire-and-forget assignment alert (email + WhatsApp).
function notifyAssignee(ticket, agent) {
  if (!agent) return;
  if (agent.email) sendEmail({ to: agent.email, ...ticketAssignedEmail(ticket, agent) });
  sendWhatsApp(
    agent,
    `🎫 ${ticket.reference} assigned to you: "${ticket.subject}" (${ticket.priority}). ${
      process.env.APP_URL || ''
    }/tickets/${ticket._id}`
  );
}

// Hide internal notes from clients.
function serialize(ticket, user) {
  const obj = ticket.toObject ? ticket.toObject() : ticket;
  if (user.role === 'client') {
    obj.messages = (obj.messages || []).filter((m) => !m.isInternalNote);
    obj.activity = [];
  }
  return obj;
}

// GET /api/tickets  — role-scoped list with filters
exports.list = async (req, res) => {
  const { status, priority, department, assignee, mine, q } = req.query;
  const filter = { ...scopeFor(req.user) };

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (department) filter.department = department;
  if (assignee) filter.assignee = assignee;
  if (mine === 'true' && isStaff(req.user)) filter.assignee = req.user._id;
  if (q) filter.$or = [
    { subject: new RegExp(q, 'i') },
    { reference: new RegExp(q, 'i') },
    { requesterEmail: new RegExp(q, 'i') },
  ];

  const tickets = await Ticket.find(filter)
    .populate('assignee', 'name email avatarColor')
    .populate('requester', 'name email avatarColor')
    .sort('-lastReplyAt')
    .limit(300)
    .lean();

  res.json({ tickets });
};

// GET /api/tickets/stats  — dashboard cards
exports.stats = async (req, res) => {
  const base = scopeFor(req.user);
  const [byStatus, byPriority, total, mine, unassigned] = await Promise.all([
    Ticket.aggregate([{ $match: base }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Ticket.aggregate([{ $match: base }, { $group: { _id: '$priority', n: { $sum: 1 } } }]),
    Ticket.countDocuments(base),
    isStaff(req.user) ? Ticket.countDocuments({ assignee: req.user._id }) : 0,
    isStaff(req.user) ? Ticket.countDocuments({ assignee: null }) : 0,
  ]);

  const toMap = (rows) => rows.reduce((a, r) => ({ ...a, [r._id]: r.n }), {});
  res.json({
    total,
    mine,
    unassigned,
    byStatus: toMap(byStatus),
    byPriority: toMap(byPriority),
  });
};

// GET /api/tickets/:id
exports.get = async (req, res) => {
  const ticket = await Ticket.findById(req.params.id)
    .populate('assignee', 'name email avatarColor department')
    .populate('requester', 'name email avatarColor')
    .populate('messages.author', 'name email avatarColor role');
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

  if (req.user.role === 'client' && String(ticket.requester?._id) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Not your ticket' });
  }
  res.json({ ticket: serialize(ticket, req.user) });
};

// POST /api/tickets  — web-created ticket
exports.create = async (req, res) => {
  const { subject, body, priority, department } = req.body;
  if (!subject || !body) {
    return res.status(400).json({ message: 'Subject and message are required' });
  }

  const prio = Ticket.PRIORITIES.includes(priority) ? priority : 'medium';
  const ticket = await Ticket.create({
    subject,
    priority: prio,
    department: Ticket.DEPARTMENTS.includes(department) ? department : 'General',
    slaDueAt: await slaDueFrom(prio),
    requester: req.user._id,
    requesterEmail: req.user.email,
    requesterName: req.user.name,
    source: 'web',
    messages: [
      {
        author: req.user._id,
        authorName: req.user.name,
        authorEmail: req.user.email,
        authorType: req.user.role === 'client' ? 'client' : 'agent',
        body,
        via: 'web',
      },
    ],
    activity: [{ actor: req.user._id, actorName: req.user.name, action: 'created the ticket' }],
  });

  // Auto-responder to the requester.
  const mail = ticketCreatedEmail(ticket);
  sendEmail({ to: ticket.requesterEmail, ...mail });

  res.status(201).json({ ticket });
};

// POST /api/tickets/:id/reply  — add a message or internal note
exports.reply = async (req, res) => {
  const { body, isInternalNote } = req.body;
  if (!body) return res.status(400).json({ message: 'Message body is required' });

  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

  const client = req.user.role === 'client';
  if (client && String(ticket.requester) !== String(req.user._id)) {
    return res.status(403).json({ message: 'Not your ticket' });
  }
  // Only staff can post internal notes.
  const internal = !!isInternalNote && isStaff(req.user);

  ticket.messages.push({
    author: req.user._id,
    authorName: req.user.name,
    authorEmail: req.user.email,
    authorType: client ? 'client' : 'agent',
    body,
    isInternalNote: internal,
    via: 'web',
  });
  ticket.lastReplyAt = new Date();
  // Record first staff response for SLA.
  if (!client && !ticket.firstResponseAt && !internal) ticket.firstResponseAt = new Date();
  // A client replying re-opens a resolved ticket.
  if (client && ticket.status === 'resolved') ticket.status = 'open';
  await ticket.save();

  // Notify the other party (skip internal notes).
  if (!internal) {
    const message = { body };
    if (client) {
      // notify assignee (staff)
      if (ticket.assignee) {
        const agent = await User.findById(ticket.assignee);
        if (agent) sendEmail({ to: agent.email, ...ticketReplyEmail(ticket, message) });
      }
    } else {
      // staff replied → notify the client
      if (ticket.requesterEmail) {
        sendEmail({ to: ticket.requesterEmail, ...ticketReplyEmail(ticket, message) });
      }
    }
  }

  const populated = await ticket.populate('messages.author', 'name email avatarColor role');
  res.status(201).json({ ticket: serialize(populated, req.user) });
};

// PATCH /api/tickets/:id  — staff updates fields (status, assignee, etc.)
exports.update = async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

  const { status, priority, department, assignee, estimatedTime, dueDate, tags } = req.body;
  const changes = [];
  let statusChanged = false;
  let newlyAssigned = null;

  if (status && Ticket.STATUSES.includes(status) && status !== ticket.status) {
    ticket.status = status;
    statusChanged = true;
    changes.push(`changed status to ${status.replace('_', ' ')}`);
    if (status === 'resolved' || status === 'closed') {
      if (!ticket.resolvedAt) ticket.resolvedAt = new Date();
    } else {
      ticket.resolvedAt = undefined; // reopened
    }
  }
  if (priority && Ticket.PRIORITIES.includes(priority) && priority !== ticket.priority) {
    ticket.priority = priority;
    changes.push(`set priority to ${priority}`);
    // Recompute the SLA target from creation time for the new priority.
    if (!ticket.resolvedAt) ticket.slaDueAt = await slaDueFrom(priority, ticket.createdAt);
  }
  if (department && Ticket.DEPARTMENTS.includes(department) && department !== ticket.department) {
    ticket.department = department;
    changes.push(`moved to ${department}`);
  }
  if (assignee !== undefined) {
    if (assignee === null || assignee === '') {
      ticket.assignee = undefined;
      changes.push('unassigned the ticket');
    } else {
      const agent = await User.findById(assignee).select('+whatsappApiKey');
      if (!agent) return res.status(400).json({ message: 'Assignee not found' });
      const wasDifferent = String(ticket.assignee || '') !== String(agent._id);
      ticket.assignee = agent._id;
      changes.push(`assigned to ${agent.name}`);
      if (wasDifferent) newlyAssigned = agent;
    }
  }
  if (estimatedTime !== undefined && estimatedTime !== ticket.estimatedTime) {
    ticket.estimatedTime = estimatedTime;
    changes.push(`set estimate to "${estimatedTime}"`);
  }
  if (dueDate !== undefined) ticket.dueDate = dueDate || undefined;
  if (Array.isArray(tags)) ticket.tags = tags;

  for (const action of changes) {
    ticket.activity.push({ actor: req.user._id, actorName: req.user.name, action });
  }
  await ticket.save();

  // Notify the client about status changes / new estimates.
  if ((statusChanged || estimatedTime !== undefined) && ticket.requesterEmail) {
    sendEmail({ to: ticket.requesterEmail, ...ticketStatusEmail(ticket) });
  }
  // Notify the newly assigned agent via email + WhatsApp.
  if (newlyAssigned) notifyAssignee(ticket, newlyAssigned);

  const populated = await ticket
    .populate('assignee', 'name email avatarColor department')
    .then((t) => t.populate('requester', 'name email avatarColor'));
  res.json({ ticket: serialize(populated, req.user) });
};

// GET /api/tickets/export  — CSV of the (role-scoped, filtered) tickets. Staff only.
exports.exportCsv = async (req, res) => {
  const { status, priority, department, assignee } = req.query;
  const filter = { ...scopeFor(req.user) };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (department) filter.department = department;
  if (assignee) filter.assignee = assignee;

  const tickets = await Ticket.find(filter)
    .populate('assignee', 'name')
    .sort('-createdAt')
    .limit(5000)
    .lean();

  const cols = [
    'reference', 'subject', 'status', 'priority', 'department',
    'requesterName', 'requesterEmail', 'assignee', 'estimatedTime',
    'slaDueAt', 'firstResponseAt', 'resolvedAt', 'source', 'createdAt', 'lastReplyAt',
  ];
  const esc = (v) => {
    if (v === undefined || v === null) return '';
    const s = v instanceof Date ? v.toISOString() : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = tickets.map((t) =>
    cols
      .map((c) => (c === 'assignee' ? esc(t.assignee?.name) : esc(t[c])))
      .join(',')
  );
  const csv = [cols.join(','), ...rows].join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="tickets-${Date.now()}.csv"`);
  res.send(csv);
};

// DELETE /api/tickets/:id — admin only
exports.remove = async (req, res) => {
  const ticket = await Ticket.findByIdAndDelete(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
  res.json({ message: 'Ticket deleted' });
};

// GET /api/tickets/meta/options — enums for the UI
exports.options = (req, res) => {
  res.json({
    statuses: Ticket.STATUSES,
    priorities: Ticket.PRIORITIES,
    departments: Ticket.DEPARTMENTS,
    roles: User.ROLES,
  });
};
