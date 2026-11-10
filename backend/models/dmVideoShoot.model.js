import mongoose from 'mongoose';

const dmVideoShootSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    shootTitle: { type: String, required: true, trim: true },
    shootDate: { type: Date, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    duration: { type: Number, default: 0 }, // in hours
    shootLocation: { type: String, trim: true, default: '' },
    invoiceNumber: { type: String, trim: true, default: '' },

    // Content deliverable scope
    contentType: {
      type: String,
      enum: ['reels_and_posts', 'reels', 'posts'],
      default: 'reels_and_posts',
    },

    // Total content tracking (combined Reels + Posts)
    plannedContents: { type: Number, default: 0, min: 0 },
    completedContents: { type: Number, default: 0, min: 0 },
    contentsCompletionPct: { type: Number, default: 0 },

    // Reels tracking
    plannedReels: { type: Number, default: 0, min: 0 },
    completedReels: { type: Number, default: 0, min: 0 },
    reelsCompletionPct: { type: Number, default: 0 },

    // Posts tracking
    plannedPosts: { type: Number, default: 0, min: 0 },
    completedPosts: { type: Number, default: 0, min: 0 },
    postsCompletionPct: { type: Number, default: 0 },

    // Content Checklist (Reels & Posts)
    checklist: [
      {
        title: { type: String, trim: true, default: '' },
        type: { type: String, enum: ['reel', 'post'] },
        completed: { type: Boolean, default: false },
        completedAt: { type: Date },
        completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    // Team Assignment
    assignedTeam: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: { type: String, default: '' },
        role: { type: String, default: 'Team Member' },
      },
    ],

    // Equipment Section
    equipment: [{ type: String, trim: true }],

    // Itemized Expenses List
    expensesList: [
      {
        title: { type: String, required: true, trim: true },
        amount: { type: Number, required: true, min: 0, default: 0 },
      },
    ],

    // Expense Section
    totalAmount: { type: Number, default: 0, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    balanceAmount: { type: Number, default: 0 },

    notes: { type: String, default: '' },

    status: {
      type: String,
      enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Postponed'],
      default: 'Scheduled',
    },

    // Time Tracking
    shootStartedAt: { type: Date },
    shootEndedAt: { type: Date },
    actualDuration: { type: Number, default: 0 }, // in minutes

    // Audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

export const applyVideoShootCalculations = (doc) => {
  const isMod = (field) => (typeof doc.isModified === 'function' ? doc.isModified(field) : false);

  if (doc.contentType === 'reels') {
    doc.plannedPosts = 0;
  } else if (doc.contentType === 'posts') {
    doc.plannedReels = 0;
  }

  const combinedPlanned = Number(doc.plannedReels || 0) + Number(doc.plannedPosts || 0);
  if (combinedPlanned > 0) {
    if (
      doc.isNew ||
      isMod('plannedReels') ||
      isMod('plannedPosts') ||
      isMod('contentType') ||
      doc.plannedPosts > 0 ||
      doc.contentType !== 'reels_and_posts' ||
      !doc.plannedContents
    ) {
      doc.plannedContents = combinedPlanned;
    }
  } else if (
    (isMod('plannedReels') || isMod('plannedPosts') || isMod('contentType')) &&
    (!isMod('plannedContents') || doc.plannedContents === 0)
  ) {
    doc.plannedContents = 0;
  }

  if (doc.checklist && doc.checklist.length > 0) {
    const completedCount = doc.checklist.filter((item) => item.completed).length;
    doc.completedContents = completedCount;

    const reelItems = doc.checklist.filter((item) => item.type === 'reel');
    const postItems = doc.checklist.filter((item) => item.type === 'post');
    const hasTypedItems = reelItems.length > 0 || postItems.length > 0;

    if (hasTypedItems) {
      doc.completedReels = reelItems.filter((item) => item.completed).length;
      doc.completedPosts = postItems.filter((item) => item.completed).length;
    } else if (doc.contentType === 'posts') {
      doc.completedReels = 0;
      doc.completedPosts = completedCount;
    } else if (doc.plannedReels > 0 && (!doc.completedReels || doc.completedReels <= doc.completedContents)) {
      doc.completedReels = Math.min(completedCount, doc.plannedReels);
      if (doc.plannedPosts > 0) {
        doc.completedPosts = Math.min(Math.max(completedCount - doc.completedReels, 0), doc.plannedPosts);
      }
    }
  } else if (isMod('checklist')) {
    // Checklist cleared explicitly
    doc.completedContents = 0;
    doc.completedReels = 0;
    doc.completedPosts = 0;
  }

  if (doc.plannedContents > 0) {
    doc.contentsCompletionPct = Number(((doc.completedContents / doc.plannedContents) * 100).toFixed(1));
  } else {
    doc.contentsCompletionPct = 0;
  }

  if (doc.plannedReels > 0) {
    doc.reelsCompletionPct = Number(((doc.completedReels / doc.plannedReels) * 100).toFixed(1));
  } else {
    doc.reelsCompletionPct = 0;
  }

  if (doc.plannedPosts > 0) {
    doc.postsCompletionPct = Number(((doc.completedPosts / doc.plannedPosts) * 100).toFixed(1));
  } else {
    doc.postsCompletionPct = 0;
  }

  if (doc.expensesList && doc.expensesList.length > 0) {
    const sumExpenses = doc.expensesList.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    if (sumExpenses > 0) {
      doc.totalAmount = sumExpenses;
    }
  }

  doc.balanceAmount = Math.max(Number(doc.totalAmount || 0) - Number(doc.amountPaid || 0), 0);

  if (doc.startTime && doc.endTime) {
    const diffMs = new Date(doc.endTime) - new Date(doc.startTime);
    doc.duration = diffMs > 0 ? Number((diffMs / (1000 * 60 * 60)).toFixed(2)) : 0;
  }
};

// Pre-save calculations for percentages and balance amount
dmVideoShootSchema.pre('save', function (next) {
  applyVideoShootCalculations(this);
  next();
});

dmVideoShootSchema.index({ client: 1 });
dmVideoShootSchema.index({ shootDate: 1 });
dmVideoShootSchema.index({ status: 1 });
dmVideoShootSchema.index({ isDeleted: 1 });

const DMVideoShoot = mongoose.model('DMVideoShoot', dmVideoShootSchema);
export default DMVideoShoot;
