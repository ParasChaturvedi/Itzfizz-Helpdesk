const { verifyToken } = require('../utils/token');
const User = require('../models/User');

// Verifies the JWT (Authorization: Bearer <token> or httpOnly cookie) and
// attaches the current user to req.user.
async function protect(req, res, next) {
  try {
    let token;
    const header = req.headers.authorization;
    if (header && header.startsWith('Bearer ')) {
      token = header.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    if (!token) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    if (!user || !user.active) {
      return res.status(401).json({ message: 'Account not found or disabled' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Role-based access control. Usage: authorize('admin'), authorize('admin','agent')
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: 'You do not have permission to perform this action' });
    }
    next();
  };
}

module.exports = { protect, authorize };
