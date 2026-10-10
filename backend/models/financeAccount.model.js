// =============================================
// FINANCE ACCOUNT MODEL - Bank & Cash Accounts
// =============================================

import mongoose from 'mongoose';

const financeAccountSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    accountName: { type: String, required: true, trim: true },
    accountType: {
      type: String,
      enum: ['bank', 'cash', 'upi_linked_bank'],
      default: 'bank',
    },
    bankName: { type: String, trim: true, default: '' },
    accountNumber: { type: String, trim: true, default: '' },
    ifscCode: { type: String, trim: true, default: '' },
    upiId: { type: String, trim: true, default: '' },
    linkedBankAccountId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceAccount' }, // For UPI handles linking to primary bank
    currency: { type: String, default: 'INR' },
    openingBalance: { type: Number, default: 0 },
    cutoverDate: { type: Date, default: () => new Date('2026-01-01') },
    currentBalance: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

financeAccountSchema.index({ accountType: 1 });
financeAccountSchema.index({ isActive: 1 });

const FinanceAccount = mongoose.model('FinanceAccount', financeAccountSchema);
export default FinanceAccount;
