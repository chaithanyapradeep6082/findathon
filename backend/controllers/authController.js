const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { asyncHandler } = require('../middleware/errorHandler');
const { logAudit } = require('../utils/audit');

const MAX_LOGIN_ATTEMPTS = 5;

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
}

const register = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: 'A valid email and a password of at least 8 characters are required' });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) return res.status(409).json({ error: 'An account with that email already exists' });

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ email, passwordHash });

  await logAudit({
    actorId: user._id,
    actorRole: user.role,
    action: 'USER_REGISTERED',
    targetType: 'USER',
    targetId: user._id,
    ipAddress: req.ip,
  });

  const token = signToken(user);
  res.status(201).json({ token, user: { id: user._id, email: user.email, role: user.role } });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || '').toLowerCase() });

  // Constant-shaped response whether the user exists or not, to avoid
  // leaking which emails are registered.
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (user.isLocked) {
    return res.status(403).json({ error: 'This account is locked. Contact an administrator.' });
  }

  const valid = await user.comparePassword(password || '');
  if (!valid) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) user.isLocked = true;
    await user.save();

    await logAudit({
      actorId: user._id,
      actorRole: user.role,
      action: 'USER_LOGIN_FAILED',
      targetType: 'USER',
      targetId: user._id,
      metadata: { failedLoginAttempts: user.failedLoginAttempts },
      ipAddress: req.ip,
    });

    return res.status(401).json({ error: 'Invalid email or password' });
  }

  user.failedLoginAttempts = 0;
  await user.save();

  await logAudit({
    actorId: user._id,
    actorRole: user.role,
    action: 'USER_LOGIN',
    targetType: 'USER',
    targetId: user._id,
    ipAddress: req.ip,
  });

  const token = signToken(user);
  res.json({ token, user: { id: user._id, email: user.email, role: user.role } });
});

const logout = asyncHandler(async (req, res) => {
  // Stateless JWT: logout is handled client-side by discarding the token.
  // Included for API completeness / future cookie-based sessions.
  res.json({ success: true });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: { id: req.user._id, email: req.user.email, role: req.user.role } });
});

module.exports = { register, login, logout, me };
