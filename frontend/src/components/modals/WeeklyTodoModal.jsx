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
} from '@/components/ui/muiIcons';
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
import { SelectDropdown } from '../ui/SelectDropdown';

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
  { value: 'low', label: 'Low', color: 'bg-muted text-muted-foreground ' },
  { value: 'medium', label: 'Medium', color: 'bg-secondary text-foreground ' },
  { value: 'high', label: 'High', color: 'bg-secondary text-foreground font-semibold' },
  { value: 'urgent', label: 'Urgent', color: 'bg-primary text-primary-foreground font-bold' },
];

const CATEGORIES = [
  { value: 'general', label: 'General / Admin' },
  { value: 'client', label: 'Client Work' },
  { value: 'dev', label: 'Development' },
  { value: 'content', label: 'Content & Design' },
  { value: 'meeting', label: 'Call / Meeting' },
  { value: 'review', label: 'Review & QA' },
  { value: 'urgent', label: 'High Priority' },
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
      <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-background max-w-2xl max-h-[90vh]">
        <DialogHeader className="px-6 py-4 sm:py-5 bg-background shrink-0 select-none flex flex-row items-center justify-between gap-4 m-0 space-y-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 ">
              <CheckSquare size={20} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                {todo ? 'Edit Weekly Todo' : isManagerOrAdmin ? 'Assign Weekly Todo' : 'Add Weekly Todo'}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {isManagerOrAdmin
                  ? 'Assign actionable weekly deliverables to team members, interns, or yourself.'
                  : 'Track your personal priorities and deliverables for the week.'}
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <kbd className="hidden sm:inline-flex items-center justify-center h-6 px-2 rounded-md bg-secondary/80 text-[10px] font-mono font-medium text-muted-foreground select-none">
              ESC
            </kbd>
            <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all hover:scale-105 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20">
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
                  className="w-full h-11 px-4 rounded-xl bg-secondary/75 text-foreground text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition-all"
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
                  <SelectDropdown
                    value={assignedTo || currentUser?._id}
                    onChange={(val) => setAssignedTo(val || currentUser?._id)}
                    options={[
                      { value: currentUser?._id, label: `Myself (${currentUser?.name || 'Me'})` },
                      ...assignableUsers
                        .filter((u) => u._id !== currentUser?._id)
                        .map((u) => ({
                          value: u._id,
                          label: u.name,
                          subLabel: `[${u.role?.toUpperCase() || 'EMPLOYEE'}]${u.department ? ` (${u.department})` : ''}`,
                        })),
                    ]}
                    placeholder="Assign To Team Member"
                    allowCustom={false}
                    allowDeselect={false}
                    className="w-full"
                    buttonClassName="h-11 rounded-xl bg-secondary/75 px-4 text-sm font-medium text-foreground border border-border/50"
                  />
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-secondary/40 flex items-center gap-2.5 text-xs text-muted-foreground">
                  <User size={15} className="text-primary shrink-0" />
                  <span>
                    Assignee: <strong className="text-foreground">{currentUser?.name}</strong> (Personal Todo)
                  </span>
                </div>
              )}

              {/* Day of Week */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar size={15} className="text-primary shrink-0" />
                  <span>Day of Week / Execution Target</span>
                </label>
                <SelectDropdown
                  value={dayOfWeek}
                  onChange={(val) => setDayOfWeek(val || 'Weekly Target')}
                  options={DAYS_OF_WEEK.map((day) => ({
                    value: day,
                    label: day === 'Weekly Target' ? 'Whole Week Target' : day,
                  }))}
                  placeholder="Day of Week"
                  allowCustom={false}
                  allowDeselect={false}
                  className="w-full"
                  buttonClassName="h-11 rounded-xl bg-secondary/75 px-4 text-sm font-medium text-foreground border border-border/50"
                />
              </div>

              {/* Priority */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <Flag size={15} className="text-primary" />
                  <span>Priority</span>
                </label>
                <SelectDropdown
                  value={priority}
                  onChange={(val) => setPriority(val || 'medium')}
                  options={PRIORITIES.map((p) => ({
                    value: p.value,
                    label: `${p.label} Priority`,
                  }))}
                  placeholder="Priority"
                  allowCustom={false}
                  allowDeselect={false}
                  className="w-full"
                  buttonClassName="h-11 rounded-xl bg-secondary/75 px-4 text-sm font-medium text-foreground border border-border/50"
                />
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
                            ? 'bg-primary text-primary-foreground font-semibold '
                            : 'bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground '
                        }`}
                      >
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
                  className="w-full p-3.5 rounded-xl bg-secondary/75 text-foreground text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition-all resize-none"
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
                  className="w-full p-3.5 rounded-xl bg-secondary/75 text-foreground text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Pinned Sticky Bottom Action Footer */}
          <div className="shrink-0 bg-background px-6 py-4 flex items-center justify-between gap-3 z-10 select-none">
            <span className="text-xs text-muted-foreground/80 hidden sm:inline-flex items-center gap-1.5">
              <span>Press</span>
              <kbd className="px-1.5 py-0.5 rounded-md bg-secondary text-[10px] font-mono font-medium text-foreground">
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
                className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/95 text-sm font-bold text-primary-foreground cursor-pointer transition-all gap-2"
              >
                {isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckSquare size={16} className="shrink-0" />
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
