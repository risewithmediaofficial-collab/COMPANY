// =============================================
// TASK NOTE MODEL - Project briefs, task change notes & scratchpads
// Supports task links, change scopes, checklists, tags, colors & pinning
// =============================================

import mongoose from 'mongoose';

const checklistItemSchema = new mongoose.Schema({
  text: { type: String, required: true, trim: true },
  completed: { type: Boolean, default: false },
});

const taskNoteSchema = new mongoose.Schema(
  {
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },

    // Who wrote the note
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    
    // Optional associated task, project, or client for tracking task changes
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },

    category: {
      type: String,
      enum: ['task_change', 'revision', 'bug_fix', 'feature_request', 'meeting_notes', 'client_feedback', 'scratchpad', 'general'],
      default: 'task_change',
    },

    changeScope: {
      type: String,
      enum: ['minor_tweak', 'major_overhaul', 'timeline_update', 'scope_addition', 'none'],
      default: 'minor_tweak',
    },

    tags: [{ type: String, trim: true }],

    checklists: [checklistItemSchema],

    isPinned: { type: Boolean, default: false },

    color: {
      type: String,
      enum: ['default', 'amber', 'emerald', 'blue', 'purple', 'rose'],
      default: 'default',
    },

    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },

    // Lifecycle status
    status: {
      type: String,
      enum: ['pending', 'assigned', 'dismissed'],
      default: 'pending',
    },

    // Manager who reviewed / acted on it
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },

    // After manager assigns
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedAt: { type: Date },

    // Optional manager note / instructions back to employee
    managerNote: { type: String, default: '' },

    // Due date suggested by manager when assigning
    dueDate: { type: Date },

    // Project brief fields
    startDate: { type: Date },
    deadline: { type: Date },
  },
  { timestamps: true }
);

taskNoteSchema.index({ submittedBy: 1, status: 1 });
taskNoteSchema.index({ task: 1 });
taskNoteSchema.index({ category: 1 });
taskNoteSchema.index({ isPinned: -1, createdAt: -1 });
taskNoteSchema.index({ status: 1 });
taskNoteSchema.index({ organizationId: 1 });

const TaskNote = mongoose.model('TaskNote', taskNoteSchema);
export default TaskNote;
