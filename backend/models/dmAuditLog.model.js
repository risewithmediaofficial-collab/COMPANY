import mongoose from 'mongoose';

const dmAuditLogSchema = new mongoose.Schema(
  {
    moduleType: {
      type: String,
      enum: ['VideoShoot', 'RJPromotion', 'VJPromotion'],
      required: true,
    },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    action: {
      type: String,
      enum: ['created', 'updated', 'deleted', 'status_changed', 'time_tracked'],
      required: true,
    },
    title: { type: String, default: '' },
    details: { type: String, default: '' },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

dmAuditLogSchema.index({ moduleType: 1 });
dmAuditLogSchema.index({ entityId: 1 });
dmAuditLogSchema.index({ createdAt: -1 });

const DMAuditLog = mongoose.model('DMAuditLog', dmAuditLogSchema);
export default DMAuditLog;
