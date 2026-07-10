const router = require('express').Router();
const ctrl = require('../controllers/ticketController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', ctrl.list);
router.get('/stats', ctrl.stats);
router.get('/meta/options', ctrl.options);
router.post('/', ctrl.create);

router.get('/:id', ctrl.get);
router.post('/:id/reply', ctrl.reply);

// Only staff can change ticket fields / assignment.
router.patch('/:id', authorize('admin', 'agent'), ctrl.update);
router.delete('/:id', authorize('admin'), ctrl.remove);

module.exports = router;
