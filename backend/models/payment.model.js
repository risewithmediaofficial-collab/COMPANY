import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    amount: { type: Number, required: true, min: 0 },
    unappliedCredit: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'paid',
    },
    paymentMode: {
      type: String,
      enum: ['Bank', 'UPI', 'Cash', 'Cheque', 'Card', 'Other'],
      default: 'Bank',
    },
    method: { type: String, default: 'Bank' },
    destinationAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceAccount' },
    reference: { type: String, default: '' },
    proofUrl: { type: String, default: '' },
    receivedDate: { type: Date, default: Date.now },
    paidAt: { type: Date, default: Date.now },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

paymentSchema.index({ invoice: 1, paidAt: -1 });
paymentSchema.index({ client: 1, paidAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
