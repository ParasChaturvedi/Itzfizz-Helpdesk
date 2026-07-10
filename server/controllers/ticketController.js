const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Settings = require('../models/Settings');
const {
  sendEmail,
  ticketCreatedEmail,
  ticketReplyEmail,
  ticketStatusEmail,
  ticketAssignedEmail,
  ticketCreatedAdminEmail,
  ticketAssignedClientEmail,
} = require('../utils/email');
const { sendWhatsApp } = require('../utils/notify');

const APP = () => process.env.APP_URL || '';
const ROLE_LABELS = {
  admin: 'Admin', developer: 'Developer', designer: 'Designer',
  content_writer: 'Content Writer', hr: 'HR', agent: 'Agent', client: 'Client',
};
const roleLabel = (r) => ROLE_LABELS[r] || r;
const statusLabel = (s) => (s || '').replace('_', ' ');

function isStaff(user) {
  return user.isStaff === true || User.STAFF_ROLES.includes(user.role);
}
function isAdmin(user) {
  return user.role === 'admin';
}

// Visibility scope. A ticket is a private discussion between the client who
// raised it, the team member it's assigned to, and admins.
//   admin  → every ticket (they triage & assign)
//   client → only tickets they raised
//   staff  → only tickets assigned to them
function scopeFor(user) {
  if (isAdmin(user)) return {};
  if (user.role === 'client') return { requester: user._id };
  return { assignee: user._id };
}

// Can this user open / discuss this specific ticket?
function canAccess(user, ticket) {
  if (isAdmin(user)) return true;
  const reqId = String(ticket.requester?._id || ticket.requester || '');
  const asgId = String(ticket.assignee?._id || ticket.assignee || '');
  if (user.role === 'client') return reqId === String(user._id);
  return asgId === String(user._id); // staff: only if assigned to them
}

// Compute the SLA due date from a priority using the configured hours.
async function slaDueFrom(priority, from = new Date()) {
  const s = await Settings.get();
  const hours = s.slaHours?.[priority] ?? 24;
  return new Date(from.getTime() + hours * 3600 * 1000);
}

// Assignment alerts (email + WhatsApp) — to the agent AND back to the client.
async function notifyAssignment(ticket, agent) {
  if (!agent) return;
  // → assigned team member
  if (agent.email) sendEmail({ to: agent.email, ...ticketAssignedEmail(ticket, agent) });
  sendWhatsApp(
    agent,
    `🎫 Ticket ${ticket.reference} — ${ticket.requesterName || 'a client'} ne raise ki thi, admin ne aapko assign ki: "${ticket.subject}" (${ticket.priority}). ${APP()}/tickets/${ticket._id}`
  );
  // → client (needs their phone/key for WhatsApp; email always works)
  if (ticket.requesterEmail) {
    sendEmail({ to: ticket.requesterEmail, ...ticketAssignedClientEmail(ticket, agent, roleLabel(agent.role)) });
  }
  const requester = ticket.requester
    ? await User.findById(ticket.requester).select('+whatsappApiKey')
    : null;
  if (requester) {
    sendWhatsApp(
      requester,
      `👨‍💻 Aapki ticket ${ticket.reference} "${ticket.subject}" ab ${agent.name} (${roleLabel(agent.role)}) ko assign ho gayi — woh ispe kaam kar rahe hain. ${APP()}/tickets/${ticket._id}`
    );
  }
}

// New-ticket alerts — confirmation to the client + heads-up to every admin.
async function notifyNewTicket(ticket, requesterUser) {
  // → client confirmation
  if (ticket.requesterEmail) sendEmail({ to: ticket.requesterEmail, ...ticketCreatedEmail(ticket) });
  if (requesterUser) {
    sendWhatsApp(
      requesterUser,
      `✅ Aapki ticket ${ticket.reference} "${ticket.subject}" Itzfizz Helpdesk me submit ho gayi. Humari team jald ispe kaam karegi. ${APP()}/tickets/${ticket._id}`
    );
  }
  // → all admins
  const admins = await User.find({ role: 'admin', active: true }).select('+whatsappApiKey');
  for (const a of admins) {
    if (a.email) sendEmail({ to: a.email, ...ticketCreatedAdminEmail(ticket) });
    sendWhatsApp(
      a,
      `🆕 Nayi ticket ${ticket.reference} — ${ticket.requesterName || ticket.requesterEmail} ne raise ki: "${ticket.subject}" (${ticket.priority}, ${ticket.department}). ${APP()}/tickets/${ticket._id}`
    );
  }
}

// Status-change alert to the client (email + WhatsApp).
async function notifyStatus(ticket) {
  if (ticket.requesterEmail) sendEmail({ to: ticket.requesterEmail, ...ticketStatusEmail(ticket) });
  const requester = ticket.requester
    ? await User.findById(ticket.requester).select('+whatsappApiKey')
    : null;
  if (requester) {
    const done = ['resolved', 'closed'].includes(ticket.status);
    const msg = done
      ? `🎉 Aapki ticket ${ticket.reference} "${ticket.subject}" ${statusLabel(ticket.status)} ho gayi hai. Dhanyavaad!`
      : `📣 Aapki ticket ${ticket.reference} ka status ab "${statusLabel(ticket.status)}" hai.${ticket.estimatedTime ? ` Estimated: ${ticket.estimatedTime}.` : ''}`;
    sendWhatsApp(requester, `${msg} ${APP()}/tickets/${ticket._id}`);
  }
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
    isAdmin(req.user) ? Ticket.countDocuments({ assignee: null }) : 0,
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

  if (!canAccess(req.user, ticket)) {
    return res.status(403).json({ message: 'You do not have access to this ticket' });
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

  // Confirm to the client + alert every admin (email + WhatsApp).
  notifyNewTicket(ticket, req.user);

  res.status(201).json({ ticket });
};

// POST /api/tickets/:id/reply  — add a message or internal note
exports.reply = async (req, res) => {
  const { body, isInternalNote } = req.body;
  if (!body) return res.status(400).json({ message: 'Message body is required' });

  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

  const client = req.user.role === 'client';
  if (!canAccess(req.user, ticket)) {
    return res.status(403).json({ message: 'You do not have access to this ticket' });
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

  // Only admin or the assigned team member may change a ticket.
  if (!canAccess(req.user, ticket)) {
    return res.status(403).json({ message: 'You do not have access to this ticket' });
  }

  const { status, priority, department, assignee, estimatedTime, dueDate, tags } = req.body;
  // Routing (assign / department) is admin-only; the assignee handles the work.
  if ((assignee !== undefined || department !== undefined) && !isAdmin(req.user)) {
    return res.status(403).json({ message: 'Only an admin can assign or change department' });
  }
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

  // Notify the client on status changes / new estimates (email + WhatsApp).
  if (statusChanged || estimatedTime !== undefined) notifyStatus(ticket);
  // Notify the newly assigned team member AND the client (email + WhatsApp).
  if (newlyAssigned) notifyAssignment(ticket, newlyAssigned);

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
