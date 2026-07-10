const Attachment = require('../models/Attachment');
const Ticket = require('../models/Ticket');
const User = require('../models/User');

function canAccessTicket(user, ticket) {
  if (user.role === 'admin') return true;
  const reqId = String(ticket.requester || '');
  const asgId = String(ticket.assignee || '');
  if (user.role === 'client') return reqId === String(user._id);
  return asgId === String(user._id);
}

// GET /api/attachments/:id — streams the file (auth via bearer or cookie so
// <img src> and download links work). Access is scoped to the ticket.
exports.get = async (req, res) => {
  const att = await Attachment.findById(req.params.id).select('+data');
  if (!att) return res.status(404).json({ message: 'Attachment not found' });

  const ticket = await Ticket.findById(att.ticket).select('requester assignee');
  if (!ticket || !canAccessTicket(req.user, ticket)) {
    return res.status(403).json({ message: 'No access to this attachment' });
  }

  const inline = /^image\//.test(att.type);
  res.setHeader('Content-Type', att.type || 'application/octet-stream');
  res.setHeader(
    'Content-Disposition',
    `${inline ? 'inline' : 'attachment'}; filename="${att.name.replace(/"/g, '')}"`
  );
  res.setHeader('Cache-Control', 'private, max-age=86400');
  res.send(att.data);
};
