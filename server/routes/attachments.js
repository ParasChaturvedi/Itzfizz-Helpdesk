const router = require('express').Router();
const ctrl = require('../controllers/attachmentController');
const { protect } = require('../middleware/auth');

// protect() accepts a bearer token OR the httpOnly cookie, so <img src> works.
router.get('/:id', protect, ctrl.get);

module.exports = router;
