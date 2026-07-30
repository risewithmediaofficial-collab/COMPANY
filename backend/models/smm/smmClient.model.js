// =============================================
// SMM CLIENT MODEL
// =============================================
import mongoose from 'mongoose';

const smmClientSchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true },
    brandLogo: { type: String, default: '' },
    website: { type: String, default: '' },
    industry: { type: String, default: '' },
    primaryContact: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    address: { type: String, default: '' },
    timezone: { type: String, default: 'Asia/Kolkata' },
    notes: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Prospect', 'Paused'],
      default: 'Active',
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

smmClientSchema.index({ companyName: 'text', email: 'text', primaryContact: 'text' });
smmClientSchema.index({ status: 1 });

const SmmClient = mongoose.model('SmmClient', smmClientSchema);
export default SmmClient;
