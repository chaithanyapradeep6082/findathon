const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const Package = require('../models/Package');
const { asyncHandler } = require('../middleware/errorHandler');
const { encryptText, encryptBuffer, sha256 } = require('../utils/crypto');
const { generateAccessToken, hashToken } = require('../utils/tokens');
const { logAudit } = require('../utils/audit');

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

const createPackage = asyncHandler(async (req, res) => {
  const { label, message, maxViews, expiresInMinutes, password, recipientEmail, maxFailedAttempts } = req.body;
  const files = req.files || [];

  if (!message && files.length === 0) {
    return res.status(400).json({ error: 'A package needs at least a message or one file' });
  }
  if (!expiresInMinutes || Number(expiresInMinutes) <= 0) {
    return res.status(400).json({ error: 'expiresInMinutes must be a positive number' });
  }

  const payloadType = message && files.length > 0 ? 'MIXED' : message ? 'MESSAGE' : 'FILE';

  const encryptedMessage = message ? encryptText(message) : null;

  const storedFiles = [];
  for (const file of files) {
    const checksum = sha256(file.buffer);
    const encrypted = encryptBuffer(file.buffer);
    const storageKey = `${crypto.randomBytes(16).toString('hex')}.enc`;
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, storageKey), encrypted.ciphertext, 'base64');
    storedFiles.push({
      filename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storageKey,
      checksum,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
    });
  }

  const rawToken = generateAccessToken();
  const passwordHash = password ? await bcrypt.hash(password, 12) : null;

  const pkg = await Package.create({
    ownerId: req.user._id,
    label,
    payloadType,
    message: encryptedMessage,
    files: storedFiles,
    accessTokenHash: hashToken(rawToken),
    passwordHash,
    maxViews: maxViews ? Number(maxViews) : 1,
    expiresAt: new Date(Date.now() + Number(expiresInMinutes) * 60 * 1000),
    maxFailedAttempts: maxFailedAttempts ? Number(maxFailedAttempts) : 5,
    recipientEmail,
  });

  await logAudit({
    actorId: req.user._id,
    actorRole: req.user.role,
    action: 'PACKAGE_CREATED',
    targetType: 'PACKAGE',
    targetId: pkg._id,
    metadata: { payloadType, maxViews: pkg.maxViews, expiresAt: pkg.expiresAt },
    ipAddress: req.ip,
  });

  // The raw token is returned exactly once - it cannot be recovered later.
  res.status(201).json({
    id: pkg._id,
    accessToken: rawToken,
    state: pkg.state,
    expiresAt: pkg.expiresAt,
  });
});

const listPackages = asyncHandler(async (req, res) => {
  const { state, page = 1, limit = 20 } = req.query;
  const filter = { ownerId: req.user._id };
  if (state) filter.state = state;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Package.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
      .select('-message -files.storageKey -files.iv -files.authTag -passwordHash -accessTokenHash'),
    Package.countDocuments(filter),
  ]);

  res.json({ items, total, page: Number(page), limit: Number(limit) });
});

const getPackage = asyncHandler(async (req, res) => {
  const pkg = await Package.findById(req.params.id)
    .select('-message -files.storageKey -files.iv -files.authTag -passwordHash -accessTokenHash');
  if (!pkg) return res.status(404).json({ error: 'Package not found' });
  if (String(pkg.ownerId) !== String(req.user._id) && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Not authorized to view this package' });
  }
  res.json({ package: pkg });
});

const revokePackage = asyncHandler(async (req, res) => {
  const pkg = await Package.findById(req.params.id);
  if (!pkg) return res.status(404).json({ error: 'Package not found' });
  if (String(pkg.ownerId) !== String(req.user._id) && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Not authorized to revoke this package' });
  }
  if (pkg.state !== 'ACTIVE') {
    return res.status(409).json({ error: `Cannot revoke a package in state ${pkg.state}` });
  }

  pkg.state = 'REVOKED';
  pkg.revokedAt = new Date();
  pkg.revokedBy = req.user._id;
  await pkg.save();

  await logAudit({
    actorId: req.user._id,
    actorRole: req.user.role,
    action: 'PACKAGE_REVOKED',
    targetType: 'PACKAGE',
    targetId: pkg._id,
    ipAddress: req.ip,
  });

  res.json({ package: { id: pkg._id, state: pkg.state, revokedAt: pkg.revokedAt } });
});

const deletePackage = asyncHandler(async (req, res) => {
  const pkg = await Package.findById(req.params.id);
  if (!pkg) return res.status(404).json({ error: 'Package not found' });
  if (String(pkg.ownerId) !== String(req.user._id) && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Not authorized to delete this package' });
  }
  if (pkg.state === 'ACTIVE') {
    return res.status(409).json({ error: 'Revoke an active package before deleting it' });
  }

  for (const file of pkg.files) {
    await fs.unlink(path.join(UPLOAD_DIR, file.storageKey)).catch(() => {});
  }
  await pkg.deleteOne();

  await logAudit({
    actorId: req.user._id,
    actorRole: req.user.role,
    action: 'PACKAGE_DELETED',
    targetType: 'PACKAGE',
    targetId: pkg._id,
    ipAddress: req.ip,
  });

  res.status(204).send();
});

module.exports = { createPackage, listPackages, getPackage, revokePackage, deletePackage };
