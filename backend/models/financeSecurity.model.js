import mongoose from 'mongoose';

const financeSecuritySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    hint: {
      type: String,
      default: 'Default is RiseFinance@2026',
    },
    lastChangedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    autoLockMinutes: {
      type: Number,
      default: 60,
    },
    isProtectionEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const FinanceSecurity = mongoose.model('FinanceSecurity', financeSecuritySchema);
export default FinanceSecurity;
