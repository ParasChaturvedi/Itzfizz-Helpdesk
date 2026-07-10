const router = require('express').Router();
const multer = require('multer');
const ctrl = require('../controllers/webhookController');

// SendGrid Inbound Parse posts multipart/form-data. Accept fields + ignore files.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Public (protected by ?token=). `upload.any()` populates req.body for multipart.
router.post('/inbound-email', upload.any(), ctrl.inboundEmail);

module.exports = router;
