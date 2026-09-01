// =============================================
// ATTENDANCE MODEL
// =============================================

import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  clockIn: { type: Date, required: true },
  clockOut: { type: Date },
  durationHours: { type: Number, default: 0 },
  // Location data for this session
  latitude: { type: Number },
  longitude: { type: Number },
  locationVerified: { type: Boolean, default: false },
  distanceFromOffice: { type: Number }, // in meters
});

const attendanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    clockIn: { type: Date },
    clockOut: { type: Date },
    totalHours: { type: Number, default: 0 },
    sessions: [sessionSchema],
    status: {
      type: String,
      enum: ['present', 'absent', 'half_day', 'leave', 'holiday', 'work_from_home'],
      default: 'present',
    },
    requestedStatus: {
      type: String,
      enum: ['present', 'absent', 'half_day', 'leave', 'holiday', 'work_from_home', 'none'],
      default: 'none',
    },
    approvalStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none',
    },
    location: { type: String, default: '' },
    // Location verification fields
    locationVerified: { type: Boolean, default: false }, // Overall location verified for the day
    locationVerificationStatus: {
      type: String,
      enum: ['none', 'pending', 'verified', 'failed'],
      default: 'none',
    },
    wfhApprovedForDate: { type: Boolean, default: false }, // Whether WFH was approved for this date
    wfhRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'WFHRequest' }, // Link to WFH request
    locationVerificationReason: { type: String, default: '' }, // Why location verification failed/passed
    notes: { type: String, default: '' },
    isApproved: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String, default: '' },
    eodReport: {
      summary: { type: String },
      tasksCompleted: [{ type: String }],
      blockers: { type: String },
      submittedAt: { type: Date },
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ user: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
