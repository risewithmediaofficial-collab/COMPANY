// =============================================
// FOUNDER TRANSACTION MODEL
// =============================================

import mongoose from 'mongoose';

const founderTransactionSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    founderName: {
      type: String,
      required: true,
      trim: true, // Configurable e.g. "Dinesh M", "Sathish Kumar"
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    transactionType: {
      type: String,
      enum: [
        'capital_introduced',     // Equity Inflow (Not Sales!)
        'drawings',               // Equity Outflow (Not Operating Expense!)
        'loan_to_company',        // Liability Inflow (Not Revenue!)
        'loan_repayment',         // Liability Outflow (Not Expense!)
        'profit_allocation',      // Paper equity share allocation (No cash movement until paid)
        'profit_distribution',    // Cash distribution of allocated profits
      ],
      required: true,
    },
    direction: {
      type: String,
      enum: ['inflow', 'outflow', 'none'], // none for profit_allocation paper entry
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Amount must be greater than zero'],
    },
    currency: {
      type: String,
      default: 'INR',
    },
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FinanceAccount',
    },
    paymentMode: {
      type: String,
      enum: ['Bank Transfer', 'UPI', 'Cheque', 'Cash', 'Journal/None'],
      default: 'Bank Transfer',
    },
    reference: { type: String, trim: true, default: '' },
    proofUrl: { type: String, default: '' },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

founderTransactionSchema.index({ founderName: 1, date: -1 });
founderTransactionSchema.index({ transactionType: 1 });

const FounderTransaction = mongoose.model('FounderTransaction', founderTransactionSchema);
export default FounderTransaction;
