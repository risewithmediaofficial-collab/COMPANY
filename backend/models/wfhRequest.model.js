// =============================================
// WFH REQUEST MODEL
// =============================================

import mongoose from 'mongoose';

const wfhRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true }, // Date for which WFH is requested
    reason: { type: String, required: true }, // Reason for WFH request
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Manager who approved
    approvalDate: { type: Date }, // Date when approved/rejected
    rejectionReason: { type: String, default: '' }, // If rejected
    startTime: { type: String }, // Optional: HH:mm format (partial WFH)
    endTime: { type: String }, // Optional: HH:mm format (partial WFH)
    notes: { type: String, default: '' }, // Additional notes
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' }, // For reporting purposes
  },
  { timestamps: true }
);

// Index to find WFH approvals for a specific user and date
wfhRequestSchema.index({ user: 1, date: 1 });
wfhRequestSchema.index({ user: 1, status: 1 });
wfhRequestSchema.index({ status: 1 });
wfhRequestSchema.index({ approvedBy: 1 });

const WFHRequest = mongoose.model('WFHRequest', wfhRequestSchema);
export default WFHRequest;
