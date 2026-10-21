// =============================================
// CLIENT CREDENTIAL MODEL
// =============================================

import mongoose from 'mongoose';

// Sub-schema for per-platform social/app credentials
const socialAccountSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ['instagram', 'facebook', 'x', 'youtube', 'linkedin', 'threads', 'tiktok', 'snapchat', 'pinterest', 'other'],
      default: 'other',
    },
    platformLabel: {
      type: String,
      default: '',
      // Custom label for 'other' platforms or overrides
    },
    accountHandle: {
      type: String,
      default: '',
      // e.g., @brandname
    },
    email: {
      type: String,
      default: '',
    },
    mobileNumber: {
      type: String,
      default: '',
    },
    encryptedPassword: {
      type: String,
      // Encrypted platform password
    },
    recoveryEmail: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    // Facebook Pages / Instagram Business Profiles linked to this account
    pages: [
      {
        pageName: { type: String, default: '' },
        pageId: { type: String, default: '' },
        pageUrl: { type: String, default: '' },
        role: { type: String, default: 'Admin', enum: ['Admin', 'Editor', 'Moderator', 'Advertiser', 'Analyst', 'Other'] },
      },
    ],
  },
  { _id: true }
);

const clientCredentialSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    credentialName: {
      type: String,
      required: true,
      trim: true,
      // e.g., "Google Ads Account", "Facebook Business Manager", "Email Account"
    },
    credentialType: {
      type: String,
      enum: [
        'email',
        'password',
        'api_key',
        'webhook',
        'database',
        'social_media',
        'payment_gateway',
        'other',
      ],
      default: 'password',
    },
    // Encrypted fields - stored encrypted in database
    username: {
      type: String,
      default: '',
    },
    encryptedPassword: {
      type: String,
      // This will store encrypted password
    },
    encryptedData: {
      type: String,
      // For complex data like API keys, JSON objects, etc.
    },
    // Primary contact fields
    email: {
      type: String,
      default: '',
    },
    mobileNumber: {
      type: String,
      default: '',
    },
    url: {
      type: String,
      default: '',
      // e.g., login URL, API endpoint
    },
    notes: {
      type: String,
      default: '',
    },
    // Multiple social/platform account credentials
    socialAccounts: [socialAccountSchema],
    // Expiry information
    expiryDate: {
      type: Date,
      // For tracking credential expiry (e.g., API keys, subscriptions)
    },
    // Access tracking
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lastAccessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastAccessedAt: {
      type: Date,
    },
    // Status
    isActive: {
      type: Boolean,
      default: true,
    },
    // Tags for organization
    tags: [String],
  },
  { timestamps: true }
);

// Indexes for faster queries
clientCredentialSchema.index({ clientId: 1, organizationId: 1 });
clientCredentialSchema.index({ organizationId: 1 });
clientCredentialSchema.index({ credentialType: 1 });
clientCredentialSchema.index({ isActive: 1 });

const ClientCredential = mongoose.model('ClientCredential', clientCredentialSchema);
export default ClientCredential;
