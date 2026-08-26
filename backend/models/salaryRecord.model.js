// =============================================
// SALARY RECORD MODEL - Finance & Payroll Module
// =============================================

import mongoose from 'mongoose';

const salaryRecordSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Employee is required'],
    },
    month: {
      type: String,
      required: [true, 'Month is required'], // e.g., 'August 2026' or '2026-08'
      trim: true,
    },
    year: {
      type: Number,
      required: true,
      default: () => new Date().getFullYear(),
    },
    payPeriod: {
      type: String,
      trim: true,
      default: '',
    },
    baseSalary: {
      type: Number,
      required: true,
      min: [0, 'Base salary must be positive'],
      default: 0,
    },
    incentive: {
      type: Number,
      min: [0, 'Incentive must be non-negative'],
      default: 0,
    },
    incentiveReason: {
      type: String,
      trim: true,
      default: '',
    },
    ots: {
      type: Number, // Overtime Allowance (OTS)
      min: [0, 'OTS amount must be non-negative'],
      default: 0,
    },
    otsHours: {
      type: Number,
      min: [0, 'OTS hours must be non-negative'],
      default: 0,
    },
    otsReason: {
      type: String,
      trim: true,
      default: '',
    },
    otherAllowances: {
      type: Number,
      min: [0, 'Other allowances must be non-negative'],
      default: 0,
    },
    otherAllowancesReason: {
      type: String,
      trim: true,
      default: '',
    },
    deductions: {
      type: Number,
      min: [0, 'Deductions must be non-negative'],
      default: 0,
    },
    deductionReason: {
      type: String,
      trim: true,
      default: '',
    },
    grossSalary: {
      type: Number,
      default: 0,
    },
    netSalary: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'processing', 'paid', 'hold'],
      default: 'pending',
    },
    paymentDate: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      enum: ['Bank Transfer', 'UPI', 'Cash', 'Cheque', 'Other'],
      default: 'Bank Transfer',
    },
    transactionReference: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    expenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expense',
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
  },
  { timestamps: true }
);

// Calculate grossSalary and netSalary before saving
salaryRecordSchema.pre('save', function (next) {
  const base = Number(this.baseSalary || 0);
  const inc = Number(this.incentive || 0);
  const ots = Number(this.ots || 0);
  const others = Number(this.otherAllowances || 0);
  const ded = Number(this.deductions || 0);

  this.grossSalary = base + inc + ots + others;
  this.netSalary = Math.max(0, this.grossSalary - ded);
  next();
});

salaryRecordSchema.index({ employee: 1, month: 1, year: 1 });
salaryRecordSchema.index({ status: 1 });
salaryRecordSchema.index({ year: -1, month: -1 });

const SalaryRecord = mongoose.model('SalaryRecord', salaryRecordSchema);
export default SalaryRecord;
