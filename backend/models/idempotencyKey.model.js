// =============================================
// IDEMPOTENCY KEY MODEL
// Deduplication & payload-mismatch detection for financial mutations
// =============================================

import mongoose from 'mongoose';

const idempotencyKeySchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    scope: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requestHash: { type: String, required: true },
    responseStatus: { type: Number, default: 200 },
    responseBody: { type: mongoose.Schema.Types.Mixed },
    status: {
      type: String,
      enum: ['processing', 'completed'],
      default: 'processing',
    },
  },
  { timestamps: true }
);

// Scoped compound unique index to prevent concurrent duplicate execution
idempotencyKeySchema.index({ scope: 1, key: 1 }, { unique: true });

// TTL index to automatically prune idempotency keys after 24 hours
idempotencyKeySchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

const IdempotencyKey = mongoose.model('IdempotencyKey', idempotencyKeySchema);
export default IdempotencyKey;
