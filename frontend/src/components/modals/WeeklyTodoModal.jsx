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
  DialogClose,
} from '../ui/dialog';
import { Button } from '../ui/button';
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
      <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-border shadow-2xl max-w-2xl max-h-[90vh]">
        <DialogHeader className="px-6 py-4 sm:py-5 border-b border-border bg-card shrink-0 select-none flex flex-row items-center justify-between gap-4 m-0 space-y-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 shadow-2xs">
              <CheckSquare size={20} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                {todo ? 'Edit Weekly Todo' : isManagerOrAdmin ? 'Assign Weekly Todo' : 'Add Weekly Todo'}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-normal">
                {isManagerOrAdmin
                  ? 'Assign actionable weekly deliverables to team members, interns, or yourself.'
                  : 'Track your personal priorities and deliverables for the week.'}
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <kbd className="hidden sm:inline-flex items-center justify-center h-6 px-2 rounded-md bg-secondary/80 border border-border text-[10px] font-mono font-medium text-muted-foreground shadow-xs select-none">
              ESC
            </kbd>
            <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/70 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20">
              <X size={16} className="stroke-[2.5]" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Form Body - Google Form Linear Stack */}
          <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
            <div className="space-y-6">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground flex items-center justify-between">
                  <span>Todo Title *</span>
                  <span className="text-xs text-muted-foreground font-normal">Action-oriented task</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Deliver Brand Guidelines v2, Complete QA test sprint..."
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs transition-all"
                />
              </div>

              {/* Assignee (Shown for Manager / Admin) */}
              {isManagerOrAdmin ? (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <User size={15} className="text-primary" />
                      <span>Assign To Team Member / Intern *</span>
                    </span>
                    <span className="text-xs text-muted-foreground font-normal">Who executes this todo</span>
                  </label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs transition-all"
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
                <div className="p-3.5 rounded-xl bg-secondary/40 border border-border flex items-center gap-2.5 text-xs text-muted-foreground">
                  <User size={15} className="text-primary shrink-0" />
                  <span>
                    Assignee: <strong className="text-foreground">{currentUser?.name}</strong> (Personal Todo)
                  </span>
                </div>
              )}

              {/* Day of Week */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar size={15} className="text-primary" />
                  <span>Day of Week / Execution Target</span>
                </label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs transition-all"
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
                <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Flag size={15} className="text-primary" />
                  <span>Priority</span>
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs transition-all"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label} Priority
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Selector */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Tag size={15} className="text-primary" />
                  <span>Category / Stream</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((c) => {
                    const isSelected = category === c.value;
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setCategory(c.value)}
                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                            : 'bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border'
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
                <label className="text-sm font-semibold text-foreground flex items-center justify-between">
                  <span>Description / Instructions</span>
                  <span className="text-xs text-muted-foreground font-normal">Optional details</span>
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add specifics, links, or requirements for this todo..."
                  className="w-full p-3.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs transition-all resize-none"
                />
              </div>

              {/* Notes (Progress comments) */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground flex items-center justify-between">
                  <span>Execution Notes</span>
                  <span className="text-xs text-muted-foreground font-normal">Status notes or blockers</span>
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Blocked on client review, Draft sent for feedback..."
                  className="w-full p-3.5 rounded-xl border border-border bg-background text-foreground text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-2xs transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Pinned Sticky Bottom Action Footer */}
          <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-md px-6 py-4 flex items-center justify-between gap-3 z-10 shadow-xs select-none">
            <span className="text-xs text-muted-foreground/80 hidden sm:inline-flex items-center gap-1.5">
              <span>Press</span>
              <kbd className="px-1.5 py-0.5 rounded-md bg-secondary border border-border text-[10px] font-mono font-medium text-foreground">
                ESC
              </kbd>
              <span>to close</span>
            </span>

            <div className="flex items-center gap-3 ml-auto">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                className="h-11 px-5 rounded-xl text-sm font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || !title.trim()}
                className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/95 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 cursor-pointer transition-all gap-2"
              >
                {isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckSquare size={16} />
                    <span>{todo ? 'Save Changes' : isManagerOrAdmin ? 'Assign Todo' : 'Add Todo'}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default WeeklyTodoModal;
