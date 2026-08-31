const path = require('path');
const fs = require('fs/promises');
const bcrypt = require('bcryptjs');

const AccessAttempt = require('../models/AccessAttempt');
const { decryptText, decryptBuffer } = require('../utils/crypto');
const { logAudit } = require('../utils/audit');

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

// Maps a non-ACTIVE package state to the AccessAttempt outcome it represents.
const STATE_TO_OUTCOME = {
  BURNED: 'VIEW_LIMIT_REACHED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
  LOCKED: 'LOCKED',
};

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

// Metadata-only view of a package - never the payload. Used for both the
// public link status check and the "packages sent to me" detail view.
function statusPayload(pkg) {
  return {
    state: pkg.state,
    payloadType: pkg.payloadType,
    label: pkg.label,
    requiresPassword: Boolean(pkg.passwordHash),
    viewsRemaining: Math.max(0, pkg.maxViews - pkg.currentViews),
    expiresAt: pkg.expiresAt,
  };
}

// The single entry point that enforces the package's access rules
// (expiry, password, failed-attempt lockout, view limit / burn) and, on
// success, decrypts and returns the payload. Identical logic runs whether
// the caller was identified by an anonymous link token or by an
// authenticated user matching the package's recipientEmail - only how the
// package was looked up differs between the two callers.
async function attemptReveal(pkg, { password, req }) {
  pkg = await applyLazyExpiry(pkg);

  if (pkg.state !== 'ACTIVE') {
    await recordAttempt(pkg, STATE_TO_OUTCOME[pkg.state], req);
    return { httpStatus: 410, body: { error: `This package is ${pkg.state.toLowerCase()}`, state: pkg.state } };
  }

  if (pkg.passwordHash) {
    const valid = await bcrypt.compare(password || '', pkg.passwordHash);
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
        return { httpStatus: 423, body: { error: 'Too many failed attempts. This package is now locked.' } };
      }
      return { httpStatus: 401, body: { error: 'Incorrect password' } };
    }
  }

  // Successful access: decrypt payload, then advance the lifecycle.
  const body = { label: pkg.label, payloadType: pkg.payloadType };

  if (pkg.message) {
    body.message = decryptText(pkg.message);
  }
  if (pkg.files.length > 0) {
    body.files = [];
    for (const file of pkg.files) {
      const ciphertext = await fs.readFile(path.join(UPLOAD_DIR, file.storageKey), 'base64');
      const plainBuffer = decryptBuffer({ iv: file.iv, authTag: file.authTag, ciphertext });
      body.files.push({ filename: file.filename, mimeType: file.mimeType, data: plainBuffer.toString('base64') });
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

  return { httpStatus: 200, body };
}

// Handles the "already terminal" case for status checks (no reveal attempted).
async function checkStatus(pkg, req) {
  pkg = await applyLazyExpiry(pkg);
  if (pkg.state !== 'ACTIVE') {
    await recordAttempt(pkg, STATE_TO_OUTCOME[pkg.state], req);
    return { httpStatus: 410, body: { state: pkg.state } };
  }
  return { httpStatus: 200, body: statusPayload(pkg) };
}

module.exports = { attemptReveal, checkStatus, statusPayload, applyLazyExpiry };
