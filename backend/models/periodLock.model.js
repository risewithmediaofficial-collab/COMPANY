// =============================================
// PERIOD LOCK MODEL - Monthly Close Controls
// =============================================

import mongoose from 'mongoose';

const periodLockSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    period: {
      type: String, // Format: "YYYY-MM", e.g. "2026-09"
      required: true,
      trim: true,
    },
    month: { type: String, required: true },
    year: { type: Number, required: true },
    isLocked: {
      type: Boolean,
      default: false,
    },
    lockedAt: { type: Date },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reopenedAt: { type: Date },
    reopenedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reopenReason: { type: String, default: '' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

periodLockSchema.index({ period: 1 }, { unique: true });

const PeriodLock = mongoose.model('PeriodLock', periodLockSchema);
export default PeriodLock;
