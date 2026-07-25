import mongoose from 'mongoose';

const dmVideoShootSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    shootTitle: { type: String, required: true, trim: true },
    shootDate: { type: Date, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    duration: { type: Number, default: 0 }, // in hours
    shootLocation: { type: String, trim: true, default: '' },
    invoiceNumber: { type: String, trim: true, default: '' },

    // Content tracking
    plannedContents: { type: Number, default: 0, min: 0 },
    completedContents: { type: Number, default: 0, min: 0 },
    contentsCompletionPct: { type: Number, default: 0 },

    // Reels tracking
    plannedReels: { type: Number, default: 0, min: 0 },
    completedReels: { type: Number, default: 0, min: 0 },
    reelsCompletionPct: { type: Number, default: 0 },

    // Team Assignment
    assignedTeam: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: { type: String, default: '' },
        role: { type: String, default: 'Team Member' },
      },
    ],

    // Equipment Section
    equipment: [{ type: String, trim: true }],

    // Itemized Expenses List
    expensesList: [
      {
        title: { type: String, required: true, trim: true },
        amount: { type: Number, required: true, min: 0, default: 0 },
      },
    ],

    // Expense Section
    totalAmount: { type: Number, default: 0, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    balanceAmount: { type: Number, default: 0 },

    notes: { type: String, default: '' },

    status: {
      type: String,
      enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Postponed'],
      default: 'Scheduled',
    },

    // Time Tracking
    shootStartedAt: { type: Date },
    shootEndedAt: { type: Date },
    actualDuration: { type: Number, default: 0 }, // in minutes

    // Audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

// Pre-save calculations for percentages and balance amount
dmVideoShootSchema.pre('save', function (next) {
  if (this.plannedContents > 0) {
    this.contentsCompletionPct = Number(((this.completedContents / this.plannedContents) * 100).toFixed(1));
  } else {
    this.contentsCompletionPct = 0;
  }

  if (this.plannedReels > 0) {
    this.reelsCompletionPct = Number(((this.completedReels / this.plannedReels) * 100).toFixed(1));
  } else {
    this.reelsCompletionPct = 0;
  }

  if (this.expensesList && this.expensesList.length > 0) {
    const sumExpenses = this.expensesList.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    if (sumExpenses > 0) {
      this.totalAmount = sumExpenses;
    }
  }

  this.balanceAmount = Math.max(Number(this.totalAmount || 0) - Number(this.amountPaid || 0), 0);

  if (this.startTime && this.endTime) {
    const diffMs = new Date(this.endTime) - new Date(this.startTime);
    this.duration = diffMs > 0 ? Number((diffMs / (1000 * 60 * 60)).toFixed(2)) : 0;
  }

  next();
});

dmVideoShootSchema.index({ client: 1 });
dmVideoShootSchema.index({ shootDate: 1 });
dmVideoShootSchema.index({ status: 1 });
dmVideoShootSchema.index({ isDeleted: 1 });

const DMVideoShoot = mongoose.model('DMVideoShoot', dmVideoShootSchema);
export default DMVideoShoot;
