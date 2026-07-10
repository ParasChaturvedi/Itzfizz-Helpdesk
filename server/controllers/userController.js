const User = require('../models/User');

const ROLES = User.ROLES;
const STAFF_ROLES = User.STAFF_ROLES;

function normUsername(u) {
  const v = (u || '').toLowerCase().trim();
  return v || undefined; // undefined so the sparse unique index skips it
}

// GET /api/users  — admin only. Optional ?role=agent
exports.list = async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  const users = await User.find(filter).sort('-createdAt');
  res.json({ users });
};

// GET /api/users/agents — staff (for the assignee dropdown). All staff roles.
exports.agents = async (req, res) => {
  const agents = await User.find({ role: { $in: STAFF_ROLES }, active: true })
    .select('name email role department avatarColor')
    .sort('name');
  res.json({ agents });
};

// POST /api/users — admin provisions any account (sets username + password)
exports.create = async (req, res) => {
  const { name, email, username, password, role, department, phone, whatsappApiKey } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }
  const emailLc = email.toLowerCase().trim();
  if (await User.findOne({ email: emailLc })) {
    return res.status(409).json({ message: 'Email already registered' });
  }
  const uname = normUsername(username);
  if (uname && (await User.findOne({ username: uname }))) {
    return res.status(409).json({ message: 'Username already taken' });
  }

  const user = await User.create({
    name,
    email: emailLc,
    username: uname,
    password,
    role: ROLES.includes(role) ? role : 'client',
    department: department || '',
    phone: phone || '',
    whatsappApiKey: whatsappApiKey || '',
    mustChangePassword: true, // admin-set password — prompt user to change it
  });
  res.status(201).json({ user: user.toJSON() });
};

// PATCH /api/users/:id — admin updates any field
exports.update = async (req, res) => {
  const { role, department, active, name, username, phone, whatsappApiKey, password } = req.body;
  const user = await User.findById(req.params.id).select('+password');
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (typeof name === 'string') user.name = name;
  if (role && ROLES.includes(role)) user.role = role;
  if (typeof department === 'string') user.department = department;
  if (typeof phone === 'string') user.phone = phone;
  if (typeof whatsappApiKey === 'string') user.whatsappApiKey = whatsappApiKey;
  if (typeof active === 'boolean') user.active = active;
  if (username !== undefined) {
    const uname = normUsername(username);
    if (uname && (await User.findOne({ username: uname, _id: { $ne: user._id } }))) {
      return res.status(409).json({ message: 'Username already taken' });
    }
    user.username = uname;
  }
  if (password) {
    user.password = password; // admin resets password
    user.mustChangePassword = true;
  }
  await user.save();
  res.json({ user: user.toJSON() });
};

// DELETE /api/users/:id — admin
exports.remove = async (req, res) => {
  if (String(req.user._id) === req.params.id) {
    return res.status(400).json({ message: 'You cannot delete your own account' });
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json({ message: 'User deleted' });
};

// PATCH /api/users/me — update own profile (name, password, notification channels)
exports.updateMe = async (req, res) => {
  const { name, password, phone, whatsappApiKey } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (name) user.name = name;
  if (typeof phone === 'string') user.phone = phone;
  if (typeof whatsappApiKey === 'string') user.whatsappApiKey = whatsappApiKey;
  if (password) {
    user.password = password;
    user.mustChangePassword = false;
  }
  await user.save();
  res.json({ user: user.toJSON() });
};
