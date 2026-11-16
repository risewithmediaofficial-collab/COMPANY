// =============================================
// DAILY TASK MODEL
// Stores day-by-day daily focus tasks picked from
// assigned tasks (with from-to dates) or quick tasks,
// with live timer tracking, status progression, and
// manager assignment capabilities.
// =============================================

import mongoose from 'mongoose';

const dailyTaskSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: 'BrandWorkspace' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null, index: true },
    date: { type: Date, required: true, index: true }, // Normalized to UTC start-of-day
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', default: null },
    clientName: { type: String, default: '' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    projectName: { type: String, default: '' },
    taskType: { type: String, default: 'task' },
    roleLabel: { type: String, default: '' }, // e.g. "Video Editor", "Videographer", "SMM", "Assignee"
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'review', 'completed', 'done'],
      default: 'todo',
    },
    fromDate: { type: Date, default: null },
    toDate: { type: Date, default: null },
    dateLabel: { type: String, default: '' }, // Formatted From Date - To Date string
    allocatedHours: { type: Number, default: 0 },
    allocatedMinutes: { type: Number, default: 0 },
    timeSpentSeconds: { type: Number, default: 0 },
    timerRunning: { type: Boolean, default: false },
    timerStartedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assignedByName: { type: String, default: '' },
    isQuickTask: { type: Boolean, default: false },
    notes: { type: String, default: '' },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

dailyTaskSchema.index({ user: 1, date: 1 });

const DailyTask = mongoose.model('DailyTask', dailyTaskSchema);
export default DailyTask;
