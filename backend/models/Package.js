const mongoose = require('mongoose');

const encryptedBlobSchema = new mongoose.Schema(
  {
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
    ciphertext: { type: String, required: true },
  },
  { _id: false }
);

const fileEntrySchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    storageKey: { type: String, required: true }, // path/key of the encrypted blob on disk
    checksum: { type: String, required: true }, // sha256 of the *plaintext* file, for integrity checks
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
  },
  { _id: false }
);

const packageSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    label: { type: String, trim: true, maxlength: 200 },

    payloadType: { type: String, enum: ['FILE', 'MESSAGE', 'MIXED'], required: true },
    message: { type: encryptedBlobSchema, default: null },
    files: { type: [fileEntrySchema], default: [] },

    accessTokenHash: { type: String, required: true, unique: true },
    passwordHash: { type: String, default: null },

    maxViews: { type: Number, required: true, min: 1, default: 1 },
    currentViews: { type: Number, default: 0 },

    expiresAt: { type: Date, required: true, index: true },

    maxFailedAttempts: { type: Number, default: 5, min: 1 },
    currentFailedAttempts: { type: Number, default: 0 },

    recipientEmail: { type: String, default: null, lowercase: true, trim: true },

    state: {
      type: String,
      enum: ['ACTIVE', 'BURNED', 'EXPIRED', 'REVOKED', 'LOCKED'],
      default: 'ACTIVE',
      index: true,
    },

    revokedAt: { type: Date, default: null },
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

packageSchema.index({ state: 1, expiresAt: 1 });
packageSchema.index({ label: 'text' });

module.exports = mongoose.model('Package', packageSchema);
