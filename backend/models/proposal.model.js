// =============================================
// PROPOSAL MODEL
// =============================================

import mongoose from 'mongoose';

const proposalSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'BrandWorkspace' },
    proposalNumber: { type: String, unique: true, sparse: true },
    title: { type: String, required: true, trim: true },
    recipientType: {
      type: String,
      enum: ['client', 'lead'],
      default: 'client',
    },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
    lead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead', default: null },
    serviceCategory: {
      type: String,
      enum: ['social_media', 'website', 'branding', 'seo', 'ads', 'video_editing', 'content_creation', 'custom'],
      default: 'custom',
    },
    proposalType: { type: String, default: '' },
    description: { type: String, default: '' },
    scopeOfWork: { type: String, default: '' },
    deliverables: { type: String, default: '' },
    timeline: { type: String, default: '' },
    startDate: { type: Date },
    endDate: { type: Date },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    paymentTerms: { type: String, default: '' },
    revisionLimit: { type: Number, default: 3 },
    termsAndConditions: { type: String, default: '' },
    notes: { type: String, default: '' },
    links: [
      {
        title: { type: String },
        url: { type: String },
      },
    ],
    status: {
      type: String,
      enum: ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'],
      default: 'draft',
    },
    acceptedAt: { type: Date, default: null },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectedAt: { type: Date, default: null },
    linkedProjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

// Auto-generate proposal number
proposalSchema.pre('save', async function(next) {
  if (!this.proposalNumber) {
    const count = await mongoose.model('Proposal').countDocuments();
    this.proposalNumber = `PROP-${Date.now()}-${count + 1}`;
  }
  next();
});

proposalSchema.index({ organizationId: 1 });
proposalSchema.index({ brandId: 1 });
proposalSchema.index({ client: 1 });
proposalSchema.index({ createdBy: 1 });
proposalSchema.index({ status: 1 });

const Proposal = mongoose.model('Proposal', proposalSchema);
export default Proposal;
