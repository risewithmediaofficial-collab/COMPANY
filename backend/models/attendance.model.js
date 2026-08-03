// =============================================
// ATTENDANCE MODEL
// =============================================

import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  clockIn: { type: Date, required: true },
  clockOut: { type: Date },
  durationHours: { type: Number, default: 0 },
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
    location: { type: String, default: '' },
    notes: { type: String, default: '' },
    isApproved: { type: Boolean, default: false },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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
