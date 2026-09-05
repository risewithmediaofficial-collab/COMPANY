// =============================================
// SMM CLIENT BUDGET MODEL (Decoupled Client Ad Budget Ledger)
// =============================================
import mongoose from 'mongoose';

const smmBudgetSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    clientName: {
      type: String,
      trim: true,
      default: '',
    },
    companyName: {
      type: String,
      trim: true,
      default: '',
    },
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    month: {
      type: String,
      trim: true,
      default: '',
    },
    monthlyBudget: {
      type: Number,
      required: true,
      default: 0,
    },
    dailyBudget: {
      type: Number,
      default: 0,
    },
    amountDeposited: {
      type: Number,
      required: true,
      default: 0,
    },
    balance: {
      type: Number,
      default: 0, // monthlyBudget - amountDeposited
    },
    notes: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

smmBudgetSchema.index({ client: 1 });
smmBudgetSchema.index({ date: -1 });
smmBudgetSchema.index({ companyName: 'text', clientName: 'text' });

const SmmBudget = mongoose.model('SmmBudget', smmBudgetSchema);
export default SmmBudget;
