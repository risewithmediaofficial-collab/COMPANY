import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorRole: { type: String, default: '' },
    action: { type: String, required: true, trim: true },
    entityType: {
      type: String,
      enum: [
        'lead',
        'client',
        'project',
        'task',
        'invoice',
        'payment',
        'finance_entry',
        'expense',
        'job',
        'user',
        'communication',
        'automation',
        'settings',
        'attendance',
        'referral',
        'smm',
        'recycle_bin',
        'sop',
        'asset',
        'proposal',
        'loan',
        'founder',
        'auth',
      ],
      required: true,
    },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    relatedClient: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    relatedProject: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    relatedTask: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    relatedInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    relatedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

activityLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
activityLogSchema.index({ relatedClient: 1, createdAt: -1 });
activityLogSchema.index({ relatedProject: 1, createdAt: -1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export default ActivityLog;
