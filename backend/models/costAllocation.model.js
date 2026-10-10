// =============================================
// COST ALLOCATION MODEL - Client Profitability
// =============================================

import mongoose from 'mongoose';

const costAllocationSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    servicePeriod: {
      type: String, // e.g. "2026-10" or "October 2026"
      required: true,
      trim: true,
    },
    costType: {
      type: String,
      enum: ['direct', 'overhead'],
      default: 'direct',
    },
    activityDeliverable: {
      type: String,
      required: true,
      trim: true, // e.g. "Video Editing", "Graphic Design", "Shoot/Travel", "Software Tools Allocation", "Office Rent"
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    quantityOrHours: {
      type: Number,
      default: 1,
      min: 0,
    },
    costRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    allocatedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    sourceExpense: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expense',
    },
    sourcePayroll: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalaryRecord',
    },
    allocationRule: {
      type: String,
      enum: ['approved_hours', 'equal_share', 'revenue_proportion', 'manual'],
      default: 'manual',
    },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

costAllocationSchema.index({ client: 1, servicePeriod: 1 });
costAllocationSchema.index({ servicePeriod: 1 });
costAllocationSchema.index({ sourceExpense: 1 });
costAllocationSchema.index({ sourcePayroll: 1 });

const CostAllocation = mongoose.model('CostAllocation', costAllocationSchema);
export default CostAllocation;
