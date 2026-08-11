// =============================================
// SMM CAMPAIGN MODEL (Paid Advertisements)
// =============================================
import mongoose from 'mongoose';

const performanceSchema = new mongoose.Schema({
  reach: { type: Number, default: 0 },
  impressions: { type: Number, default: 0 },
  frequency: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  ctr: { type: Number, default: 0 },
  cpc: { type: Number, default: 0 },
  cpm: { type: Number, default: 0 },
  spend: { type: Number, default: 0 },
  leads: { type: Number, default: 0 },
  purchases: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  roas: { type: Number, default: 0 },
  videoViews: { type: Number, default: 0 },
  engagement: { type: Number, default: 0 },
  costPerLead: { type: Number, default: 0 },
  lastSyncedAt: { type: Date },
  apiSource: { type: String, enum: ['manual', 'meta', 'google', 'linkedin'], default: 'manual' },
}, { _id: false });

const campaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    platform: {
      type: String,
      enum: ['Meta', 'Google', 'LinkedIn', 'YouTube', 'TikTok', 'Instagram', 'Twitter', 'Other'],
      required: true,
    },
    adSource: {
      type: String,
      enum: ['Existing Posted Content', 'Manual Ad'],
      default: 'Manual Ad',
    },
    sourceContentId: { type: mongoose.Schema.Types.ObjectId, ref: 'SmmContent' },
    
    // Manual Ad Fields if not linked to post
    adDescription: { type: String, default: '' },
    creativeUrl: { type: String, default: '' },
    landingPageUrl: { type: String, default: '' },
    cta: { type: String, default: 'Learn More' },
    adCopy: { type: String, default: '' },

    objective: {
      type: String,
      enum: ['Lead Generation', 'Website Traffic', 'Engagement', 'Awareness', 'Reach', 'Video Views', 'Conversions', 'Messages', 'Other'],
      required: true,
    },
    status: {
      type: String,
      enum: ['Draft', 'Scheduled', 'Running', 'Paused', 'Stopped', 'Completed'],
      default: 'Draft',
    },
    
    // Dates & Duration
    startDate: { type: Date },
    startTime: { type: String, default: '' },
    endDate: { type: Date },
    endTime: { type: String, default: '' },
    durationDays: { type: Number, default: 0 },

    // Budget & Financials
    budgetType: {
      type: String,
      enum: ['Daily Budget', 'Lifetime Budget'],
      default: 'Daily Budget',
    },
    dailyBudget: { type: Number, default: 0 },
    lifetimeBudget: { type: Number, default: 0 },
    amountSpent: { type: Number, default: 0 }, // Auto-updated from daily spend tracking logs
    remainingBalance: { type: Number, default: 0 }, // Auto-calculated (Total Budget - amountSpent)
    currency: { type: String, default: 'INR' },

    landingPage: { type: String, default: '' },
    pixelConnected: { type: Boolean, default: false },
    conversionApiEnabled: { type: Boolean, default: false },
    
    team: {
      campaignManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      performanceMarketer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      designer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      copywriter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    internalNotes: { type: String, default: '' },
    performance: { type: performanceSchema, default: () => ({}) },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

campaignSchema.index({ client: 1 });
campaignSchema.index({ project: 1 });
campaignSchema.index({ status: 1 });
campaignSchema.index({ platform: 1 });
campaignSchema.index({ sourceContentId: 1 });

const Campaign = mongoose.model('SmmCampaign', campaignSchema);
export default Campaign;
