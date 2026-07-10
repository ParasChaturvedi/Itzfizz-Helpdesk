const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { sendEmail, ticketCreatedEmail } = require('../utils/email');

async function slaDueFrom(priority = 'medium', from = new Date()) {
  const s = await Settings.get();
  const hours = s.slaHours?.[priority] ?? 24;
  return new Date(from.getTime() + hours * 3600 * 1000);
}

// Parse "Alice Smith <alice@x.com>" → { name, email }
function parseFrom(raw = '') {
  const m = raw.match(/^\s*"?([^"<]*)"?\s*<?([^>\s]+@[^>\s]+)>?/);
  if (m) return { name: (m[1] || '').trim(), email: m[2].toLowerCase().trim() };
  return { name: '', email: raw.toLowerCase().trim() };
}

// Pull an existing ticket reference out of a subject line: "Re: [TKT-000123] ..."
function findReference(subject = '') {
  const m = subject.match(/TKT-\d{4,}/i);
  return m ? m[0].toUpperCase() : null;
}

// Strip quoted history so replies don't balloon the ticket.
function cleanBody(text = '') {
  const lines = text.split('\n');
  const out = [];
  for (const line of lines) {
    if (/^On .* wrote:$/.test(line.trim())) break;
    if (/^-----Original Message-----/.test(line.trim())) break;
    if (line.trim().startsWith('>')) continue;
    out.push(line);
  }
  return out.join('\n').trim() || text.trim();
}

/**
 * POST /api/webhooks/inbound-email?token=SECRET
 * Consumes SendGrid Inbound Parse (multipart/form-data). Also works with any
 * source that posts { from, subject, text } as form fields or JSON.
 */
exports.inboundEmail = async (req, res) => {
  if (
    process.env.INBOUND_WEBHOOK_TOKEN &&
    req.query.token !== process.env.INBOUND_WEBHOOK_TOKEN
  ) {
    return res.status(401).json({ message: 'Invalid webhook token' });
  }

  const b = req.body || {};
  const { name, email } = parseFrom(b.from || b.sender || '');
  if (!email) return res.status(400).json({ message: 'Could not determine sender' });

  const subject = (b.subject || '(no subject)').trim();
  const body = cleanBody(b.text || b.plain || b.html || '');

  // Find or create the requesting client.
  let user = await User.findOne({ email });
  if (!user) {
    const randomPass = Math.random().toString(36).slice(2) + Date.now().toString(36);
    user = await User.create({
      name: name || email.split('@')[0],
      email,
      password: randomPass, // account exists; user can reset later
      role: 'client',
    });
  }

  // Reply to an existing ticket?
  const ref = findReference(subject);
  if (ref) {
    const existing = await Ticket.findOne({ reference: ref });
    if (existing) {
      existing.messages.push({
        author: user._id,
        authorName: user.name,
        authorEmail: email,
        authorType: 'client',
        body,
        via: 'email',
      });
      existing.lastReplyAt = new Date();
      if (existing.status === 'resolved' || existing.status === 'closed') {
        existing.status = 'open';
        existing.activity.push({ actorName: user.name, action: 'reopened via email reply' });
      }
      await existing.save();
      return res.json({ ok: true, ticket: existing.reference, action: 'reply' });
    }
  }

  // Otherwise create a brand-new ticket.
  const ticket = await Ticket.create({
    subject: subject.replace(/^(re|fwd):\s*/i, '').trim() || '(no subject)',
    slaDueAt: await slaDueFrom('medium'),
    requester: user._id,
    requesterEmail: email,
    requesterName: user.name,
    source: 'email',
    messages: [
      {
        author: user._id,
        authorName: user.name,
        authorEmail: email,
        authorType: 'client',
        body,
        via: 'email',
      },
    ],
    activity: [{ actorName: user.name, action: 'created the ticket via email' }],
  });

  sendEmail({ to: email, ...ticketCreatedEmail(ticket) });
  res.json({ ok: true, ticket: ticket.reference, action: 'created' });
};
