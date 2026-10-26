// =============================================
// CONTENT PRODUCTION MODEL
// RiseWithMedia Content Production Management
// Connects Scriptwriter, Videographer, Video Editor, and SMM
// =============================================

import mongoose from 'mongoose';
import { getNextSequence } from './counter.model.js';

const scriptwriterStageSchema = new mongoose.Schema(
  {
    assignedMember: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedMemberName: { type: String, default: '' },
    videoType: {
      type: String,
      enum: [
        'Montage',
        'Voice-over',
        'CTA',
        'Services',
        'Customer Review',
        'Promotional',
        'Educational',
        'Interview',
        '',
      ],
      default: 'Promotional',
    },
    language: {
      type: String,
      enum: ['English', 'Tamil', 'Kannada', 'Telugu', 'Hindi', 'Other', ''],
      default: 'English',
    },
    hook: { type: String, trim: true, default: '' },
    fullScript: { type: String, default: '' },
    sceneBySceneInstructions: { type: String, default: '' },
    onScreenText: { type: String, default: '' },
    cta: {
      type: String,
      enum: ['Call Now', 'WhatsApp', 'Visit Website', 'Send DM', 'Book Now', 'Learn More', 'None', ''],
      default: 'None',
    },
    referenceVideoLink: { type: String, trim: true, default: '' },
    deadline: { type: Date, default: null },
    status: {
      type: String,
      enum: ['Draft', 'Internal Review', 'Client Approval', 'Approved', 'Revision Required'],
      default: 'Draft',
    },
    notes: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const videographerStageSchema = new mongoose.Schema(
  {
    assignedMember: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedMemberName: { type: String, default: '' },
    videoType: {
      type: String,
      enum: [
        'Montage',
        'Voice-over',
        'CTA',
        'Services',
        'Customer Review',
        'Promotional',
        'Interview',
        'Product Shoot',
        '',
      ],
      default: 'Product Shoot',
    },
    shootDate: { type: Date, default: null },
    shootTime: { type: String, trim: true, default: '' },
    shootLocation: { type: String, trim: true, default: '' },
    locationMapLink: { type: String, trim: true, default: '' },
    script: { type: String, default: '' },
    referenceVideoLink: { type: String, trim: true, default: '' },
    requiredShots: { type: String, default: '' },
    presenter: { type: String, trim: true, default: '' },
    equipment: [{ type: String, trim: true }],
    videoFormat: {
      type: String,
      enum: ['Vertical', 'Horizontal', 'Square', ''],
      default: 'Vertical',
    },
    specialInstructions: { type: String, default: '' },
    rawFootageDriveLink: { type: String, trim: true, default: '' },
    deadline: { type: Date, default: null },
    status: {
      type: String,
      enum: ['Scheduled', 'In Progress', 'Completed', 'Retake Required'],
      default: 'Scheduled',
    },
    notes: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const videoEditorStageSchema = new mongoose.Schema(
  {
    assignedMember: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedMemberName: { type: String, default: '' },
    videoType: {
      type: String,
      enum: [
        'Montage',
        'Voice-over',
        'CTA',
        'Services',
        'Customer Review',
        'Promotional',
        'Educational',
        'Talking Head',
        'Before & After',
        '',
      ],
      default: 'Promotional',
    },
    videoFormat: {
      type: String,
      enum: ['9:16', '16:9', '1:1', ''],
      default: '9:16',
    },
    videoDuration: {
      type: String,
      enum: ['15 sec', '30 sec', '60 sec', '90 sec', 'Custom', ''],
      default: '30 sec',
    },
    editingReferenceVideo: { type: String, trim: true, default: '' },
    selectedReferenceVideoId: { type: String, default: '' },
    selectedReferenceVideoTitle: { type: String, default: '' },
    rawFootageDriveLink: { type: String, trim: true, default: '' },
    script: { type: String, default: '' },
    selectedScriptId: { type: String, default: '' },
    selectedScriptTitle: { type: String, default: '' },
    voiceOverAudioLink: { type: String, trim: true, default: '' },
    musicReferenceLink: { type: String, trim: true, default: '' },
    captionOnScreenText: { type: String, default: '' },
    brandAssetsDriveLink: { type: String, trim: true, default: '' },
    editingInstructions: { type: String, default: '' },
    deadline: { type: Date, default: null },
    status: {
      type: String,
      enum: ['Pending', 'Editing', 'Review', 'Revision Required', 'Completed'],
      default: 'Pending',
    },
    finalVideoDriveLink: { type: String, trim: true, default: '' },
    notes: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const smmStageSchema = new mongoose.Schema(
  {
    assignedMember: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedMemberName: { type: String, default: '' },
    platforms: [{ type: String, trim: true }],
    contentType: {
      type: String,
      enum: ['Reel', 'Post', 'Carousel', 'Story', 'YouTube Short', ''],
      default: 'Reel',
    },
    caption: { type: String, default: '' },
    hashtags: { type: String, default: '' },
    cta: {
      type: String,
      enum: ['Call Now', 'WhatsApp', 'Visit Website', 'Send DM', 'Book Now', 'Learn More', 'None', ''],
      default: 'None',
    },
    finalCreativeDriveLink: { type: String, trim: true, default: '' },
    coverImageDriveLink: { type: String, trim: true, default: '' },
    scheduledDate: { type: Date, default: null },
    scheduledTime: { type: String, trim: true, default: '' },
    status: {
      type: String,
      enum: ['Content Pending', 'Approval Pending', 'Scheduled', 'Published'],
      default: 'Content Pending',
    },
    publishedPostUrl: { type: String, trim: true, default: '' },
    deadline: { type: Date, default: null },
    notes: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const revisionSchema = new mongoose.Schema(
  {
    stage: {
      type: String,
      enum: ['Scriptwriting', 'Videography', 'Video Editing', 'SMM', 'General'],
      required: true,
    },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requestedByName: { type: String, default: '' },
    feedback: { type: String, required: true },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const activityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String, default: '' },
    action: { type: String, required: true },
    stage: { type: String, default: '' },
    details: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

const contentProductionSchema = new mongoose.Schema(
  {
    contentId: {
      type: String,
      unique: true,
      trim: true,
      index: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: [true, 'Client is required'],
      index: true,
    },
    clientName: { type: String, trim: true, default: '' },
    title: {
      type: String,
      required: [true, 'Content Title is required'],
      trim: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    assignedPersonName: { type: String, trim: true, default: '' },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    currentStage: {
      type: String,
      enum: ['Scriptwriting', 'Videography', 'Video Editing', 'SMM', 'Published', 'Completed'],
      default: 'Scriptwriting',
      index: true,
    },
    overallStatus: {
      type: String,
      enum: [
        'Pending',
        'In Progress',
        'Review',
        'Revision Required',
        'Approved',
        'Scheduled',
        'Published',
        'Completed',
      ],
      default: 'Pending',
      index: true,
    },
    deadline: { type: Date, default: null },
    additionalNotes: { type: String, default: '' },
    attachments: [
      {
        name: { type: String, default: '' },
        url: { type: String, required: true },
        type: { type: String, default: '' },
      },
    ],
    driveLinks: [
      {
        label: { type: String, default: '' },
        url: { type: String, required: true },
      },
    ],
    scriptwriter: {
      type: scriptwriterStageSchema,
      default: () => ({}),
    },
    videographer: {
      type: videographerStageSchema,
      default: () => ({}),
    },
    videoEditor: {
      type: videoEditorStageSchema,
      default: () => ({}),
    },
    smm: {
      type: smmStageSchema,
      default: () => ({}),
    },
    revisions: [revisionSchema],
    activityLog: [activityLogSchema],

    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'BrandWorkspace' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Pre-save hook to generate atomic unique Content ID
contentProductionSchema.pre('save', async function (next) {
  if (!this.contentId) {
    const year = new Date().getFullYear();
    const nextSeq = await getNextSequence('contentProductionId', 1);
    this.contentId = `CNT-${year}-${String(nextSeq).padStart(4, '0')}`;
  }
  next();
});

contentProductionSchema.index({ client: 1, overallStatus: 1 });
contentProductionSchema.index({ currentStage: 1, overallStatus: 1 });
contentProductionSchema.index({ organizationId: 1 });
contentProductionSchema.index({ createdAt: -1 });

const ContentProduction = mongoose.model('ContentProduction', contentProductionSchema);

export default ContentProduction;
