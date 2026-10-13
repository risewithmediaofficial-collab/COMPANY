// =============================================
// WEEKLY TODO MODEL
// Manages weekly todos assignable by Admins & Managers,
// and personal weekly todos created by Employees & Interns
// =============================================

import mongoose from 'mongoose';

const weeklyTodoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Todo title is required'],
      trim: true,
      maxlength: [300, 'Title cannot exceed 300 characters'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    // The user to whom this weekly todo belongs/is assigned
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned user is required'],
      index: true,
    },
    // The user who created/assigned this todo (admin, manager, or self)
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigner user is required'],
      index: true,
    },
    // Normalized start date of the week (Monday 00:00:00 UTC)
    weekStartDate: {
      type: Date,
      required: [true, 'Week start date is required'],
      index: true,
    },
    // Specific target date within the week (optional)
    targetDate: {
      type: Date,
    },
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Weekly Target'],
      default: 'Weekly Target',
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    isCompleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    completedAt: {
      type: Date,
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    category: {
      type: String,
      enum: ['general', 'client', 'dev', 'content', 'meeting', 'review', 'urgent'],
      default: 'general',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BrandWorkspace',
      index: true,
    },
  },
  { timestamps: true }
);

// Compound indexes for fast query performance
weeklyTodoSchema.index({ assignedTo: 1, weekStartDate: 1, isCompleted: 1 });
weeklyTodoSchema.index({ organizationId: 1, weekStartDate: 1 });
weeklyTodoSchema.index({ assignedBy: 1, createdAt: -1 });

const WeeklyTodo = mongoose.model('WeeklyTodo', weeklyTodoSchema);
export default WeeklyTodo;
