// =============================================
// SMM CREATIVE MODEL
// =============================================
import mongoose from 'mongoose';

const creativeSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Image', 'Video', 'Carousel', 'Thumbnail', 'PSD', 'AI File', 'Canva Link', 'Other'],
      required: true,
    },
    fileUrl: { type: String, default: '' },
    canvaLink: { type: String, default: '' },
    fileName: { type: String, default: '' },
    fileSize: { type: Number, default: 0 },
    caption: { type: String, default: '' },
    headline: { type: String, default: '' },
    platform: [{
      type: String,
      enum: ['Meta', 'Google', 'LinkedIn', 'YouTube', 'TikTok', 'Instagram', 'General'],
    }],
    tags: [{ type: String }],
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    version: { type: Number, default: 1 },
    previewUrl: { type: String, default: '' },
    versionHistory: [{
      version: Number,
      fileUrl: String,
      uploadedAt: { type: Date, default: Date.now },
      uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      notes: String,
    }],
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'SmmCampaign' },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'SmmClient' },
    isArchived: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

creativeSchema.index({ type: 1 });
creativeSchema.index({ platform: 1 });
creativeSchema.index({ tags: 1 });
creativeSchema.index({ uploadedBy: 1 });

const Creative = mongoose.model('SmmCreative', creativeSchema);
export default Creative;
