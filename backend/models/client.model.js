// =============================================
// CLIENT MODEL
// =============================================

import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    company: { type: String, trim: true },
    website: { type: String, trim: true },
    logo: { type: String, default: '' },
    industry: { type: String, default: '' },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zip: String,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'churned', 'onboarding', 'renew'],
      default: 'onboarding',
    },
    tier: {
      type: String,
      enum: ['starter', 'growth', 'enterprise'],
      default: 'starter',
    },
    // Linked user account for client portal
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Assigned team
    assignedManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedTeam: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Source lead
    convertedFromLead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    // Billing
    contractValue: { type: Number, default: 0 },
    budgetType: {
      type: String,
      enum: ['monthly', 'overall'],
      default: 'monthly',
    },
    contractStartDate: { type: Date },
    contractEndDate: { type: Date },
    billingCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'annually', 'one_time'],
      default: 'monthly',
    },
    services: [{ type: String }],
    tags: [{ type: String }],
    notes: { type: String },
    portalEnabled: { type: Boolean, default: false },
    onboardingCompleted: { type: Boolean, default: false },
    onboardingSteps: {
      welcomeEmailSent: { type: Boolean, default: false },
      projectCreated: { type: Boolean, default: false },
      teamAssigned: { type: Boolean, default: false },
      portalActivated: { type: Boolean, default: false },
      kickoffCallScheduled: { type: Boolean, default: false },
    },
    socialMedia: {
      instagram: String,
      facebook: String,
      linkedin: String,
      twitter: String,
    },
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    referredByManual: { type: String, default: '' },
    referralSource: { type: String, default: '' },
    referralPermissionEnabled: { type: Boolean, default: false },
    totalRevenue: { type: Number, default: 0 },
    lastActivityDate: { type: Date },

    // Google Drive folder link for this client's assets/files
    driveLink: { type: String, default: '' },
  },
  { timestamps: true }
);

clientSchema.index({ email: 1 });
clientSchema.index({ status: 1 });
clientSchema.index({ organizationId: 1 });
clientSchema.index({ assignedManager: 1 });

const Client = mongoose.model('Client', clientSchema);
export default Client;
