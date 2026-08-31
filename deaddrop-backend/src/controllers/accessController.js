const Package = require('../models/Package');
const { asyncHandler } = require('../middleware/errorHandler');
const { hashToken } = require('../utils/tokens');
const { attemptReveal, checkStatus } = require('../services/packageAccessService');

// A generic 404 is returned for both "no such token" and "malformed token"
// so probing the endpoint can't distinguish real tokens from guesses.
const NOT_FOUND_RESPONSE = { error: 'This package does not exist or is no longer available' };

async function findPackageByToken(rawToken) {
  return Package.findOne({ accessTokenHash: hashToken(rawToken) });
}

// GET /api/access/:token - metadata only, never the payload.
const getStatus = asyncHandler(async (req, res) => {
  const pkg = await findPackageByToken(req.params.token);
  if (!pkg) return res.status(404).json(NOT_FOUND_RESPONSE);

  const { httpStatus, body } = await checkStatus(pkg, req);
  res.status(httpStatus).json(body);
});

// POST /api/access/:token - the actual access attempt.
const accessPackage = asyncHandler(async (req, res) => {
  const pkg = await findPackageByToken(req.params.token);
  if (!pkg) return res.status(404).json(NOT_FOUND_RESPONSE);

  const { httpStatus, body } = await attemptReveal(pkg, { password: req.body.password, req });
  res.status(httpStatus).json(body);
});

module.exports = { getStatus, accessPackage };
