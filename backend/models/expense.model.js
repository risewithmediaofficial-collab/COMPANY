// =============================================
// EXPENSE MODEL - Finance Module
// =============================================

import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    category: {
      type: String,
      enum: ['salary', 'tools', 'advertising', 'travel', 'office', 'freelance', 'misc', 'rj', 'video_shoot', 'travel_allowance', 'ads_campaign', 'other'],
      default: 'misc',
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
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'reimbursed'],
      default: 'pending',
    },
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
