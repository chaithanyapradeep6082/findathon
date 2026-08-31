const express = require('express');
const {
  createPackage,
  listPackages,
  getPackage,
  revokePackage,
  deletePackage,
} = require('../controllers/packageController');
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(requireAuth);

router.post('/', upload.array('files'), createPackage);
router.get('/', listPackages);
router.get('/:id', getPackage);
router.post('/:id/revoke', revokePackage);
router.delete('/:id', deletePackage);

module.exports = router;
