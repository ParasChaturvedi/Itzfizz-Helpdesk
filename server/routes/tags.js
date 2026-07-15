const router = require('express').Router();
const ctrl = require('../controllers/tagController');
const { protect, authorize, staffOnly } = require('../middleware/auth');

router.use(protect);

router.get('/', ctrl.list);
router.post('/', staffOnly, ctrl.create);
router.delete('/:id', authorize('admin'), ctrl.remove);

module.exports = router;
