const crypto = require('crypto');

const ALGO = 'aes-256-gcm';

function getKey() {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
}

// Encrypts a Buffer (used for both text and file contents).
// Returns { iv, authTag, ciphertext } all as base64/hex strings for storage.
function encryptBuffer(plainBuffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    ciphertext: ciphertext.toString('base64'),
  };
}

function decryptBuffer({ iv, authTag, ciphertext }) {
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]);
}

function encryptText(plainText) {
  return encryptBuffer(Buffer.from(plainText, 'utf8'));
}

function decryptText(blob) {
  return decryptBuffer(blob).toString('utf8');
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

module.exports = { encryptBuffer, decryptBuffer, encryptText, decryptText, sha256 };
