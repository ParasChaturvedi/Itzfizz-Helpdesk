const router = require('express').Router();
const ctrl = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Self-service
router.patch('/me', ctrl.updateMe);

// Staff can read the agent list (for assignee dropdowns)
router.get('/agents', authorize('admin', 'agent'), ctrl.agents);

// Admin-only user management
router.get('/', authorize('admin'), ctrl.list);
router.post('/', authorize('admin'), ctrl.create);
router.patch('/:id', authorize('admin'), ctrl.update);
router.delete('/:id', authorize('admin'), ctrl.remove);

module.exports = router;
