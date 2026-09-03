// =============================================
// SMM AD SPEND MODEL (Daily Spend & Cash Ledger)
// =============================================
import mongoose from 'mongoose';

const smmAdSpendSchema = new mongoose.Schema(
  {
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'SmmCampaign', required: true },
    ad: { type: mongoose.Schema.Types.ObjectId, ref: 'SmmAd' },
    sourceContentId: { type: mongoose.Schema.Types.ObjectId, ref: 'SmmContent' }, // Connected video if applicable
    date: { type: Date, required: true, default: Date.now },
    
    // Ledger: Amount Added vs Amount Spent & Balance
    amountAdded: { type: Number, default: 0 },
    amountSpent: { type: Number, required: true, default: 0 },
    balance: { type: Number, default: 0 }, // Cumulative balance after this entry
    dailyBudget: { type: Number, default: 0 },
    
    // Results
    leadsGenerated: { type: Number, default: 0 },
    messages: { type: Number, default: 0 },
    calls: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    reach: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    
    // Unit Costs
    cpl: { type: Number, default: 0 }, // Cost per lead (amountSpent / leadsGenerated)
    cpc: { type: Number, default: 0 }, // Cost per click (amountSpent / clicks)
    
    // Anomaly tracking
    isAnomaly: { type: Boolean, default: false },
    anomalyReason: { type: String, default: '' },
    
    notes: { type: String, default: '' },
    sentiment: { type: String, enum: ['positive', 'warning', 'info'], default: 'info' },
    loggedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

smmAdSpendSchema.index({ client: 1 });
smmAdSpendSchema.index({ project: 1 });
smmAdSpendSchema.index({ campaign: 1 });
smmAdSpendSchema.index({ ad: 1 });
smmAdSpendSchema.index({ sourceContentId: 1 });
smmAdSpendSchema.index({ date: -1 });

const SmmAdSpend = mongoose.model('SmmAdSpend', smmAdSpendSchema);
export default SmmAdSpend;
