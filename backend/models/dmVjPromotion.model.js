import mongoose from 'mongoose';

const dmVjPromotionSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    promotionTitle: { type: String, required: true, trim: true },

    vjMembers: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: { type: String, default: '' },
        role: { type: String, default: 'VJ Member' },
      },
    ],

    platform: {
      type: String,
      enum: ['Instagram', 'Facebook', 'YouTube', 'TV', 'Live Event', 'Campaign', 'Other'],
      default: 'Instagram',
      required: true,
    },

    promotionDate: { type: Date, required: true },
    invoiceNumber: { type: String, trim: true, default: '' },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    duration: { type: Number, default: 0 }, // in hours

    promotionDetails: { type: String, default: '' },

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

dmVjPromotionSchema.pre('save', function (next) {
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

dmVjPromotionSchema.index({ client: 1 });
dmVjPromotionSchema.index({ platform: 1 });
dmVjPromotionSchema.index({ promotionDate: 1 });
dmVjPromotionSchema.index({ status: 1 });
dmVjPromotionSchema.index({ isDeleted: 1 });

const DMVjPromotion = mongoose.model('DMVjPromotion', dmVjPromotionSchema);
export default DMVjPromotion;
