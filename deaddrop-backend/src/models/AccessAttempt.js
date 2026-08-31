const mongoose = require('mongoose');

const accessAttemptSchema = new mongoose.Schema({
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package', required: true, index: true },
  attemptedAt: { type: Date, default: Date.now, index: true },
  ipAddress: { type: String },
  userAgent: { type: String },
  outcome: {
    type: String,
    enum: [
      'SUCCESS',
      'WRONG_PASSWORD',
      'EXPIRED',
      'LOCKED',
      'REVOKED',
      'NOT_FOUND',
      'VIEW_LIMIT_REACHED',
    ],
    required: true,
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
});

module.exports = mongoose.model('AccessAttempt', accessAttemptSchema);
