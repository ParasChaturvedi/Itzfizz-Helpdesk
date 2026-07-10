const router = require('express').Router();
const ctrl = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/auth');

// Public brand read (login page needs it before auth).
router.get('/', ctrl.get);

// Admin updates.
router.patch('/', protect, authorize('admin'), ctrl.update);

module.exports = router;
