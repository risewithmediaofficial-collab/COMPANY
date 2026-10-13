// =============================================
// WEEKLY TODO MODAL
// Create or Edit Weekly Todos
// Supports manager/admin assigning to employees & interns,
// or employees/interns creating their own weekly todos.
// =============================================

import React, { useState, useEffect } from 'react';
import {
  X,
  CheckSquare,
  Calendar,
  User,
  Tag,
  AlertCircle,
  Clock,
  Sparkles,
  FileText,
  Flag,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { useUsers } from '../../hooks/useUsers';

const DAYS_OF_WEEK = [
  'Weekly Target',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { value: 'high', label: 'High', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  { value: 'urgent', label: 'Urgent', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
];

const CATEGORIES = [
  { value: 'general', label: 'General / Admin', icon: '📋' },
  { value: 'client', label: 'Client Work', icon: '🏢' },
  { value: 'dev', label: 'Development', icon: '💻' },
  { value: 'content', label: 'Content & Design', icon: '🎨' },
  { value: 'meeting', label: 'Call / Meeting', icon: '📞' },
  { value: 'review', label: 'Review & QA', icon: '🔍' },
  { value: 'urgent', label: 'High Priority', icon: '🔥' },
];

export function WeeklyTodoModal({
  open,
  onOpenChange,
  todo = null,
  currentUser = null,
  isManagerOrAdmin = false,
  activeWeekStart = null,
  onSubmit,
  isPending = false,
}) {
  const { data: users = [] } = useUsers({ enabled: open && isManagerOrAdmin });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('Weekly Target');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('general');
  const [notes, setNotes] = useState('');

  // Active eligible users (filter active employees, interns, managers, designers, editors)
  const assignableUsers = users.filter(
    (u) => u.employmentStatus !== 'terminated' && u.role !== 'client' && u.role !== 'referral'
  );

  useEffect(() => {
    if (todo) {
      setTitle(todo.title || '');
      setDescription(todo.description || '');
      setAssignedTo(todo.assignedTo?._id || todo.assignedTo || currentUser?._id || '');
      setDayOfWeek(todo.dayOfWeek || 'Weekly Target');
      setPriority(todo.priority || 'medium');
      setCategory(todo.category || 'general');
      setNotes(todo.notes || '');
    } else {
      setTitle('');
      setDescription('');
      setAssignedTo(currentUser?._id || '');
      setDayOfWeek('Weekly Target');
      setPriority('medium');
      setCategory('general');
      setNotes('');
    }
  }, [todo, currentUser, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const payload = {
      title: title.trim(),
      description: description.trim(),
      dayOfWeek,
      priority,
      category,
      notes: notes.trim(),
    };

    if (activeWeekStart) {
      payload.weekStartDate = activeWeekStart;
    }

    if (isManagerOrAdmin) {
      payload.assignedTo = assignedTo || currentUser?._id;
    } else {
      payload.assignedTo = currentUser?._id;
    }

    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden rounded-2xl bg-card border-border shadow-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <CheckSquare size={20} />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {todo ? 'Edit Weekly Todo' : isManagerOrAdmin ? 'Assign Weekly Todo' : 'Add Weekly Todo'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {isManagerOrAdmin
                    ? 'Assign actionable weekly deliverables to team members, interns, or yourself.'
                    : 'Track your personal priorities and deliverables for the week.'}
                </DialogDescription>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>Todo Title *</span>
              <span className="text-[10px] text-muted-foreground font-normal">Action-oriented task</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Deliver Brand Guidelines v2, Complete QA test sprint..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-medium placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>

          {/* Assignee (Shown for Manager / Admin) */}
          {isManagerOrAdmin ? (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <User size={13} className="text-primary" />
                  <span>Assign To Team Member / Intern *</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-normal">Who executes this todo</span>
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                <option value={currentUser?._id}>👤 Myself ({currentUser?.name || 'Me'})</option>
                {assignableUsers
                  .filter((u) => u._id !== currentUser?._id)
                  .map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} — [{u.role?.toUpperCase() || 'EMPLOYEE'}] {u.department ? `(${u.department})` : ''}
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-secondary/40 border border-border/60 flex items-center gap-2 text-xs text-muted-foreground">
              <User size={14} className="text-primary shrink-0" />
              <span>
                Assignee: <strong className="text-foreground">{currentUser?.name}</strong> (Personal Todo)
              </span>
            </div>
          )}

          {/* Grid: Day of Week & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Day of Week */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Calendar size={13} className="text-primary" />
                <span>Day of Week</span>
              </label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                {DAYS_OF_WEEK.map((day) => (
                  <option key={day} value={day}>
                    {day === 'Weekly Target' ? '🎯 Whole Week Target' : `📅 ${day}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Flag size={13} className="text-primary" />
                <span>Priority</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label} Priority
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Tag size={13} className="text-primary" />
              <span>Category / Stream</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => {
                const isSelected = category === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                        : 'bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/60'
                    }`}
                  >
                    <span>{c.icon}</span>
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>Description / Instructions</span>
              <span className="text-[10px] text-muted-foreground font-normal">Optional details</span>
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add specifics, links, or requirements for this todo..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-medium placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
            />
          </div>

          {/* Notes (Progress comments) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground flex items-center justify-between">
              <span>Execution Notes</span>
              <span className="text-[10px] text-muted-foreground font-normal">Status notes or blockers</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Blocked on client review, Draft sent for feedback..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs font-medium placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-xl border border-border hover:bg-secondary text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !title.trim()}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isPending ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckSquare size={14} />
                  <span>{todo ? 'Save Changes' : isManagerOrAdmin ? 'Assign Todo' : 'Add Todo'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default WeeklyTodoModal;
