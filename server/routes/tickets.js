const router = require('express').Router();
const multer = require('multer');
const ctrl = require('../controllers/ticketController');
const { protect, authorize, staffOnly } = require('../middleware/auth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(protect);

router.get('/', ctrl.list);
router.get('/stats', ctrl.stats);
router.get('/meta/options', ctrl.options);
router.get('/export', staffOnly, ctrl.exportCsv);
router.post('/', ctrl.create);

router.get('/:id', ctrl.get);
router.post('/:id/reply', ctrl.reply);
router.post('/:id/read', ctrl.markRead);
router.post('/:id/attachments', upload.array('files', 6), ctrl.uploadAttachments);

// Only staff can change ticket fields / assignment.
router.patch('/:id', staffOnly, ctrl.update);
router.delete('/:id', authorize('admin'), ctrl.remove);

module.exports = router;
