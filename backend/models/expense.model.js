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
      enum: ['paid', 'unpaid'],
      default: 'paid',
    },
    paymentDate: { type: Date },
    paymentMode: {
      type: String,
      enum: ['Bank', 'UPI', 'Cash', 'Card', 'Cheque', 'Other'],
      default: 'Bank',
    },
    fundingAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceAccount' },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
    receiptUrl: { type: String },
    date: { type: Date, default: Date.now },
    notes: { type: String },
  },
  { timestamps: true }
);

expenseSchema.index({ submittedBy: 1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ transactionType: 1 });
expenseSchema.index({ status: 1 });
expenseSchema.index({ date: -1 });

const Expense = mongoose.model('Expense', expenseSchema);
export default Expense;
