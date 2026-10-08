// =============================================
// NOTIFICATION MODEL
// =============================================

import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: [
        'task_assigned', 'task_due', 'task_completed', 'task_comment',
        'lead_assigned', 'lead_updated', 'deal_won',
        'project_created', 'project_updated',
        'invoice_sent', 'invoice_paid', 'invoice_overdue',
        'approval_request', 'approval_done',
        'client_approved', 'client_rework_requested', 'client_feedback',
        'attendance_reminder', 'eod_clockout_reminder', 'eod_reminder', 'clockout_reminder',
        'leave_approved', 'leave_rejected',
        'mention', 'system', 'general',
      ],
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String }, // frontend route to navigate
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
