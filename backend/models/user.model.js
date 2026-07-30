// =============================================
// USER MODEL
// =============================================

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['superAdmin', 'organizationOwner', 'manager', 'accountManager', 'editor', 'designer', 'adsManager', 'financeManager', 'clientAdmin', 'clientMember', 'intern', 'employee', 'referral', 'client'],
      default: 'employee',
    },
    avatar: { type: String, default: '' },
    phone: { type: String, default: '' },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    assignedBrands: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BrandWorkspace' }],
    department: { type: String, default: '' }, // legacy/string fallback
    position: { type: String, default: '' },
    salary: { type: Number, default: 0, min: 0 },
    joinDate: { type: Date, default: Date.now },
    employmentStatus: {
      type: String,
      enum: ['active', 'inactive', 'on_leave', 'terminated'],
      default: 'active',
    },
    notes: { type: String, default: '' },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // For clients - linked client/brand record
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'BrandWorkspace' },

    // For referral partners
    referralCode: { type: String, unique: true, sparse: true },

    // Auth tokens
    refreshToken: { type: String, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpire: { type: Date, select: false },

    isActive: { type: Boolean, default: true },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    lastLogin: { type: Date },

    // Permissions (granular overrides beyond role)
    permissions: {
      canViewReports: { type: Boolean, default: false },
      canApproveContent: { type: Boolean, default: false },
      canManageFinance: { type: Boolean, default: false },
      canAssignTasks: { type: Boolean, default: false },
      canUploadAssets: { type: Boolean, default: false },
      canViewAnalytics: { type: Boolean, default: false },
      canManageEmployees: { type: Boolean, default: false },
      canManageLeads: { type: Boolean, default: false },
      canManageHR: { type: Boolean, default: false },
      canAccessSmm: { type: Boolean, default: false },
    },

    // Notification preferences
    notifyEmail: { type: Boolean, default: true },
    notifyInApp: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Generate referral code for referral partners
userSchema.pre('save', function (next) {
  if (this.role === 'referral' && !this.referralCode) {
    this.referralCode = `REF-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }
  next();
});

// Compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Supplemental indexes (email & referralCode are indexed via unique:true - no duplicates)
userSchema.index({ role: 1 });
userSchema.index({ employmentStatus: 1 });
userSchema.index({ organizationId: 1 });
userSchema.index({ assignedBrands: 1 });
userSchema.index({ approvalStatus: 1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ createdAt: -1 });

const User = mongoose.model('User', userSchema);
export default User;
