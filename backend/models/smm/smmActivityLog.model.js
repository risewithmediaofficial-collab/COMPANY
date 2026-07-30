// =============================================
// SMM ACTIVITY LOG MODEL
// =============================================
import mongoose from 'mongoose';

const smmActivityLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: [
        'Campaign Created', 'Campaign Updated', 'Campaign Deleted',
        'Budget Changed', 'Ad Published', 'Ad Updated',
        'Creative Uploaded', 'Team Assigned',
        'Approval Given', 'Approval Rejected',
        'Ad Set Created', 'Ad Set Updated',
        'Client Created', 'Project Created',
        'Status Changed', 'Note Added',
      ],
      required: true,
    },
    entity: {
      type: String,
      enum: ['SmmClient', 'SmmProject', 'SmmCampaign', 'SmmAdSet', 'SmmAd', 'SmmCreative', 'SmmTask'],
    },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    entityName: { type: String, default: '' },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

smmActivityLogSchema.index({ entity: 1, entityId: 1 });
smmActivityLogSchema.index({ performedBy: 1 });
smmActivityLogSchema.index({ createdAt: -1 });

const SmmActivityLog = mongoose.model('SmmActivityLog', smmActivityLogSchema);
export default SmmActivityLog;
