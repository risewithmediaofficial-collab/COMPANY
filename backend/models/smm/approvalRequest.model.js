// =============================================
// SMM APPROVAL REQUEST MODEL
// =============================================
import mongoose from 'mongoose';

const approvalCommentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

const approvalHistorySchema = new mongoose.Schema({
  status: { type: String },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changedAt: { type: Date, default: Date.now },
  note: { type: String, default: '' },
});

const approvalRequestSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Campaign', 'Creative', 'Copy', 'Ad Set', 'Ad'],
      required: true,
    },
    entity: {
      type: String,
      enum: ['SmmCampaign', 'SmmCreative', 'SmmAd'],
      required: true,
    },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    entityName: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Changes Requested'],
      default: 'Pending',
    },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    rejectedReason: { type: String, default: '' },
    comments: [approvalCommentSchema],
    history: [approvalHistorySchema],
    deadline: { type: Date },
  },
  { timestamps: true }
);

approvalRequestSchema.index({ status: 1 });
approvalRequestSchema.index({ entity: 1, entityId: 1 });
approvalRequestSchema.index({ requestedBy: 1 });

const ApprovalRequest = mongoose.model('SmmApprovalRequest', approvalRequestSchema);
export default ApprovalRequest;
