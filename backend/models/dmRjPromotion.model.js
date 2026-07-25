import mongoose from 'mongoose';

const dmRjPromotionSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    promotionTitle: { type: String, required: true, trim: true },

    rjMembers: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: { type: String, default: '' },
        role: { type: String, default: 'RJ Member' },
      },
    ],

    promotionDate: { type: Date, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    durationSpoken: { type: Number, default: 0 }, // in hours
    minutesSpoken: { type: Number, default: 0, min: 0 }, // in minutes manually entered

    promotionDetails: { type: String, default: '' },
    notes: { type: String, default: '' },
    invoiceNumber: { type: String, trim: true, default: '' },

    expensesList: [
      {
        title: { type: String, required: true, trim: true },
        amount: { type: Number, required: true, min: 0, default: 0 },
      },
    ],

    totalAmount: { type: Number, default: 0, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    balanceAmount: { type: Number, default: 0 },

    remarks: { type: String, default: '' },

    status: {
      type: String,
      enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Postponed'],
      default: 'Scheduled',
    },

    startedAt: { type: Date },
    endedAt: { type: Date },
    actualDuration: { type: Number, default: 0 }, // in minutes

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

dmRjPromotionSchema.pre('save', function (next) {
  if (this.expensesList && this.expensesList.length > 0) {
    const sumExpenses = this.expensesList.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    if (sumExpenses > 0) {
      this.totalAmount = sumExpenses;
    }
  }

  this.balanceAmount = Math.max(Number(this.totalAmount || 0) - Number(this.amountPaid || 0), 0);

  if (this.startTime && this.endTime) {
    const diffMs = new Date(this.endTime) - new Date(this.startTime);
    this.durationSpoken = diffMs > 0 ? Number((diffMs / (1000 * 60 * 60)).toFixed(2)) : 0;
  }

  next();
});

dmRjPromotionSchema.index({ client: 1 });
dmRjPromotionSchema.index({ promotionDate: 1 });
dmRjPromotionSchema.index({ status: 1 });
dmRjPromotionSchema.index({ isDeleted: 1 });

const DMRjPromotion = mongoose.model('DMRjPromotion', dmRjPromotionSchema);
export default DMRjPromotion;
