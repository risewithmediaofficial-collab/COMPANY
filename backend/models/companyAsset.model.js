import mongoose from 'mongoose';

const companyAssetSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'Laptops & Computers',
        'Cameras & Lenses',
        'Audio & Microphones',
        'Lighting & Studio',
        'Office Equipment',
        'Drones & Gimbals',
        'Storage & Networking',
        'Other',
      ],
      default: 'Other',
    },
    brand: {
      type: String,
      default: '',
      trim: true,
    },
    model: {
      type: String,
      default: '',
      trim: true,
    },
    serialNumber: {
      type: String,
      default: '',
      trim: true,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    purchaseCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    condition: {
      type: String,
      enum: ['Excellent', 'Good', 'Fair', 'Needs Repair', 'Retired / Written Off'],
      default: 'Good',
    },
    status: {
      type: String,
      enum: ['In Use', 'In Stock', 'Under Maintenance', 'Retired'],
      default: 'In Use',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    assignedToName: {
      type: String,
      default: '',
      trim: true,
    },
    location: {
      type: String,
      default: 'Headquarters',
      trim: true,
    },
    vendor: {
      type: String,
      default: '',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

companyAssetSchema.index({ category: 1, status: 1 });
companyAssetSchema.index({ organizationId: 1 });

const CompanyAsset = mongoose.model('CompanyAsset', companyAssetSchema);
export default CompanyAsset;
