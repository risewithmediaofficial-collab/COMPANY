// =============================================
// SMM PROJECT MODEL
// =============================================
import mongoose from 'mongoose';

const smmProjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'SmmClient', required: true },
    platforms: [{
      type: String,
      enum: ['Meta Ads', 'Google Ads', 'LinkedIn', 'YouTube', 'TikTok', 'Instagram', 'Twitter'],
    }],
    projectManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'],
      default: 'Planning',
    },
    budget: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    startDate: { type: Date },
    endDate: { type: Date },
    description: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

smmProjectSchema.index({ client: 1 });
smmProjectSchema.index({ status: 1 });
smmProjectSchema.index({ projectManager: 1 });

const SmmProject = mongoose.model('SmmProject', smmProjectSchema);
export default SmmProject;
