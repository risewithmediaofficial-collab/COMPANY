// =============================================
// INTERNAL TRANSFER MODEL - Bank & Cash Transfers
// =============================================

import mongoose from 'mongoose';

const internalTransferSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    date: { type: Date, required: true, default: Date.now },
    fromAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinanceAccount',
      required: true,
    },
    toAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinanceAccount',
      required: true,
    },
    amount: { type: Number, required: true, min: [0.01, 'Amount must be greater than zero'] },
    bankFee: { type: Number, default: 0, min: 0 },
    reference: { type: String, trim: true, default: '' },
    proofUrl: { type: String, default: '' },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

internalTransferSchema.index({ date: -1 });
internalTransferSchema.index({ fromAccount: 1 });
internalTransferSchema.index({ toAccount: 1 });

const InternalTransfer = mongoose.model('InternalTransfer', internalTransferSchema);
export default InternalTransfer;
