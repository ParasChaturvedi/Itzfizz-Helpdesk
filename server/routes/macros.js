const router = require('express').Router();
const ctrl = require('../controllers/macroController');
const { protect, staffOnly } = require('../middleware/auth');

router.use(protect, staffOnly);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.patch('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
