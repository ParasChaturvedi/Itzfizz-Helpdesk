const Macro = require('../models/Macro');
const Ticket = require('../models/Ticket');

// Keep only recognised, safe action values.
function sanitizeActions(a = {}) {
  const status = Ticket.STATUSES.includes(a.status) ? a.status : '';
  const priority = Ticket.PRIORITIES.includes(a.priority) ? a.priority : '';
  const addTags = Array.isArray(a.addTags)
    ? a.addTags.map((t) => String(t).trim()).filter(Boolean).slice(0, 20)
    : [];
  return { status, priority, addTags };
}

function canEdit(user, macro) {
  if (user.role === 'admin') return true;
  return String(macro.owner || '') === String(user._id);
}

// GET /api/macros — shared macros + this user's personal ones.
exports.list = async (req, res) => {
  const macros = await Macro.find({
    $or: [{ scope: 'shared' }, { owner: req.user._id }],
  })
    .sort('title')
    .lean();
  res.json({ macros });
};

// POST /api/macros
exports.create = async (req, res) => {
  const { title, body, actions, scope } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ message: 'A title is required' });
  const macro = await Macro.create({
    title: title.trim(),
    body: body || '',
    actions: sanitizeActions(actions),
    scope: scope === 'personal' ? 'personal' : 'shared',
    owner: req.user._id,
    ownerName: req.user.name,
  });
  res.status(201).json({ macro });
};

// PATCH /api/macros/:id
exports.update = async (req, res) => {
  const macro = await Macro.findById(req.params.id);
  if (!macro) return res.status(404).json({ message: 'Macro not found' });
  if (!canEdit(req.user, macro)) {
    return res.status(403).json({ message: 'You can only edit your own or shared macros' });
  }
  const { title, body, actions, scope } = req.body;
  if (typeof title === 'string' && title.trim()) macro.title = title.trim();
  if (typeof body === 'string') macro.body = body;
  if (actions) macro.actions = sanitizeActions(actions);
  if (scope === 'shared' || scope === 'personal') macro.scope = scope;
  await macro.save();
  res.json({ macro });
};

// DELETE /api/macros/:id
exports.remove = async (req, res) => {
  const macro = await Macro.findById(req.params.id);
  if (!macro) return res.status(404).json({ message: 'Macro not found' });
  if (!canEdit(req.user, macro)) {
    return res.status(403).json({ message: 'You can only delete your own or shared macros' });
  }
  await macro.deleteOne();
  res.json({ message: 'Macro deleted' });
};
