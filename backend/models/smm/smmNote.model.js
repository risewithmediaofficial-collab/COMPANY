// =============================================
// SMM NOTE MODEL
// =============================================
import mongoose from 'mongoose';

const smmNoteSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Meeting Notes', 'Call Notes', 'Client Feedback', 'Revision Request', 'Internal Notes'],
      required: true,
    },
    content: { type: String, required: true },
    relatedTo: {
      entityType: {
        type: String,
        enum: ['SmmClient', 'SmmProject', 'SmmCampaign', 'SmmAdSet', 'SmmAd'],
      },
      entityId: { type: mongoose.Schema.Types.ObjectId },
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

smmNoteSchema.index({ 'relatedTo.entityId': 1 });
smmNoteSchema.index({ createdBy: 1 });

const SmmNote = mongoose.model('SmmNote', smmNoteSchema);
export default SmmNote;
