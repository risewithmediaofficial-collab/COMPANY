// =============================================
// SMM LEAD MODEL (Paid & Organic Social Media Leads)
// =============================================
import mongoose from 'mongoose';

const smmLeadSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'SmmCampaign' },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    source: { type: String, default: 'Meta Ads' },
    leadDate: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['New', 'Contacted', 'Qualified', 'Follow-up', 'Converted', 'Lost'],
      default: 'New',
    },
    leadValue: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

smmLeadSchema.index({ client: 1 });
smmLeadSchema.index({ project: 1 });
smmLeadSchema.index({ campaign: 1 });
smmLeadSchema.index({ status: 1 });
smmLeadSchema.index({ leadDate: -1 });

const SmmLead = mongoose.model('SmmLead', smmLeadSchema);
export default SmmLead;
