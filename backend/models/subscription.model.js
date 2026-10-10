// =============================================
// RECURRING SUBSCRIPTION MODEL
// =============================================

import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    serviceName: { type: String, required: true, trim: true },
    vendor: { type: String, trim: true, default: '' },
    frequency: {
      type: String,
      enum: ['monthly', 'annual'],
      default: 'monthly',
    },
    expectedAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    nextRenewalDate: { type: Date, required: true },
    paymentAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceAccount' },
    costClassification: {
      type: String,
      enum: ['tools', 'software', 'hosting', 'marketing', 'office', 'other'],
      default: 'software',
    },
    allocationRule: {
      type: String,
      enum: ['overhead', 'equal_client_share', 'specific_client'],
      default: 'overhead',
    },
    assignedClient: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    reminderLeadDays: { type: Number, default: 5, min: 0 },
    status: {
      type: String,
      enum: ['active', 'paused', 'cancelled'],
      default: 'active',
    },
    lastBilledDate: { type: Date },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

subscriptionSchema.index({ nextRenewalDate: 1 });
subscriptionSchema.index({ status: 1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);
export default Subscription;
