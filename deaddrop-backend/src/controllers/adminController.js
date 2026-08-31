const Package = require('../models/Package');
const User = require('../models/User');
const AccessAttempt = require('../models/AccessAttempt');
const AuditLog = require('../models/AuditLog');
const { asyncHandler } = require('../middleware/errorHandler');
const { logAudit } = require('../utils/audit');

function paginate(query) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Number(query.limit) || 20);
  return { page, limit, skip: (page - 1) * limit };
}

const listAllPackages = asyncHandler(async (req, res) => {
  const { state, search } = req.query;
  const { page, limit, skip } = paginate(req.query);

  const filter = {};
  if (state) filter.state = state;
  if (search) filter.$text = { $search: search };

  const [items, total] = await Promise.all([
    Package.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-message -files.storageKey -files.iv -files.authTag -passwordHash -accessTokenHash')
      .populate('ownerId', 'email'),
    Package.countDocuments(filter),
  ]);

  res.json({ items, total, page, limit });
});

const listUsers = asyncHandler(async (req, res) => {
  const { role, isLocked, search } = req.query;
  const { page, limit, skip } = paginate(req.query);

  const filter = {};
  if (role) filter.role = role;
  if (isLocked !== undefined) filter.isLocked = isLocked === 'true';
  if (search) filter.email = { $regex: search, $options: 'i' };

  const [items, total] = await Promise.all([
    User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({ items, total, page, limit });
});

const patchUser = asyncHandler(async (req, res) => {
  const { role, isLocked } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (role) user.role = role;
  if (isLocked !== undefined) {
    user.isLocked = isLocked;
    if (!isLocked) user.failedLoginAttempts = 0;
  }
  await user.save();

  await logAudit({
    actorId: req.user._id,
    actorRole: req.user.role,
    action: 'ADMIN_ACTION',
    targetType: 'USER',
    targetId: user._id,
    metadata: { role, isLocked },
    ipAddress: req.ip,
  });

  res.json({ user: { id: user._id, email: user.email, role: user.role, isLocked: user.isLocked } });
});

const listAttempts = asyncHandler(async (req, res) => {
  const { outcome, packageId } = req.query;
  const { page, limit, skip } = paginate(req.query);

  const filter = {};
  if (outcome) filter.outcome = outcome;
  if (packageId) filter.packageId = packageId;

  const [items, total] = await Promise.all([
    AccessAttempt.find(filter).sort({ attemptedAt: -1 }).skip(skip).limit(limit),
    AccessAttempt.countDocuments(filter),
  ]);

  res.json({ items, total, page, limit });
});

const listAuditLogs = asyncHandler(async (req, res) => {
  const { action, targetType, targetId, from, to } = req.query;
  const { page, limit, skip } = paginate(req.query);

  const filter = {};
  if (action) filter.action = action;
  if (targetType) filter.targetType = targetType;
  if (targetId) filter.targetId = targetId;
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to) filter.timestamp.$lte = new Date(to);
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).populate('actorId', 'email'),
    AuditLog.countDocuments(filter),
  ]);

  res.json({ items, total, page, limit });
});

module.exports = { listAllPackages, listUsers, patchUser, listAttempts, listAuditLogs };
