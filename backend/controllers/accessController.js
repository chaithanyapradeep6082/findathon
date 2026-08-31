const path = require('path');
const fs = require('fs/promises');
const bcrypt = require('bcryptjs');

const Package = require('../models/Package');
const AccessAttempt = require('../models/AccessAttempt');
const { asyncHandler } = require('../middleware/errorHandler');
const { decryptText, decryptBuffer } = require('../utils/crypto');
const { hashToken } = require('../utils/tokens');
const { logAudit } = require('../utils/audit');

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

// A generic 404 is returned for both "no such token" and "malformed token"
// so probing the endpoint can't distinguish real tokens from guesses.
const NOT_FOUND_RESPONSE = { error: 'This package does not exist or is no longer available' };

async function findPackageByToken(rawToken) {
  return Package.findOne({ accessTokenHash: hashToken(rawToken) });
}

// If a package's expiry has silently passed since it was last touched,
// flip it to EXPIRED before evaluating anything else. This is the lazy
// half of expiry enforcement; jobs/expirySweeper.js is the proactive half.
async function applyLazyExpiry(pkg) {
  if (pkg.state === 'ACTIVE' && pkg.expiresAt.getTime() < Date.now()) {
    pkg.state = 'EXPIRED';
    await pkg.save();
    await logAudit({
      action: 'PACKAGE_EXPIRED',
      targetType: 'PACKAGE',
      targetId: pkg._id,
      metadata: { trigger: 'lazy-check-on-access' },
    });
  }
  return pkg;
}

async function recordAttempt(pkg, outcome, req) {
  await AccessAttempt.create({
    packageId: pkg._id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    outcome,
    userId: req.user ? req.user._id : null,
  });
}

// Maps a non-ACTIVE package state to the AccessAttempt outcome it represents.
const STATE_TO_OUTCOME = {
  BURNED: 'VIEW_LIMIT_REACHED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
  LOCKED: 'LOCKED',
};

// GET /api/access/:token - metadata only, never the payload.
const getStatus = asyncHandler(async (req, res) => {
  let pkg = await findPackageByToken(req.params.token);
  if (!pkg) return res.status(404).json(NOT_FOUND_RESPONSE);

  pkg = await applyLazyExpiry(pkg);

  if (pkg.state !== 'ACTIVE') {
    await recordAttempt(pkg, STATE_TO_OUTCOME[pkg.state], req);
    return res.status(410).json({ state: pkg.state });
  }

  res.json({
    state: pkg.state,
    payloadType: pkg.payloadType,
    label: pkg.label,
    requiresPassword: Boolean(pkg.passwordHash),
    viewsRemaining: pkg.maxViews - pkg.currentViews,
    expiresAt: pkg.expiresAt,
  });
});

// POST /api/access/:token - the actual access attempt.
const accessPackage = asyncHandler(async (req, res) => {
  let pkg = await findPackageByToken(req.params.token);
  if (!pkg) return res.status(404).json(NOT_FOUND_RESPONSE);

  pkg = await applyLazyExpiry(pkg);

  if (pkg.state !== 'ACTIVE') {
    await recordAttempt(pkg, STATE_TO_OUTCOME[pkg.state], req);
    return res.status(410).json({ error: `This package is ${pkg.state.toLowerCase()}` });
  }

  if (pkg.passwordHash) {
    const provided = req.body.password || '';
    const valid = await bcrypt.compare(provided, pkg.passwordHash);
    if (!valid) {
      pkg.currentFailedAttempts += 1;
      let locked = false;
      if (pkg.currentFailedAttempts >= pkg.maxFailedAttempts) {
        pkg.state = 'LOCKED';
        locked = true;
      }
      await pkg.save();
      await recordAttempt(pkg, 'WRONG_PASSWORD', req);

      if (locked) {
        await logAudit({
          action: 'PACKAGE_LOCKED',
          targetType: 'PACKAGE',
          targetId: pkg._id,
          metadata: { currentFailedAttempts: pkg.currentFailedAttempts },
          ipAddress: req.ip,
        });
        return res.status(423).json({ error: 'Too many failed attempts. This package is now locked.' });
      }
      return res.status(401).json({ error: 'Incorrect password' });
    }
  }

  // Successful access: decrypt payload, then advance the lifecycle.
  const responseBody = { label: pkg.label, payloadType: pkg.payloadType };

  if (pkg.message) {
    responseBody.message = decryptText(pkg.message);
  }
  if (pkg.files.length > 0) {
    responseBody.files = [];
    for (const file of pkg.files) {
      const ciphertext = await fs.readFile(path.join(UPLOAD_DIR, file.storageKey), 'base64');
      const plainBuffer = decryptBuffer({ iv: file.iv, authTag: file.authTag, ciphertext });
      responseBody.files.push({
        filename: file.filename,
        mimeType: file.mimeType,
        data: plainBuffer.toString('base64'),
      });
    }
  }

  pkg.currentViews += 1;
  const burned = pkg.currentViews >= pkg.maxViews;
  if (burned) pkg.state = 'BURNED';
  await pkg.save();

  await recordAttempt(pkg, 'SUCCESS', req);
  await logAudit({
    action: 'PACKAGE_ACCESSED',
    targetType: 'PACKAGE',
    targetId: pkg._id,
    metadata: { viewNumber: pkg.currentViews },
    ipAddress: req.ip,
  });
  if (burned) {
    await logAudit({ action: 'PACKAGE_BURNED', targetType: 'PACKAGE', targetId: pkg._id, ipAddress: req.ip });
  }

  res.json(responseBody);
});

module.exports = { getStatus, accessPackage };
