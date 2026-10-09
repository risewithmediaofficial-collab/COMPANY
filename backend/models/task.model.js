// =============================================
// TASK MODEL - ClickUp-style task management
// =============================================

import mongoose from 'mongoose';

const fileAttachmentSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    url: { type: String, required: true },
    type: { type: String, default: '' },
    fileType: { type: String, default: '' },
    size: { type: Number, default: 0 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const commentSchema = new mongoose.Schema({
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  attachments: [fileAttachmentSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const progressUpdateSchema = new mongoose.Schema({
  description: { type: String, required: true }, // what work was completed
  hours: { type: Number, default: 0 }, // hours spent on this update
  workDate: { type: Date, default: Date.now }, // the work day the update belongs to
  completedAt: { type: Date, default: Date.now }, // when this progress was logged
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // who logged this
  workNotes: { type: String, default: '' },
  attachments: [fileAttachmentSchema],
});

const checklistItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: true, timestamps: true }
);

const taskNoteSchema = new mongoose.Schema(
  {
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    authorName: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'BrandWorkspace' },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    taskCategory: {
      type: String,
      enum: ['content', 'non_content'],
      default: 'content',
    },
    contentType: {
      type: String,
      enum: ['videos', 'posts', 'captions', 'designs', 'blogs', 'custom', ''],
      default: '',
    },
    videoType: {
      type: String,
      enum: ['shorts', 'youtube', 'reels', 'long_video', 'custom', ''],
      default: '',
    },
    nonContentCategory: {
      type: String,
      enum: ['website', 'crm', 'seo', 'ads_setup', 'client_followup', 'design_correction', 'development_task', 'bug_fix', 'custom', ''],
      default: '',
    },
    taskType: {
      type: String,
      enum: [
        'task',
        'content',
        'website_content',
        'non_content',
        'reel',
        'poster',
        'video',
        'social_media_post',
        'blog',
        'ad_creative',
        'video_content',
        'story',
        'carousel_post',
        'custom_content',
        'website_development',
        'website_update',
        'landing_page',
        'seo_work',
        'domain_hosting',
        'crm_update',
        'client_support',
        'lead_management',
        'ads_setup',
        'payment_follow_up',
        'report_preparation',
        'custom_task',
      ],
      default: 'task',
    },
    clientName: { type: String, default: '' },
    assignedPersonName: { type: String, default: '' },
    assignedManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Multi-Role Sub-Assignments (Notion / ClickUp style)
    scriptWriterAssigned: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    scriptWriterName: { type: String, default: '' },

    voiceArtistAssigned: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    voiceArtistName: { type: String, default: '' },
    voiceScriptText: { type: String, default: '' },
    voiceInstructions: { type: String, default: '' },

    videographerAssigned: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    videographerName: { type: String, default: '' },
    videographerContentNeeded: { type: String, default: '' },

    editorAssigned: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    editorName: { type: String, default: '' },

    publisherAssigned: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    publisherName: { type: String, default: '' },

    shootDate: { type: Date },
    shootLocation: { type: String, default: '' },
    rawFootageLink: { type: String, default: '' },

    postingPlatforms: [{ type: String }],
    postingScheduleDate: { type: Date },
    publishingDate: { type: Date },
    publishingTime: { type: String, default: '' },

    // Role Workflow Sub-statuses
    voiceStatus: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'not_applicable'],
      default: 'pending',
    },
    shootStatus: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'not_applicable'],
      default: 'pending',
    },
    editingStatus: {
      type: String,
      enum: ['pending', 'in_progress', 'review', 'completed', 'not_applicable'],
      default: 'pending',
    },
    postingStatus: {
      type: String,
      enum: ['pending', 'scheduled', 'posted', 'not_applicable'],
      default: 'pending',
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: [
        'todo',
        'in_progress',
        'review',
        'client_approval',
        'smm_team',
        'drive_uploaded',
        'approved',
        'rejected',
        'done',
        'on_process',
        'waiting_for_client',
        'completed',
        'rework',
        'rework_completed',
        'review_required',
      ],
      default: 'todo',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    dueDate: { type: Date },
    startDate: { type: Date },
    actualStartDate: { type: Date },
    completedAt: { type: Date },
    deadline: { type: Date },
    estimatedHours: { type: Number, default: 0 },
    loggedHours: { type: Number, default: 0 },
    // Content-specific fields
    contentTitle: { type: String, default: '' }, // For reels/videos - different from task title
    scriptText: { type: String, default: '' },
    scriptLink: { type: String, default: '' },
    caption: { type: String, default: '' },
    hashtags: { type: String, default: '' },
    keywords: { type: String, default: '' },
    referenceLink: { type: String, default: '' },
    contentIdea: { type: String, default: '' },
    audioReference: { type: String, default: '' },
    shootInstructions: { type: String, default: '' },
    editingInstructions: { type: String, default: '' },
    editorGuide: { type: String, default: '' },
    // Non-content fields
    requirementDetails: { type: String, default: '' },
    pageModuleName: { type: String, default: '' },
    loginAccessDetails: { type: String, default: '' },
    // Website fields
    websiteType: { type: String, default: '' },
    websiteRequirements: { type: String, default: '' },
    pagesNeeded: [{ type: String }],
    contentAvailability: {
      type: String,
      enum: ['content_provided', 'need_content_creation', 'partially_provided', ''],
      default: '',
    },
    brandingAvailability: {
      type: String,
      enum: ['logo_available', 'need_logo', 'need_branding', ''],
      default: '',
    },
    domainDetails: { type: String, default: '' },
    hostingDetails: { type: String, default: '' },
    adminCredentials: { type: String, default: '' },
    requiredFeatures: { type: String, default: '' },
    internalNotes: { type: String, default: '' },
    clientVisibleNotes: { type: String, default: '' },
    tags: [{ type: String }],
    checklist: [checklistItemSchema],
    taskNotes: [taskNoteSchema],
    comments: [commentSchema],
    attachments: [fileAttachmentSchema],
    orderIndex: { type: Number, default: 0 },
    isPersonalTask: { type: Boolean, default: false },
    isRecurring: { type: Boolean, default: false },
    recurringPattern: { type: String },
    approvalRequired: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
    isClientVisible: { type: Boolean, default: false },
    clientResponse: {
      type: String,
      enum: ['pending', 'yes', 'no'],
      default: 'pending',
    },
    clientFeedback: { type: String, default: '' },
    clientResponseDate: { type: Date },
    clientResponseBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rework_requested'],
      default: 'pending',
    },
    milestone: { type: mongoose.Schema.Types.ObjectId },
    timeEntries: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        hours: Number,
        description: String,
        date: { type: Date, default: Date.now },
      },
    ],
    completedFiles: [fileAttachmentSchema],
    progressUpdates: [progressUpdateSchema],
    isOverTarget: { type: Boolean, default: false },
    targetExceededBy: { type: Number, default: 0 },

    // ── Development Management Extension ──────────────────────────────
    department: { type: String, default: '', trim: true },
    development: {
      isDevTask: { type: Boolean, default: false },
      stage: {
        type: String,
        enum: [
          'backlog',
          'analysis',
          'ready_for_dev',
          'in_development',
          'code_review',
          'qa_testing',
          'client_uat',
          'approved',
          'deployment',
          'live',
          'closed',
          'blocked',
        ],
        default: 'backlog',
      },
      previousStage: { type: String, default: '' },
      isBlocked: { type: Boolean, default: false },
      blockedReason: { type: String, default: '' },
      blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      blockedAt: { type: Date, default: null },
      developer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      reviewStatus: {
        type: String,
        enum: ['none', 'pending', 'approved', 'changes_requested'],
        default: 'none',
      },
      reviewComments: { type: String, default: '' },
      reviewedAt: { type: Date, default: null },
      tester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      testStatus: {
        type: String,
        enum: ['none', 'pending', 'passed', 'failed', 'blocked'],
        default: 'none',
      },
      testNotes: { type: String, default: '' },
      testDate: { type: Date, default: null },
      testAttachments: [fileAttachmentSchema],
      branch: { type: String, default: '', trim: true },
      pullRequestUrl: { type: String, default: '', trim: true },
      pullRequestNumber: { type: String, default: '', trim: true },
      commitHash: { type: String, default: '', trim: true },
      sprint: { type: mongoose.Schema.Types.ObjectId, ref: 'Sprint', default: null },
      release: { type: mongoose.Schema.Types.ObjectId, ref: 'Release', default: null },
      isBug: { type: Boolean, default: false },
      bugSeverity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical', ''],
        default: '',
      },
      stepsToReproduce: { type: String, default: '' },
      expectedResult: { type: String, default: '' },
      actualResult: { type: String, default: '' },
      environment: { type: String, default: '' },
    },
    checklist: [checklistItemSchema],
    taskNotes: [taskNoteSchema],
  },
  { timestamps: true }
);

taskSchema.index({ department: 1 });
taskSchema.index({ 'development.isDevTask': 1, 'development.stage': 1 });
taskSchema.index({ 'development.sprint': 1 });
taskSchema.index({ 'development.release': 1 });

taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ parent: 1 });
taskSchema.index({ assignedManager: 1 });
taskSchema.index({ organizationId: 1 });
taskSchema.index({ brandId: 1 });

const Task = mongoose.model('Task', taskSchema);
export default Task;
