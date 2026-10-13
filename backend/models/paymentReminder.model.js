// =============================================
// PAYMENT REMINDER MODEL
// Separate tracking for referral/client side payments
// STRICTLY ISOLATED: Not linked to expenses, revenue, or P&L
// =============================================

import mongoose from 'mongoose';

const paymentHistorySchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, default: Date.now },
    paymentMode: {
      type: String,
      enum: ['UPI', 'Bank Transfer', 'Cash', 'Cheque', 'Other'],
      default: 'Bank Transfer',
    },
    reference: { type: String, default: '' },
    notes: { type: String, default: '' },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true, timestamps: true }
);

const paymentReminderSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    title: { type: String, required: true, trim: true },
    partyName: { type: String, required: true, trim: true }, // Client / Referrer / Partner name
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
    category: {
      type: String,
      enum: ['referral', 'client_cut', 'commission', 'consulting', 'other'],
      default: 'referral',
    },
    totalAmount: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    balanceAmount: { type: Number, default: 0, min: 0 },
    dueDate: { type: Date },
    status: {
      type: String,
      enum: ['pending', 'partially_paid', 'paid'],
      default: 'pending',
    },
    paymentMode: {
      type: String,
      enum: ['UPI', 'Bank Transfer', 'Cash', 'Cheque', 'Other', ''],
      default: '',
    },
    paymentHistory: [paymentHistorySchema],
    contactInfo: { type: String, default: '' },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Auto compute balance & status before save
paymentReminderSchema.pre('save', function (next) {
  const total = Number(this.totalAmount || 0);
  const paid = Number(this.paidAmount || 0);
  this.balanceAmount = Math.max(0, total - paid);

  if (paid >= total && total > 0) {
    this.status = 'paid';
  } else if (paid > 0 && paid < total) {
    this.status = 'partially_paid';
  } else if (paid === 0) {
    if (this.status !== 'paid') {
      this.status = 'pending';
    }
  }
  next();
});

paymentReminderSchema.index({ organizationId: 1, status: 1 });
paymentReminderSchema.index({ partyName: 1 });
paymentReminderSchema.index({ dueDate: 1 });
paymentReminderSchema.index({ createdAt: -1 });

const PaymentReminder = mongoose.model('PaymentReminder', paymentReminderSchema);
export default PaymentReminder;
