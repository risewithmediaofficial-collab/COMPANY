// =============================================
// REFERRAL MODEL
// =============================================

import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'BrandWorkspace' },
    referrer: { type: mongoose.Schema.Types.ObjectId, required: false, refPath: 'referrerModel' },
    referrerModel: { type: String, required: false, enum: ['User', 'Client', 'Partner', 'Outside'], default: 'User' },
    referrerType: {
      type: String,
      enum: ['employee', 'partner', 'outside'],
      default: 'outside',
    },
    outsideReferrerName: { type: String, default: '' },
    outsideReferrerContact: { type: String, default: '' },
    payoutType: {
      type: String,
      enum: ['one_time', 'monthly'],
      default: 'one_time',
    },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    referralSource: {
      type: String,
      enum: ['LinkedIn', 'Instagram', 'Facebook', 'WhatsApp', 'Website', 'Google Search', 'Google Ads', 'Existing Client Referral', 'Direct Call', 'Walk-in', 'Friend Referral', 'Partner Referral', 'Other', ''],
      default: '',
    },
    referralPersonName: { type: String, default: '' },
    referralPersonContact: { type: String, default: '' },
    referralPlatformLink: { type: String, default: '' },
    campaignName: { type: String, default: '' },
    leadQuality: {
      type: String,
      enum: ['Hot', 'Warm', 'Cold', ''],
      default: '',
    },
    conversionStatus: {
      type: String,
      enum: ['Lead', 'Contacted', 'Proposal Sent', 'Converted', 'Not Converted', ''],
      default: '',
    },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    referralCode: { type: String },
    status: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'qualified', 'converted', 'rejected'],
      default: 'pending',
    },
    commissionType: {
      type: String,
      enum: ['percentage', 'monthly'],
      default: 'percentage'
    },
    commissionRate: { type: Number, default: 10 }, // percentage %
    commissionAmount: { type: Number, default: 0 }, // one-time flat / calc
    monthlyAmount: { type: Number, default: 0 }, // for monthly recurring
    dealValue: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    payoutRequest: {
      requestedAt: Date,
      method: String,
      accountDetails: String,
      status: { type: String, enum: ['pending', 'processing', 'paid', 'rejected'], default: 'pending' },
    },
    notes: { type: String },
  },
  { timestamps: true }
);

referralSchema.index({ referrer: 1 });
referralSchema.index({ referralCode: 1 });
referralSchema.index({ clientId: 1 });
referralSchema.index({ projectId: 1 });

const Referral = mongoose.model('Referral', referralSchema);
export default Referral;
