// =============================================
// SMM AD MODEL
// =============================================
import mongoose from 'mongoose';

const adSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    adSet: { type: mongoose.Schema.Types.ObjectId, ref: 'SmmAdSet', required: true },
    status: {
      type: String,
      enum: ['Draft', 'Active', 'Paused', 'Rejected', 'Completed'],
      default: 'Draft',
    },
    creativeType: {
      type: String,
      enum: ['Image', 'Video', 'Carousel', 'Collection'],
      required: true,
    },
    // Creative uploads
    primaryImage: { type: String, default: '' },
    additionalImages: [{ type: String }],
    videoUrl: { type: String, default: '' },
    thumbnail: { type: String, default: '' },
    // Ad copy
    headline: { type: String, default: '' },
    primaryText: { type: String, default: '' },
    description: { type: String, default: '' },
    cta: {
      type: String,
      enum: ['Learn More', 'Book Now', 'Contact Us', 'Call Now', 'Sign Up', 'Shop Now', 'WhatsApp', 'Get Quote', 'Download'],
      default: 'Learn More',
    },
    destinationUrl: { type: String, default: '' },
    whatsappNumber: { type: String, default: '' },
    utmParameters: { type: String, default: '' },
    pixelEvent: { type: String, default: '' },
    creativeVersion: { type: Number, default: 1 },
    approvalStatus: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Changes Requested'],
      default: 'Pending',
    },
    approvalNotes: { type: String, default: '' },
    // Performance tracking per Ad
    performance: {
      leads: { type: Number, default: 0 },
      spend: { type: Number, default: 0 },
      revenue: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 },
      clicks: { type: Number, default: 0 },
      ctr: { type: Number, default: 0 },
      cpc: { type: Number, default: 0 },
      cpl: { type: Number, default: 0 },
      roas: { type: Number, default: 0 },
    },
    // Future: externalAdId from Meta/Google
    externalAdId: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

adSchema.index({ adSet: 1 });
adSchema.index({ status: 1 });
adSchema.index({ approvalStatus: 1 });

const Ad = mongoose.model('SmmAd', adSchema);
export default Ad;
