const router = require('express').Router();
const ctrl = require('../controllers/slaController');
const { protect, authorize } = require('../middleware/auth');

// Scheduler entry point (Vercel Cron / external) — auth via CRON_SECRET header.
router.post('/tick', ctrl.tick);

// Admin "run SLA check now" button.
router.post('/run', protect, authorize('admin'), ctrl.run);

module.exports = router;
