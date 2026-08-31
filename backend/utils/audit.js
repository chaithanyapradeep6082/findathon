const AuditLog = require('../models/AuditLog');

async function logAudit({ actorId = null, actorRole = 'ANONYMOUS', action, targetType, targetId, metadata = {}, ipAddress }) {
  try {
    await AuditLog.create({ actorId, actorRole, action, targetType, targetId, metadata, ipAddress });
  } catch (err) {
    // Auditing must never crash the request path it's attached to.
    console.error('[audit] failed to write audit log:', err.message);
  }
}

module.exports = { logAudit };
