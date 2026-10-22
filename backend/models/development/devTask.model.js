// =============================================
// DEV TASK MODEL (Development Module)
// Stored in dedicated 'dev_tasks' collection
// Strictly separated from general CRM tasks
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

const commentSchema = new mongoose.Schema(
  {
    content: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    attachments: [fileAttachmentSchema],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const checklistItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: true, timestamps: true }
);

export const DEV_STAGES = [
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
];

export const mapDevStageToGlobalStatus = (stage) => {
  const map = {
    backlog: 'todo',
    analysis: 'todo',
    ready_for_dev: 'todo',
    in_development: 'in_progress',
    code_review: 'review',
    qa_testing: 'review',
    client_uat: 'waiting_for_client',
    approved: 'approved',
    deployment: 'on_process',
    live: 'completed',
    closed: 'completed',
    blocked: 'rejected',
  };
  return map[stage] || 'todo';
};

const devTaskSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'BrandWorkspace' },

    title: { type: String, required: [true, 'Task title is required'], trim: true },
    taskTitle: { type: String, trim: true },
    description: { type: String, default: '' },

    taskCategory: { type: String, default: 'development' },
    department: { type: String, default: 'Development', trim: true },
    isDevTask: { type: Boolean, default: true },

    taskType: {
      type: String,
      default: 'website_development',
      trim: true,
    },

    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },

    status: {
      type: String,
      enum: [
        'todo',
        'in_progress',
        'review',
        'client_approval',
        'waiting_for_client',
        'approved',
        'completed',
        'rejected',
        'on_process',
        'done',
      ],
      default: 'todo',
    },

    stage: {
      type: String,
      enum: DEV_STAGES,
      default: 'backlog',
    },
    previousStage: { type: String, default: '' },

    isBlocked: { type: Boolean, default: false },
    blockedReason: { type: String, default: '' },
    blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    blockedAt: { type: Date, default: null },

    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    projectName: { type: String, default: '' },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
    clientName: { type: String, default: '' },

    developer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    assignedPersonName: { type: String, default: '' },

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
    repoLink: { type: String, default: '', trim: true },
    referenceLink: { type: String, default: '', trim: true },
    techScope: { type: String, default: '' },
    requirementDetails: { type: String, default: '' },

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

    dueDate: { type: Date },
    startDate: { type: Date },
    completedAt: { type: Date },

    estimatedHours: { type: Number, default: 0 },
    loggedHours: { type: Number, default: 0 },

    checklist: [checklistItemSchema],
    comments: [commentSchema],
    attachments: [fileAttachmentSchema],
    tags: [{ type: String }],

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    orderIndex: { type: Number, default: 0 },

    // Subdocument for compatibility with frontend components expecting task.development
    development: {
      isDevTask: { type: Boolean, default: true },
      stage: { type: String, enum: DEV_STAGES, default: 'backlog' },
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
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for high performance
devTaskSchema.index({ stage: 1 });
devTaskSchema.index({ sprint: 1 });
devTaskSchema.index({ release: 1 });
devTaskSchema.index({ developer: 1 });
devTaskSchema.index({ reviewer: 1 });
devTaskSchema.index({ tester: 1 });
devTaskSchema.index({ project: 1 });
devTaskSchema.index({ client: 1 });
devTaskSchema.index({ isBlocked: 1 });
devTaskSchema.index({ isBug: 1 });
devTaskSchema.index({ 'development.stage': 1 });

// Synchronize top-level fields with .development subdocument before saving
devTaskSchema.pre('save', function (next) {
  if (!this.taskTitle && this.title) {
    this.taskTitle = this.title;
  }
  if (!this.development) {
    this.development = { isDevTask: true };
  }

  // Sync stage
  if (this.isModified('stage') && !this.isModified('development.stage')) {
    this.development.stage = this.stage;
  } else if (this.isModified('development.stage') && !this.isModified('stage')) {
    this.stage = this.development.stage;
  } else if (this.stage && !this.development.stage) {
    this.development.stage = this.stage;
  } else if (this.development.stage && !this.stage) {
    this.stage = this.development.stage;
  }

  // Sync global status safely from stage
  const effectiveStage = this.development.stage || this.stage || 'backlog';
  this.status = mapDevStageToGlobalStatus(effectiveStage);
  if (['live', 'closed'].includes(effectiveStage) && !this.completedAt) {
    this.completedAt = new Date();
  }

  // Sync blocked state
  if (this.isModified('isBlocked')) {
    this.development.isBlocked = this.isBlocked;
    this.development.blockedReason = this.blockedReason;
    this.development.blockedBy = this.blockedBy;
    this.development.blockedAt = this.blockedAt;
  } else if (this.isModified('development.isBlocked')) {
    this.isBlocked = this.development.isBlocked;
    this.blockedReason = this.development.blockedReason;
    this.blockedBy = this.development.blockedBy;
    this.blockedAt = this.development.blockedAt;
  }

  // Sync developer / assignedTo
  if (this.developer) {
    this.development.developer = this.developer;
    if (!Array.isArray(this.assignedTo) || !this.assignedTo.some((id) => id?.toString() === this.developer.toString())) {
      this.assignedTo = this.assignedTo || [];
      this.assignedTo.push(this.developer);
    }
  } else if (this.development?.developer) {
    this.developer = this.development.developer;
    if (!Array.isArray(this.assignedTo) || !this.assignedTo.some((id) => id?.toString() === this.developer.toString())) {
      this.assignedTo = this.assignedTo || [];
      this.assignedTo.push(this.developer);
    }
  }

  // Sync reviewer & tester
  if (this.reviewer) this.development.reviewer = this.reviewer;
  if (this.development?.reviewer) this.reviewer = this.development.reviewer;
  if (this.tester) this.development.tester = this.tester;
  if (this.development?.tester) this.tester = this.development.tester;

  // Sync sprint & release
  if (this.sprint) this.development.sprint = this.sprint;
  if (this.development?.sprint) this.sprint = this.development.sprint;
  if (this.release) this.development.release = this.release;
  if (this.development?.release) this.release = this.development.release;

  // Sync bug attributes
  if (this.isBug !== undefined) this.development.isBug = this.isBug;
  if (this.bugSeverity) this.development.bugSeverity = this.bugSeverity;
  if (this.branch) this.development.branch = this.branch;
  if (this.pullRequestUrl) this.development.pullRequestUrl = this.pullRequestUrl;
  if (this.pullRequestNumber) this.development.pullRequestNumber = this.pullRequestNumber;
  if (this.commitHash) this.development.commitHash = this.commitHash;

  next();
});

// Explicit third parameter 'dev_tasks' guarantees separation from 'tasks' collection
const DevTask = mongoose.model('DevTask', devTaskSchema, 'dev_tasks');

export default DevTask;
