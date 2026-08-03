import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    companyProfile: {
      name: { type: String, default: '' },
      address: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      gstNumber: { type: String, default: '' },
      services: { type: String, default: '' },
      logoUrl: { type: String, default: '' },
    },
    notifications: {
      email: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
      taskUpdates: { type: Boolean, default: true },
      leadUpdates: { type: Boolean, default: true },
      financeAlerts: { type: Boolean, default: true },
      dailyDigest: { type: Boolean, default: false },
    },
    appearance: {
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'light' },
      density: { type: String, enum: ['comfortable', 'compact'], default: 'comfortable' },
    },
    regional: {
      language: { type: String, default: 'en-US' },
      timezone: { type: String, default: 'Asia/Calcutta' },
      currency: { type: String, default: 'INR' },
    },
  },
  { timestamps: true }
);

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
