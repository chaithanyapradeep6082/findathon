const Package = require('../models/Package');
const { asyncHandler } = require('../middleware/errorHandler');
const { attemptReveal, checkStatus } = require('../services/packageAccessService');

// Only packages the sender explicitly addressed to this account's email are
// visible here - an unaddressed package (recipientEmail not set) is only
// reachable via its anonymous link, same as before.
async function findOwnReceivedPackage(req) {
  return Package.findOne({ _id: req.params.id, recipientEmail: req.user.email.toLowerCase() });
}

// GET /api/received-packages - list packages sent to my email, paginated/filtered.
const listReceived = asyncHandler(async (req, res) => {
  const { state, page = 1, limit = 20 } = req.query;
  const filter = { recipientEmail: req.user.email.toLowerCase() };
  if (state) filter.state = state;

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Package.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select('-message -files.storageKey -files.iv -files.authTag -passwordHash -accessTokenHash')
      .populate('ownerId', 'email'),
    Package.countDocuments(filter),
  ]);

  res.json({ items, total, page: Number(page), limit: Number(limit) });
});

// GET /api/received-packages/:id - status only, never the payload.
const getReceivedStatus = asyncHandler(async (req, res) => {
  const pkg = await findOwnReceivedPackage(req);
  if (!pkg) return res.status(404).json({ error: 'No package with that id was sent to your account' });

  const { httpStatus, body } = await checkStatus(pkg, req);
  res.status(httpStatus).json(body);
});

// POST /api/received-packages/:id/access - reveal, identified by account instead of a link token.
const accessReceivedPackage = asyncHandler(async (req, res) => {
  const pkg = await findOwnReceivedPackage(req);
  if (!pkg) return res.status(404).json({ error: 'No package with that id was sent to your account' });

  const { httpStatus, body } = await attemptReveal(pkg, { password: req.body.password, req });
  res.status(httpStatus).json(body);
});

module.exports = { listReceived, getReceivedStatus, accessReceivedPackage };
