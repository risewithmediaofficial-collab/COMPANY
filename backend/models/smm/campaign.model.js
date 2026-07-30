// =============================================
// SMM CAMPAIGN MODEL
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
  shares: { type: Number, default: 0 },
  comments: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  landingPageViews: { type: Number, default: 0 },
  costPerLead: { type: Number, default: 0 },
  costPerPurchase: { type: Number, default: 0 },
  // Future: synced from Meta/Google Ads API
  lastSyncedAt: { type: Date },
  apiSource: { type: String, enum: ['manual', 'meta', 'google', 'linkedin'], default: 'manual' },
}, { _id: false });

const dailyLogSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  leads: { type: Number, default: 0 },
  spend: { type: Number, default: 0 },
  revenue: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  impressions: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const campaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    dailyLogs: [dailyLogSchema],
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    objective: {
      type: String,
      enum: ['Awareness', 'Traffic', 'Engagement', 'Leads', 'App Promotion', 'Sales'],
      required: true,
    },
    campaignType: {
      type: String,
      enum: ['New Campaign', 'Scaling', 'Retargeting', 'Testing'],
      default: 'New Campaign',
    },
    status: {
      type: String,
      enum: ['Draft', 'Pending Approval', 'Scheduled', 'Active', 'Paused', 'Completed'],
      default: 'Draft',
    },
    platform: {
      type: String,
      enum: ['Meta', 'Google', 'LinkedIn', 'YouTube', 'TikTok'],
      required: true,
    },
    budgetType: {
      type: String,
      enum: ['Daily Budget', 'Lifetime Budget'],
      default: 'Daily Budget',
    },
    dailyBudget: { type: Number, default: 0 },
    lifetimeBudget: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    goal: { type: String, default: '' },
    landingPage: { type: String, default: '' },
    pixelConnected: { type: Boolean, default: false },
    conversionApiEnabled: { type: Boolean, default: false },
    startDate: { type: Date },
    endDate: { type: Date },
    team: {
      campaignManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      performanceMarketer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      designer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      videoEditor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      copywriter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
    internalNotes: { type: String, default: '' },
    performance: { type: performanceSchema, default: () => ({}) },
    // Future API integration fields
    externalCampaignId: { type: String, default: '' }, // Meta campaign_id or Google campaign_id
    adAccountId: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

campaignSchema.index({ project: 1 });
campaignSchema.index({ status: 1 });
campaignSchema.index({ platform: 1 });
campaignSchema.index({ 'team.campaignManager': 1 });

const Campaign = mongoose.model('SmmCampaign', campaignSchema);
export default Campaign;
