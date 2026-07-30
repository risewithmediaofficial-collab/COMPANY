// =============================================
// SMM AD SET MODEL
// =============================================
import mongoose from 'mongoose';

const adSetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'SmmCampaign', required: true },
    status: {
      type: String,
      enum: ['Draft', 'Active', 'Paused', 'Completed', 'Error'],
      default: 'Draft',
    },
    audience: {
      location: [{ type: String }],
      ageMin: { type: Number, default: 18 },
      ageMax: { type: Number, default: 65 },
      gender: { type: String, enum: ['All', 'Male', 'Female'], default: 'All' },
      language: [{ type: String }],
      detailedTargeting: {
        interests: [{ type: String }],
        behaviors: [{ type: String }],
        demographics: [{ type: String }],
      },
      customAudience: {
        type: [{ type: String, enum: [
          'Website Visitors', 'Customer List', 'Instagram Engagers',
          'Facebook Engagers', 'Lookalike Audience'
        ]}],
        default: [],
      },
      audienceSize: { type: String, default: '' },
    },
    placements: [{
      type: String,
      enum: ['Facebook Feed', 'Instagram Feed', 'Stories', 'Reels', 'Messenger', 'Audience Network'],
    }],
    optimizationGoal: {
      type: String,
      enum: ['Conversions', 'Leads', 'Landing Page Views', 'Link Clicks', 'Purchases'],
      default: 'Link Clicks',
    },
    budget: { type: Number, default: 0 },
    budgetType: { type: String, enum: ['Daily', 'Lifetime'], default: 'Daily' },
    startDate: { type: Date },
    endDate: { type: Date },
    bidStrategy: {
      type: String,
      enum: ['Lowest Cost', 'Cost Cap', 'Bid Cap'],
      default: 'Lowest Cost',
    },
    bidAmount: { type: Number, default: 0 },
    // Future: externalAdSetId from Meta/Google
    externalAdSetId: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

adSetSchema.index({ campaign: 1 });
adSetSchema.index({ status: 1 });

const AdSet = mongoose.model('SmmAdSet', adSetSchema);
export default AdSet;
