const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  actorRole: { type: String, default: 'ANONYMOUS' },
  action: {
    type: String,
    enum: [
      'PACKAGE_CREATED',
      'PACKAGE_ACCESSED',
      'PACKAGE_BURNED',
      'PACKAGE_EXPIRED',
      'PACKAGE_REVOKED',
      'PACKAGE_LOCKED',
      'PACKAGE_DELETED',
      'USER_REGISTERED',
      'USER_LOGIN',
      'USER_LOGIN_FAILED',
      'ADMIN_ACTION',
    ],
    required: true,
  },
  targetType: { type: String, enum: ['PACKAGE', 'USER', 'SYSTEM'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, index: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  ipAddress: { type: String },
  timestamp: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
