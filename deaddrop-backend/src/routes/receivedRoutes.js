const express = require('express');
const rateLimit = require('express-rate-limit');
const { listReceived, getReceivedStatus, accessReceivedPackage } = require('../controllers/receivedController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

// Same reasoning as accessRoutes.js: slow down password brute-forcing
// independently of the per-package lockout.
const accessLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many access attempts, please try again later' },
});

router.get('/', listReceived);
router.get('/:id', getReceivedStatus);
router.post('/:id/access', accessLimiter, accessReceivedPackage);

module.exports = router;
