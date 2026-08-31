const cron = require('node-cron');
const path = require('path');
const fs = require('fs/promises');
const Package = require('../models/Package');
const { logAudit } = require('../utils/audit');

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

// This is the proactive half of expiry enforcement (see accessController's
// applyLazyExpiry for the reactive half). Running this regardless of
// traffic means a package's encrypted payload is purged promptly even if
// nobody ever visits the link again, and its state reflects reality for
// admins browsing the dashboard.
async function sweepExpiredPackages() {
  const stale = await Package.find({ state: 'ACTIVE', expiresAt: { $lt: new Date() } });

  for (const pkg of stale) {
    for (const file of pkg.files) {
      await fs.unlink(path.join(UPLOAD_DIR, file.storageKey)).catch(() => {});
    }
    pkg.state = 'EXPIRED';
    pkg.message = null;
    pkg.files = [];
    await pkg.save();

    await logAudit({
      action: 'PACKAGE_EXPIRED',
      targetType: 'PACKAGE',
      targetId: pkg._id,
      metadata: { trigger: 'background-sweep' },
    });
  }

  if (stale.length > 0) {
    console.log(`[expiry-sweeper] expired ${stale.length} package(s)`);
  }
}

function startExpirySweeper() {
  // Every minute.
  cron.schedule('* * * * *', () => {
    sweepExpiredPackages().catch((err) => console.error('[expiry-sweeper] error:', err));
  });
}

module.exports = { startExpirySweeper, sweepExpiredPackages };
