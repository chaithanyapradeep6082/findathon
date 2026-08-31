const express = require('express');
const {
  listAllPackages,
  listUsers,
  patchUser,
  listAttempts,
  listAuditLogs,
} = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/packages', listAllPackages);
router.get('/users', listUsers);
router.patch('/users/:id', patchUser);
router.get('/attempts', listAttempts);
router.get('/audit-logs', listAuditLogs);

module.exports = router;
