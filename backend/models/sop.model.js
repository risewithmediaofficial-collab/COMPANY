// =============================================
// SOP MODEL - Standard Operating Procedures
// =============================================

import mongoose from 'mongoose';

const sopSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'BrandWorkspace' },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    sopType: {
      type: String,
      enum: ['company', 'role_based', 'department', 'project'],
      default: 'company',
    },
    // Cadence: One-Time Reference SOP vs Daily Mandatory Workflow SOP
    frequency: {
      type: String,
      enum: ['one_time', 'daily'],
      default: 'one_time',
    },
    // Department target for organization & daily EOD compliance
    departmentName: {
      type: String,
      default: 'General',
      trim: true,
    },
    // Compulsory daily compliance requirement
    isMandatory: {
      type: Boolean,
      default: false,
    },
    // Checklist items to complete before EOD submission
    checklist: [
      {
        text: { type: String, default: '' },
        required: { type: Boolean, default: true },
      },
    ],
    role: {
      type: String,
      enum: ['admin', 'manager', 'employee', 'designer', 'developer', 'content_writer', 'editor', 'social_media_manager', 'other'],
      default: null,
    },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    content: { type: String, default: '' }, // Main SOP description/content
    steps: { type: String, default: '' }, // Step-by-step instructions
    links: [
      {
        title: { type: String },
        url: { type: String },
      },
    ],
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

sopSchema.index({ organizationId: 1 });
sopSchema.index({ brandId: 1 });
sopSchema.index({ createdBy: 1 });
sopSchema.index({ sopType: 1 });
sopSchema.index({ role: 1 });

const SOP = mongoose.model('SOP', sopSchema);
export default SOP;
