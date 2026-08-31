const crypto = require('crypto');

// The raw token goes in the shareable link and is never stored.
// Only its SHA-256 hash is persisted, so a database leak alone can't
// be used to reconstruct working access links (same principle as
// password-reset token storage).
function generateAccessToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

module.exports = { generateAccessToken, hashToken };
