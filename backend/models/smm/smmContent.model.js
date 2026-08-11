// =============================================
// SMM CONTENT MODEL (Organic Posts, Reels, Stories)
// =============================================
import mongoose from 'mongoose';

const organicPerformanceSchema = new mongoose.Schema(
  {
    reach: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    videoViews: { type: Number, default: 0 },
    watchTime: { type: Number, default: 0 }, // in seconds
    engagement: { type: Number, default: 0 },
    engagementRate: { type: Number, default: 0 },
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

const smmContentSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    contentType: {
      type: String,
      enum: ['Post', 'Reel', 'Story'],
      required: true,
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
    postingStatus: {
      type: String,
      enum: ['Draft', 'Scheduled', 'Published', 'Cancelled'],
      default: 'Draft',
    },
    scheduledDate: { type: Date },
    scheduledTime: { type: String, default: '' },
    actualPostedDate: { type: Date },
    actualPostedTime: { type: String, default: '' },
    performance: { type: organicPerformanceSchema, default: () => ({}) },
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

const SmmContent = mongoose.model('SmmContent', smmContentSchema);
export default SmmContent;
