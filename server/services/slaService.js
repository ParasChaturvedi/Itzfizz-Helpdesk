// SLA & auto-escalation sweep. Runs on a schedule (Vercel Cron or an external
// scheduler hitting /api/sla/tick with the CRON_SECRET) and can also be run
// on demand by an admin. It operates purely on ticket METADATA (priority,
// status, timestamps) — it never reads message content — so it is safe to run
// against encrypted tickets in future confidentiality tiers.
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const Settings = require('../models/Settings');
const { sendEmail, slaBreachEmail } = require('../utils/email');
const { background } = require('../utils/background');

const OPEN_STATES = ['open', 'in_progress', 'on_hold'];
const PRIORITY_ORDER = ['low', 'medium', 'high', 'urgent'];

function bumpPriority(p) {
  const i = PRIORITY_ORDER.indexOf(p);
  return PRIORITY_ORDER[Math.min(i + 1, PRIORITY_ORDER.length - 1)];
}

// Email the assignee + all admins about an SLA event (metadata only).
async function notifyBreach(ticket, label) {
  const recipients = new Set();
  if (ticket.assignee) {
    const a = await User.findById(ticket.assignee).select('email');
    if (a && a.email) recipients.add(a.email);
  }
  const admins = await User.find({ role: 'admin', active: true }).select('email');
  admins.forEach((a) => a.email && recipients.add(a.email));

  const jobs = [];
  for (const to of recipients) jobs.push(sendEmail({ to, ...slaBreachEmail(ticket, label) }));
  await Promise.allSettled(jobs);
}

/**
 * Run one SLA sweep.
 * @param {Date}   now           reference time
 * @param {number} warnWindowMin how many minutes before the resolution due
 *                               time to raise an "approaching breach" warning
 * @returns {{escalated:number, firstResponseBreached:number, warned:number}}
 */
async function sweep(now = new Date(), warnWindowMin = 60) {
  const settings = await Settings.get();
  const esc = settings.slaEscalation || {};
  const escalationOn = esc.enabled !== false;
  const bumpOn = esc.bumpPriority !== false;

  // 1) Resolution breaches — overdue and not yet flagged.
  const resBreaches = await Ticket.find({
    status: { $in: OPEN_STATES },
    slaDueAt: { $lt: now },
    slaBreachedAt: { $exists: false },
  }).limit(500);

  let escalated = 0;
  for (const t of resBreaches) {
    t.slaBreachedAt = now;
    if (escalationOn) {
      t.escalationLevel = (t.escalationLevel || 0) + 1;
      if (bumpOn && t.priority !== 'urgent') t.priority = bumpPriority(t.priority);
      t.activity.push({
        actorName: 'SLA Engine',
        action: `escalated — resolution SLA breached (level ${t.escalationLevel})`,
      });
    }
    await t.save();
    escalated += 1;
    background(notifyBreach(t, 'Resolution SLA breached'));
  }

  // 2) First-response breaches — still open with no first staff reply, overdue.
  const frBreaches = await Ticket.find({
    status: 'open',
    firstResponseAt: { $exists: false },
    firstResponseDueAt: { $lt: now },
    firstResponseBreached: { $ne: true },
  }).limit(500);

  let firstResponseBreached = 0;
  for (const t of frBreaches) {
    t.firstResponseBreached = true;
    t.activity.push({ actorName: 'SLA Engine', action: 'first-response SLA breached' });
    await t.save();
    firstResponseBreached += 1;
    background(notifyBreach(t, 'First-response SLA breached'));
  }

  // 3) Approaching-breach warnings — due soon, not yet warned or breached.
  const warnBefore = new Date(now.getTime() + warnWindowMin * 60000);
  const warns = await Ticket.find({
    status: { $in: OPEN_STATES },
    slaDueAt: { $gte: now, $lt: warnBefore },
    slaWarned: { $ne: true },
    slaBreachedAt: { $exists: false },
  }).limit(500);

  let warned = 0;
  for (const t of warns) {
    t.slaWarned = true;
    await t.save();
    warned += 1;
    background(notifyBreach(t, 'SLA approaching breach'));
  }

  return { escalated, firstResponseBreached, warned };
}

module.exports = { sweep, OPEN_STATES };
