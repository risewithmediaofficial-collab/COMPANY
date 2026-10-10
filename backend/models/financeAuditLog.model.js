// =============================================
// FINANCE AUDIT LOG MODEL - Immutable Financial Audit Trail
// =============================================

import mongoose from 'mongoose';

const financeAuditLogSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    actorName: { type: String, default: '' },
    action: {
      type: String,
      required: true,
      enum: ['create', 'update', 'void', 'delete', 'approve', 'reject', 'pay', 'transfer', 'period_lock', 'period_unlock', 'import_opening'],
    },
    entityType: {
      type: String,
      required: true,
      enum: ['Invoice', 'Payment', 'Expense', 'InternalTransfer', 'SalaryRecord', 'FounderTransaction', 'FinanceAccount', 'Subscription', 'CostAllocation', 'PeriodLock'],
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    referenceNumber: { type: String, default: '' },
    description: { type: String, default: '' },
    changes: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

financeAuditLogSchema.index({ entityType: 1, entityId: 1 });
financeAuditLogSchema.index({ createdAt: -1 });

const FinanceAuditLog = mongoose.model('FinanceAuditLog', financeAuditLogSchema);
export default FinanceAuditLog;
