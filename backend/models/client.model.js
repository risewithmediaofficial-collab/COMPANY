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
    // Billing & Finance Master
    contactName: { type: String, trim: true, default: '' },
    monthlyPlanFee: { type: Number, default: 0, min: 0 },
    servicePlan: { type: String, trim: true, default: '' },
    deliverables: { type: String, trim: true, default: '' },
    billingDate: { type: Number, default: 1, min: 1, max: 31 },
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

    // Detailed Business & Services Intake Form submitted during onboarding
    onboardingDetails: {
      companyLegalName: { type: String, default: '' },
      brandName: { type: String, default: '' },
      tagline: { type: String, default: '' },
      industryNiche: { type: String, default: '' },
      businessDescription: { type: String, default: '' },
      targetAudience: { type: String, default: '' },
      targetLocations: { type: String, default: '' },
      servicesRequested: [{ type: String }],
      primaryBusinessGoal: { type: String, default: '' },
      monthlyMarketingBudget: { type: String, default: '' },
      keyCompetitors: { type: String, default: '' },
      brandTone: { type: String, default: '' },
      brandColors: { type: String, default: '' },
      driveAssetsLink: { type: String, default: '' },
      websiteUrl: { type: String, default: '' },
      socialHandles: {
        instagram: { type: String, default: '' },
        facebook: { type: String, default: '' },
        youtube: { type: String, default: '' },
        linkedin: { type: String, default: '' },
      },
      primaryContact: {
        name: { type: String, default: '' },
        role: { type: String, default: '' },
        phone: { type: String, default: '' },
        email: { type: String, default: '' },
        preferredChannel: { type: String, default: 'WhatsApp' },
      },
      additionalNotes: { type: String, default: '' },
      submittedAt: { type: Date },
      status: {
        type: String,
        enum: ['pending', 'submitted', 'reviewed', 'approved'],
        default: 'pending',
      },
    },
  },
  { timestamps: true }
);

clientSchema.index({ email: 1 });
clientSchema.index({ organizationId: 1, status: 1, createdAt: -1 });
clientSchema.index({ assignedManager: 1, createdAt: -1 });
clientSchema.index({ userId: 1 });

const Client = mongoose.model('Client', clientSchema);
export default Client;
