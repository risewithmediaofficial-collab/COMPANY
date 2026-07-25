import mongoose from 'mongoose';

const influencerSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    name: { type: String, required: true, trim: true },
    handle: { type: String, required: true, trim: true }, // e.g. @lifestyle_chennai
    influencerType: {
      type: String,
      enum: ['Local Influencer', 'Standard Influencer'],
      default: 'Standard Influencer',
      required: true,
    },
    platform: {
      type: String,
      enum: ['Instagram', 'YouTube', 'Facebook', 'Moj', 'Josh', 'X', 'Multi-platform'],
      default: 'Instagram',
      required: true,
    },
    category: { type: String, trim: true, default: 'Lifestyle' },
    cityLocation: { type: String, trim: true, default: '' },
    followersCount: { type: Number, default: 0, min: 0 },
    engagementRate: { type: Number, default: 0, min: 0 }, // in %

    pricing: {
      reelCost: { type: Number, default: 0, min: 0 },
      storyCost: { type: Number, default: 0, min: 0 },
      postCost: { type: Number, default: 0, min: 0 },
      eventCost: { type: Number, default: 0, min: 0 },
    },

    contactName: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    whatsapp: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },

    profileUrl: { type: String, trim: true, default: '' },
    mediaKitUrl: { type: String, trim: true, default: '' },
    rating: { type: Number, min: 1, max: 5, default: 5 },
    notes: { type: String, default: '' },

    isDeleted: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

influencerSchema.index({ influencerType: 1 });
influencerSchema.index({ platform: 1 });
influencerSchema.index({ cityLocation: 1 });
influencerSchema.index({ category: 1 });
influencerSchema.index({ isDeleted: 1 });

const Influencer = mongoose.model('Influencer', influencerSchema);
export default Influencer;
