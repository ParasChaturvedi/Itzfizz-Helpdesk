const User = require('../models/User');
const { signToken } = require('../utils/token');

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function palette(seed) {
  const colors = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  let h = 0;
  for (const c of seed) h = (h + c.charCodeAt(0)) % colors.length;
  return colors[h];
}

// POST /api/auth/register  — public self-signup always creates a "client".
exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) return res.status(409).json({ message: 'Email already registered' });

  const isFirstUser = (await User.countDocuments()) === 0;
  const user = await User.create({
    name,
    email,
    password,
    role: isFirstUser ? 'admin' : 'client', // first ever account becomes admin
    avatarColor: palette(email),
  });

  const token = signToken(user);
  res.cookie('token', token, COOKIE_OPTS);
  res.status(201).json({ token, user: user.toJSON() });
};

// POST /api/auth/login  — accepts email OR username as `identifier` (or `email`).
exports.login = async (req, res) => {
  const { email, identifier, password } = req.body;
  const login = (identifier || email || '').toLowerCase().trim();
  if (!login || !password) {
    return res.status(400).json({ message: 'Email/username and password are required' });
  }
  const user = await User.findOne({
    $or: [{ email: login }, { username: login }],
  }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  if (!user.active) return res.status(403).json({ message: 'Account disabled' });

  const token = signToken(user);
  res.cookie('token', token, COOKIE_OPTS);
  res.json({ token, user: user.toJSON() });
};

// POST /api/auth/logout
exports.logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
};

// GET /api/auth/me
exports.me = async (req, res) => {
  res.json({ user: req.user.toJSON() });
};
