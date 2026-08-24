// =============================================
// PROJECT MONTHLY DELIVERABLE MODEL
// =============================================

import mongoose from 'mongoose';

const projectMonthlyDeliverableSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'BrandWorkspace' },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },
    contentType: {
      type: String,
      required: true,
      trim: true,
    },
    targetQuantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Compound Unique Index: Prevent duplicate deliverable targets for the same project, month, year, and content type
projectMonthlyDeliverableSchema.index(
  { projectId: 1, month: 1, year: 1, contentType: 1 },
  { unique: true }
);
projectMonthlyDeliverableSchema.index({ projectId: 1, year: 1, month: 1 });
projectMonthlyDeliverableSchema.index({ organizationId: 1 });
projectMonthlyDeliverableSchema.index({ brandId: 1 });

const ProjectMonthlyDeliverable = mongoose.model(
  'ProjectMonthlyDeliverable',
  projectMonthlyDeliverableSchema
);

export default ProjectMonthlyDeliverable;
