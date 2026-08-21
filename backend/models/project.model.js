// =============================================
// PROJECT MODEL
// =============================================

import mongoose from 'mongoose';

const projectFileSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    url: { type: String, required: true },
    type: { type: String, default: '' },
    size: { type: Number, default: 0 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const milestoneSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  dueDate: { type: Date },
  isCompleted: { type: Boolean, default: false },
  completedAt: { type: Date },
});

const budgetSchema = new mongoose.Schema({
  marketingAmount: { type: Number, default: 0 },
  adsAmount: { type: Number, default: 0 },
  contentAmount: { type: Number, default: 0 },
  designAmount: { type: Number, default: 0 },
  developmentAmount: { type: Number, default: 0 },
  printingAmount: { type: Number, default: 0 },
  otherExpenses: { type: Number, default: 0 },
  quotedAmount: { type: Number, default: 0 },
  totalBudget: { type: Number, default: 0 },
  amountReceived: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid'],
    default: 'pending',
  },
  budgetNotes: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
});

const projectSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'BrandWorkspace' },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: false },
    isInternal: { type: Boolean, default: false },
    productType: {
      type: String,
      enum: ['client_project', 'saas_product', 'internal_tool', 'other'],
      default: 'client_project',
    },
    acceptedProposalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Proposal' },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    team: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: {
      type: String,
      enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
      default: 'planning',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    startDate: { type: Date },
    dueDate: { type: Date },
    completedAt: { type: Date },
    budget: { type: Number, default: 0 },
    budgetSpent: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    budgetDetails: budgetSchema,
    category: {
      type: String,
      enum: [
        'social_media',
        'seo',
        'paid_ads',
        'web_design',
        'web_development',
        'video_content',
        'content',
        'branding',
        'video',
        'graphic_design',
        'mobile_app',
        'e_commerce',
        'saas_product',
        'saas',
        'internal_tool',
        'internal_product',
        'product',
        'other',
      ],
      default: 'other',
    },
    proposalText: { type: String, default: '' },
    clientDiscussionNotes: { type: String, default: '' },
    nextMeetupDate: { type: Date },
    tags: [{ type: String }],
    milestones: [milestoneSchema],
    color: { type: String, default: '#6366f1' },
    coverImage: { type: String, default: '' },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    revisionCount: { type: Number, default: 0 },
    maxRevisions: { type: Number, default: 3 },
    files: [projectFileSchema],
    isTemplate: { type: Boolean, default: false },
    templateName: { type: String },
  },
  { timestamps: true }
);

projectSchema.index({ clientId: 1 });
projectSchema.index({ organizationId: 1 });
projectSchema.index({ brandId: 1 });
projectSchema.index({ manager: 1 });
projectSchema.index({ status: 1 });

const Project = mongoose.model('Project', projectSchema);
export default Project;
