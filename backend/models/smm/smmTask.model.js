// =============================================
// SMM TASK MODEL
// =============================================
import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

const smmAttachmentSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    url: { type: String, required: true },
    type: { type: String, default: '' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const smmTaskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'SmmCampaign' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'SmmProject' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Urgent'],
      default: 'Medium',
    },
    deadline: { type: Date },
    status: {
      type: String,
      enum: ['Todo', 'In Progress', 'Review', 'Done', 'Cancelled'],
      default: 'Todo',
    },
    attachments: [smmAttachmentSchema],
    comments: [commentSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

smmTaskSchema.index({ campaign: 1 });
smmTaskSchema.index({ assignedTo: 1 });
smmTaskSchema.index({ status: 1 });
smmTaskSchema.index({ priority: 1 });

const SmmTask = mongoose.model('SmmTask', smmTaskSchema);
export default SmmTask;
