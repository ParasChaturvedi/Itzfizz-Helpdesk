const User = require('../models/User');

// GET /api/users  — admin only. Optional ?role=agent
exports.list = async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  const users = await User.find(filter).sort('-createdAt');
  res.json({ users });
};

// GET /api/users/agents — admin + agent (for the assignee dropdown)
exports.agents = async (req, res) => {
  const agents = await User.find({ role: { $in: ['agent', 'admin'] }, active: true })
    .select('name email role department avatarColor')
    .sort('name');
  res.json({ agents });
};

// POST /api/users — admin creates agents / other admins / clients
exports.create = async (req, res) => {
  const { name, email, password, role, department } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(409).json({ message: 'Email already registered' });

  const user = await User.create({
    name,
    email,
    password,
    role: ['admin', 'agent', 'client'].includes(role) ? role : 'client',
    department: department || '',
  });
  res.status(201).json({ user: user.toJSON() });
};

// PATCH /api/users/:id — admin updates role/department/active
exports.update = async (req, res) => {
  const { role, department, active, name } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (typeof name === 'string') user.name = name;
  if (role && ['admin', 'agent', 'client'].includes(role)) user.role = role;
  if (typeof department === 'string') user.department = department;
  if (typeof active === 'boolean') user.active = active;
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

// PATCH /api/users/me — update own profile
exports.updateMe = async (req, res) => {
  const { name, password } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (name) user.name = name;
  if (password) user.password = password;
  await user.save();
  res.json({ user: user.toJSON() });
};
