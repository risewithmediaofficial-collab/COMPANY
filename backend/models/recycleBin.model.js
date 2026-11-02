import mongoose from 'mongoose';

const recycleBinSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      required: true,
      index: true,
      // e.g. 'task', 'project', 'client', 'lead', 'expense', 'invoice', 'proposal', 'sop', 'asset', 'other'
    },
    originalId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subtitle: {
      type: String,
      default: '',
      trim: true,
    },
    originalLocation: {
      type: String,
      default: '',
      trim: true,
    },
    modelName: {
      type: String,
      required: true,
      // Mongoose model name: 'Task', 'Project', 'Client', 'Lead', 'Expense', 'Invoice', 'Proposal', 'SOP', 'Asset'
    },
    documentData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    deletedByRole: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

recycleBinSchema.index({ createdAt: -1 });
recycleBinSchema.index({ entityType: 1, createdAt: -1 });
recycleBinSchema.index({ deletedBy: 1, createdAt: -1 });

const RecycleBin = mongoose.model('RecycleBin', recycleBinSchema);
export default RecycleBin;
