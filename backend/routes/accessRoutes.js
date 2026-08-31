const express = require('express');
const rateLimit = require('express-rate-limit');
const { getStatus, accessPackage } = require('../controllers/accessController');

const router = express.Router();

// Slows down password brute-forcing independently of the per-package
// maxFailedAttempts lockout, since that lockout is scoped to one package
// while this limits requests per source IP across all packages.
const accessLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many access attempts, please try again later' },
});

router.get('/:token', accessLimiter, getStatus);
router.post('/:token', accessLimiter, accessPackage);

module.exports = router;
