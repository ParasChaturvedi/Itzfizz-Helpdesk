const { sweep } = require('../services/slaService');

// Is this request an authorised scheduler? Vercel Cron (and any external
// scheduler) sends `Authorization: Bearer <CRON_SECRET>`.
function cronAuthed(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return null; // not configured — see tick() for dev fallback
  return (req.headers.authorization || '') === `Bearer ${secret}`;
}

// POST /api/sla/tick — called by the scheduler. Not behind `protect`.
exports.tick = async (req, res) => {
  const authed = cronAuthed(req);
  // If a CRON_SECRET is configured it must match; if not, allow (dev convenience).
  if (authed === false) return res.status(401).json({ message: 'Unauthorized' });
  const result = await sweep();
  res.json({ ok: true, ...result });
};

// POST /api/sla/run — admin "run SLA check now" button.
exports.run = async (req, res) => {
  const result = await sweep();
  res.json({ ok: true, ...result });
};
