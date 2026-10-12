// =============================================
// EXPENSE MODEL - Finance Module
// =============================================

import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    amount: { type: Number, required: true, min: 0 },
    taxTreatment: {
      type: String,
      enum: ['inclusive', 'exclusive', 'none'],
      default: 'none',
    },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    category: {
      type: String,
      default: 'office',
    },
    subcategory: { type: String, trim: true, default: '' },
    vendor: { type: String, trim: true, default: '' },
    costType: {
      type: String,
      enum: ['client_project', 'agency_overhead'],
      default: 'agency_overhead',
    },
    customCategory: { type: String, trim: true, default: '' },
    transactionType: {
      type: String,
      enum: ['Expense', 'Profit'],
      default: 'Expense',
    },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'reimbursed'],
      default: 'approved',
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'unpaid', 'partially_paid'],
      default: 'paid',
    },
    paidAmount: { type: Number, default: 0, min: 0 },
    balanceAmount: { type: Number, default: 0 },
    paymentDate: { type: Date },
    paymentMode: {
      type: String,
      enum: ['Bank', 'UPI', 'Cash', 'Card', 'Cheque', 'Other'],
      default: 'Bank',
    },
    payments: [
      {
        amount: { type: Number, required: true, min: 0 },
        paymentDate: { type: Date, default: Date.now },
        paymentMode: {
          type: String,
          enum: ['Bank', 'UPI', 'Cash', 'Card', 'Cheque', 'Other'],
          default: 'Bank',
        },
        reference: { type: String, default: '' },
        notes: { type: String, default: '' },
        fundingAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceAccount' },
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    fundingAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceAccount' },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
    receiptUrl: { type: String },
    date: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { timestamps: true }
);

// Synchronize payment amounts and status before saving
expenseSchema.pre('save', function (next) {
  if (Array.isArray(this.payments) && this.payments.length > 0) {
    const totalPaid = this.payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    this.paidAmount = totalPaid;
    this.balanceAmount = Math.max(0, Number(this.amount || 0) - totalPaid);

    if (this.balanceAmount === 0) {
      this.paymentStatus = 'paid';
    } else if (totalPaid > 0) {
      this.paymentStatus = 'partially_paid';
    } else {
      this.paymentStatus = 'unpaid';
    }

    const lastPayment = this.payments[this.payments.length - 1];
    if (lastPayment) {
      if (lastPayment.paymentDate) this.paymentDate = lastPayment.paymentDate;
      if (lastPayment.paymentMode) this.paymentMode = lastPayment.paymentMode;
    }
  } else {
    if (this.paymentStatus === 'paid') {
      this.paidAmount = Number(this.amount || 0);
      this.balanceAmount = 0;
    } else if (this.paymentStatus === 'unpaid') {
      this.paidAmount = 0;
      this.balanceAmount = Number(this.amount || 0);
    } else if (this.paymentStatus === 'partially_paid') {
      this.paidAmount = Number(this.paidAmount || 0);
      this.balanceAmount = Math.max(0, Number(this.amount || 0) - this.paidAmount);
      if (this.balanceAmount === 0) {
        this.paymentStatus = 'paid';
      }
    }
  }
  next();
});

expenseSchema.index({ approvalStatus: 1, date: -1 });
expenseSchema.index({ organizationId: 1, date: -1 });
expenseSchema.index({ client: 1, date: -1 });
expenseSchema.index({ 'payments.fundingAccount': 1 });
expenseSchema.index({ fundingAccount: 1 });
expenseSchema.index({ category: 1, date: -1 });
expenseSchema.index({ submittedBy: 1, date: -1 });

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
