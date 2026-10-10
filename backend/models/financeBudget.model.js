// =============================================
// FINANCE BUDGET MODEL - Category Budgets & Warnings
// =============================================

import mongoose from 'mongoose';

const financeBudgetSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    month: {
      type: String, // e.g. "October" or "2026-10"
      required: true,
    },
    year: {
      type: Number,
      required: true,
      default: () => new Date().getFullYear(),
    },
    monthlyBudget: {
      type: Number,
      required: true,
      min: 0,
    },
    thresholdPercentage: {
      type: Number,
      default: 80, // Warn at 80%
      min: 10,
      max: 100,
    },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

financeBudgetSchema.index({ category: 1, month: 1, year: 1 }, { unique: true });

const FinanceBudget = mongoose.model('FinanceBudget', financeBudgetSchema);
export default FinanceBudget;
