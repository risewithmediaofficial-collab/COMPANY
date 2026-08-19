// =============================================
// SMM CONTENT MODEL (Central Video & Content OS Object)
// =============================================
import mongoose from 'mongoose';

const organicPerformanceSchema = new mongoose.Schema(
  {
    views: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    followersGained: { type: Number, default: 0 },
    videoViews: { type: Number, default: 0 },
    watchTime: { type: Number, default: 0 }, // in seconds
    engagement: { type: Number, default: 0 },
    engagementRate: { type: Number, default: 0 }, // in %
    // Reels / Video specific
    plays: { type: Number, default: 0 },
    threeSecViews: { type: Number, default: 0 },
    avgWatchTime: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    // Stories specific
    storyViews: { type: Number, default: 0 },
    replies: { type: Number, default: 0 },
    storyClicks: { type: Number, default: 0 },
    exits: { type: Number, default: 0 },
    storyCompletionRate: { type: Number, default: 0 },
  },
  { _id: false }
);

const advertisingConnectionSchema = new mongoose.Schema(
  {
    usedAsAd: { type: Boolean, default: false },
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'SmmCampaign' },
    adSet: { type: mongoose.Schema.Types.ObjectId, ref: 'SmmAdSet' },
    ad: { type: mongoose.Schema.Types.ObjectId, ref: 'SmmAd' },
    amountAdded: { type: Number, default: 0 },
    amountSpent: { type: Number, default: 0 },
    leads: { type: Number, default: 0 },
    results: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    cpl: { type: Number, default: 0 },
    roas: { type: Number, default: 0 },
  },
  { _id: false }
);

const productionSLASchema = new mongoose.Schema(
  {
    ideaDate: { type: Date },
    shootDate: { type: Date },
    editCompletedDate: { type: Date },
    reviewDate: { type: Date },
    approvalRequestedDate: { type: Date },
    approvedDate: { type: Date },
    publishedDate: { type: Date },
  },
  { _id: false }
);

const smmContentSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    contentType: {
      type: String,
      enum: ['Post', 'Reel', 'Story', 'Video', 'Short'],
      required: true,
      default: 'Reel',
    },
    platforms: [
      {
        type: String,
        enum: ['Instagram', 'Facebook', 'LinkedIn', 'YouTube', 'X/Twitter', 'Other'],
        required: true,
      },
    ],
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    caption: { type: String, default: '' },
    hashtags: [{ type: String }],
    contentUrl: { type: String, default: '' },
    mediaUpload: [{ type: String }],
    thumbnail: { type: String, default: '' },
    
    // Status & Publishing
    postingStatus: {
      type: String,
      enum: ['Draft', 'Ready', 'Scheduled', 'Pending Approval', 'Revision Required', 'Published', 'Cancelled'],
      default: 'Draft',
    },
    notPostedReason: {
      type: String,
      enum: [
        'Waiting for Client',
        'Waiting for Edit',
        'Revision Required',
        'Not Scheduled',
        'Strategy Hold',
        'Client Request',
        'Other',
        '',
      ],
      default: '',
    },
    
    // Dates & SLAs
    shootDate: { type: Date },
    scheduledDate: { type: Date },
    scheduledTime: { type: String, default: '' },
    actualPostedDate: { type: Date },
    actualPostedTime: { type: String, default: '' },
    postedUrl: { type: String, default: '' },
    approvalRequestedAt: { type: Date },
    productionSLA: { type: productionSLASchema, default: () => ({}) },
    
    // Performance & Decision Matrix
    performance: { type: organicPerformanceSchema, default: () => ({}) },
    advertising: { type: advertisingConnectionSchema, default: () => ({}) },
    performanceScore: { type: Number, default: 0 }, // 0 - 100
    adRecommendation: {
      type: String,
      enum: ['🔥 HIGH POTENTIAL', 'Good Organic', 'Do not boost yet', 'Under Review'],
      default: 'Under Review',
    },

    linkedAdCampaignIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SmmCampaign' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

smmContentSchema.index({ client: 1 });
smmContentSchema.index({ project: 1 });
smmContentSchema.index({ postingStatus: 1 });
smmContentSchema.index({ contentType: 1 });
smmContentSchema.index({ scheduledDate: 1 });
smmContentSchema.index({ actualPostedDate: 1 });
smmContentSchema.index({ performanceScore: -1 });

const SmmContent = mongoose.model('SmmContent', smmContentSchema);
export default SmmContent;
