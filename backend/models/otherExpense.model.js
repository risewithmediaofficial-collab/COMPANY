// =============================================
// OTHER EXPENSE MODEL - Unbound Memo & Notes Tracker
// Strictly isolated from official company balance sheet,
// P&L, taxes, and financial invariants.
// =============================================

import mongoose from 'mongoose';

const otherExpenseSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    category: {
      type: String,
      default: 'Miscellaneous',
      trim: true,
    },
    paymentMode: {
      type: String,
      enum: ['Cash', 'UPI', 'Bank', 'Card', 'Other'],
      default: 'Cash',
    },
    paidBy: { type: String, default: 'Self', trim: true },
    notes: { type: String, default: '', trim: true },
    tag: { type: String, default: '', trim: true },
    isPersonal: { type: Boolean, default: true },
    // Strict indicator confirming this is an unbound memo
    isUnboundMemo: { type: Boolean, default: true },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

otherExpenseSchema.index({ date: -1, organizationId: 1 });
otherExpenseSchema.index({ category: 1 });

const OtherExpense = mongoose.model('OtherExpense', otherExpenseSchema);
export default OtherExpense;
