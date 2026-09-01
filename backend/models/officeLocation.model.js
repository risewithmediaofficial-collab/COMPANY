// =============================================
// OFFICE LOCATION MODEL
// =============================================

import mongoose from 'mongoose';

const officeLocationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g., "Main Office", "Branch Office"
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    radiusKm: { type: Number, default: 0.5 }, // Radius in kilometers (default 500m)
    address: { type: String },
    city: { type: String },
    country: { type: String },
    isActive: { type: Boolean, default: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  },
  { timestamps: true }
);

const OfficeLocation = mongoose.model('OfficeLocation', officeLocationSchema);
export default OfficeLocation;
