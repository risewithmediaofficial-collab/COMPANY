// =============================================
// SMM DAILY REPORT MODEL (Daily Social Media & Ads Executive Summary)
// =============================================
import mongoose from 'mongoose';

const dailyNoteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    tag: {
      type: String,
      enum: ['success', 'warning', 'info'],
      default: 'info',
    },
  },
  { _id: true }
);

const timelineEventSchema = new mongoose.Schema(
  {
    time: { type: String, required: true }, // e.g. "09:20", "14:30"
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['content', 'budget', 'spend', 'leads', 'approval', 'report', 'other'],
      default: 'other',
    },
  },
  { _id: true }
);

const smmDailyReportSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    date: { type: Date, required: true, default: Date.now },
    
    // Content Summary
    contentSummary: {
      videosPosted: { type: Number, default: 0 },
      videosScheduled: { type: Number, default: 0 },
      videosPendingApproval: { type: Number, default: 0 },
      postedContentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SmmContent' }],
    },
    
    // Organic Summary
    organicSummary: {
      views: { type: Number, default: 0 },
      reach: { type: Number, default: 0 },
      engagement: { type: Number, default: 0 },
      followersGained: { type: Number, default: 0 },
    },
    
    // Ads Summary
    adsSummary: {
      amountAdded: { type: Number, default: 0 },
      amountSpent: { type: Number, default: 0 },
      leads: { type: Number, default: 0 },
      messages: { type: Number, default: 0 },
      calls: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      cpl: { type: Number, default: 0 },
    },
    
    // Qualitative daily notes
    notes: [dailyNoteSchema],
    
    // Day's activity timeline
    activityTimeline: [timelineEventSchema],
    
    status: {
      type: String,
      enum: ['Draft', 'Completed', 'Shared'],
      default: 'Draft',
    },
    
    loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

smmDailyReportSchema.index({ client: 1, date: -1 });
smmDailyReportSchema.index({ project: 1 });

const SmmDailyReport = mongoose.model('SmmDailyReport', smmDailyReportSchema);
export default SmmDailyReport;
