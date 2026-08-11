// =============================================
// SMM AD SPEND MODEL (Daily Spend & Metrics Log)
// =============================================
import mongoose from 'mongoose';

const smmAdSpendSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'SmmCampaign', required: true },
    date: { type: Date, required: true, default: Date.now },
    dailyBudget: { type: Number, default: 0 },
    amountSpent: { type: Number, required: true, default: 0 },
    leadsGenerated: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    cpl: { type: Number, default: 0 }, // Cost per lead (amountSpent / leadsGenerated)
    cpc: { type: Number, default: 0 }, // Cost per click (amountSpent / clicks)
    notes: { type: String, default: '' },
    loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

smmAdSpendSchema.index({ client: 1 });
smmAdSpendSchema.index({ project: 1 });
smmAdSpendSchema.index({ campaign: 1 });
smmAdSpendSchema.index({ date: -1 });

const SmmAdSpend = mongoose.model('SmmAdSpend', smmAdSpendSchema);
export default SmmAdSpend;
