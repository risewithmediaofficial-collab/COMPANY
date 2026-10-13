// =============================================
// LOAN MODEL
// Business Loans & EMI Tracking
// =============================================

import mongoose from 'mongoose';

const loanRepaymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    paymentDate: { type: Date, default: Date.now },
    paymentMode: {
      type: String,
      enum: ['Bank Transfer', 'UPI', 'Cheque', 'Cash', 'Auto Debit', 'Other'],
      default: 'Bank Transfer',
    },
    reference: { type: String, default: '' },
    notes: { type: String, default: '' },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true, timestamps: true }
);

const loanSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    loanName: { type: String, required: true, trim: true }, // e.g. "Machinery Loan", "HDFC Business Loan"
    lender: { type: String, required: true, trim: true }, // e.g. "HDFC Bank", "SBI", "Private Lender"
    accountNumber: { type: String, trim: true, default: '' }, // Loan Account No. or Reference ID
    loanAmount: { type: Number, required: true, min: 0 }, // Principal Amount borrowed
    interestRate: { type: Number, default: 0, min: 0 }, // Annual interest rate (%)
    totalPayable: { type: Number, min: 0 }, // Total repayment amount (Principal + Interest)
    emiAmount: { type: Number, required: true, min: 0 }, // Monthly EMI / Installment amount
    tenureMonths: { type: Number, default: 12, min: 1 }, // Tenure in months
    startDate: { type: Date, default: Date.now }, // Loan start / disbursement date
    nextPaymentDate: { type: Date, required: true }, // Next EMI / Payment due date
    paidAmount: { type: Number, default: 0, min: 0 }, // Total repaid so far
    balanceAmount: { type: Number, default: 0, min: 0 }, // Remaining balance
    status: {
      type: String,
      enum: ['active', 'closed'],
      default: 'active',
    },
    payments: [loanRepaymentSchema],
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Pre-save hook to calculate totalPayable, balanceAmount, and status
loanSchema.pre('save', function (next) {
  const principal = Number(this.loanAmount || 0);
  let total = Number(this.totalPayable || 0);

  // If totalPayable is not set, compute using simple interest or default to principal
  if (!total || total <= 0) {
    if (this.interestRate && this.interestRate > 0 && this.tenureMonths > 0) {
      const years = Number(this.tenureMonths) / 12;
      const totalInterest = principal * (Number(this.interestRate) / 100) * years;
      total = Math.round(principal + totalInterest);
    } else {
      total = principal;
    }
    this.totalPayable = total;
  }

  // If payments array exists, sum them to get paidAmount
  if (this.payments && this.payments.length > 0) {
    const sumPayments = this.payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    this.paidAmount = sumPayments;
  }

  const paid = Number(this.paidAmount || 0);
  this.balanceAmount = Math.max(0, total - paid);

  // Auto-close if fully paid
  if (this.balanceAmount === 0 && total > 0 && paid >= total) {
    this.status = 'closed';
  } else if (this.balanceAmount > 0 && this.status === 'closed') {
    // If user edited balance or added amount but didn't pay in full
    this.status = 'active';
  }

  next();
});

loanSchema.index({ organizationId: 1, status: 1 });
loanSchema.index({ nextPaymentDate: 1 });

const Loan = mongoose.model('Loan', loanSchema);
export default Loan;
