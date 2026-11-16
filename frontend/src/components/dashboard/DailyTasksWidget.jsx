// =============================================
// DAILY TASKS WIDGET
// Interactive Daily Work Focus Section with live timer,
// from-to dates, status progression, and manager assignment.
// =============================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Play,
  Pause,
  Plus,
  CheckCircle2,
  AlertCircle,
  Building2,
  FolderOpen,
  Trash2,
  ChevronLeft,
  ChevronRight,
  User,
  Filter,
  Sparkles,
  Scissors,
  Camera,
  Share2,
  FileText,
  Check,
  RotateCcw,
  Square,
  CheckSquare,
} from '@/components/ui/muiIcons';
import {
  useDailyTasks,
  useStartDailyTaskTimer,
  useStopDailyTaskTimer,
  useUpdateDailyTaskStatus,
  useDeleteDailyTask,
  useCreateQuickDailyTask,
} from '../../hooks/useDailyTasks';
import { useUsers } from '../../hooks/useUsers';
import { AddDailyTaskModal } from './AddDailyTaskModal';
import { SelectDropdown } from '../ui/SelectDropdown';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { TaskDetailModal } from '../ui/TaskDetailModal';

export const formatTimerDisplay = (totalSeconds = 0) => {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const DailyTasksWidget = ({
  currentUser,
  isManagerOrAdmin = false,
  className = '',
}) => {
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedUserId, setSelectedUserId] = useState(currentUser?._id || '');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState('medium');
  const [quickHours, setQuickHours] = useState('');
  const [quickMinutes, setQuickMinutes] = useState('');
  const [quickNotes, setQuickNotes] = useState('');
  const [selectedTaskDetailId, setSelectedTaskDetailId] = useState(null);

  // Local live ticking clock state
  const [nowTimestamp, setNowTimestamp] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: usersData = [] } = useUsers();
  const staffUsers = useMemo(() => {
    const list = Array.isArray(usersData) ? usersData : usersData?.users || [];
    return list.filter((u) => u.role !== 'client');
  }, [usersData]);

  // Target user for query: either manager's selected user, or current user
  const effectiveUserId = isManagerOrAdmin && selectedUserId ? selectedUserId : currentUser?._id;
  const targetUserObj = useMemo(() => {
    return staffUsers.find((u) => u._id === effectiveUserId) || currentUser;
  }, [staffUsers, effectiveUserId, currentUser]);

  const { data: dailyData, isLoading, refetch } = useDailyTasks(
    selectedDate,
    effectiveUserId
  );

  const startTimerMutation = useStartDailyTaskTimer();
  const stopTimerMutation = useStopDailyTaskTimer();
  const updateStatusMutation = useUpdateDailyTaskStatus();
  const deleteDailyTaskMutation = useDeleteDailyTask();
  const createQuickTaskMutation = useCreateQuickDailyTask();

  const tasks = dailyData?.tasks || [];
  const stats = dailyData?.stats || {
    total: 0,
    completed: 0,
    inProgress: 0,
    pending: 0,
    totalTimeSpentSeconds: 0,
  };

  // Day navigation helpers
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const isSelectedDateToday = useMemo(() => {
    return selectedDate === new Date().toISOString().split('T')[0];
  }, [selectedDate]);

  const readableDate = useMemo(() => {
    const parts = selectedDate.split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [selectedDate]);

  const handleQuickCreate = async (e) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    try {
      await createQuickTaskMutation.mutateAsync({
        title: quickTitle.trim(),
        userId: effectiveUserId,
        date: selectedDate,
        priority: quickPriority,
        allocatedHours: Number(quickHours) || 0,
        allocatedMinutes: Number(quickMinutes) || 0,
        notes: quickNotes,
      });
      setQuickTitle('');
      setQuickHours('');
      setQuickMinutes('');
      setQuickNotes('');
      setShowQuickModal(false);
    } catch (err) {
      // handled in hook
    }
  };

  const getRoleIcon = (roleLabel = '') => {
    const norm = roleLabel.toLowerCase();
    if (norm.includes('edit')) return Scissors;
    if (norm.includes('shoot') || norm.includes('video')) return Camera;
    if (norm.includes('smm') || norm.includes('post')) return Share2;
    return FileText;
  };

  return (
    <div className={`rounded-3xl bg-card border border-border/40 p-4 sm:p-6 space-y-5 shadow-xs transition-all ${className}`}>
      {/* ── TOP HEADER ──────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
            <CheckSquare size={22} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Daily Work Tasks
              </h2>
              {isManagerOrAdmin && targetUserObj && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary text-xs font-semibold text-foreground">
                  <User size={11} className="text-primary" />
                  <span>{targetUserObj.name}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Plan and track today's focused work from assigned tasks with live timer and progress updates.
            </p>
          </div>
        </div>

        {/* Date Navigator & Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          {/* Day Navigator */}
          <div className="flex items-center rounded-xl bg-secondary/50 p-1">
            <button
              type="button"
              onClick={handlePrevDay}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-card hover:text-foreground transition-colors cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft size={15} />
            </button>

            <button
              type="button"
              onClick={handleToday}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                isSelectedDateToday
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-foreground hover:bg-card'
              }`}
            >
              {readableDate}
            </button>

            <button
              type="button"
              onClick={handleNextDay}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-card hover:text-foreground transition-colors cursor-pointer"
              title="Next Day"
            >
              <ChevronRight size={15} />
            </button>
          </div>

          {/* Manager Employee Switcher */}
          {isManagerOrAdmin && staffUsers.length > 0 && (
            <div className="min-w-[170px]">
              <SelectDropdown
                value={selectedUserId}
                onChange={(val) => setSelectedUserId(val || currentUser?._id)}
                options={staffUsers.map((u) => ({
                  value: u._id,
                  label: u._id === currentUser?._id ? `My Tasks (${u.name})` : u.name,
                  subLabel: u.position || u.role,
                }))}
                allowCustom={false}
                allowDeselect={false}
                className="w-full"
                buttonClassName="h-9 bg-secondary/50 text-xs font-semibold rounded-xl"
              />
            </div>
          )}

          {/* Action Buttons */}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
          >
            <Plus size={14} />
            <span>Add from Assigned</span>
          </button>

          <button
            type="button"
            onClick={() => setShowQuickModal(true)}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus size={13} />
            <span>Quick Task</span>
          </button>
        </div>
      </div>

      {/* ── DAILY SUMMARY BAR ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-1">
        <div className="p-3 sm:p-3.5 rounded-2xl bg-secondary/20 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Daily Tasks
          </span>
          <div className="text-lg sm:text-xl font-extrabold text-foreground tabular-nums">
            {stats.total}
          </div>
          <span className="text-[11px] text-muted-foreground">Planned for Day</span>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-secondary/20 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            In Progress
          </span>
          <div className="text-lg sm:text-xl font-extrabold text-primary tabular-nums">
            {stats.inProgress}
          </div>
          <span className="text-[11px] text-muted-foreground">Currently Working</span>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-secondary/20 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Completed
          </span>
          <div className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {stats.completed}
          </div>
          <span className="text-[11px] text-muted-foreground">Finished Work</span>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-secondary/20 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Time Logged Today
          </span>
          <div className="text-lg sm:text-xl font-extrabold text-foreground tabular-nums flex items-center gap-1.5">
            <Clock size={16} className="text-primary shrink-0" />
            <span>{formatTimerDisplay(stats.totalTimeSpentSeconds)}</span>
          </div>
          <span className="text-[11px] text-muted-foreground">Live Working Hours</span>
        </div>
      </div>

      {/* ── DAILY TASKS LIST ─────────────────────────────────────────── */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
            Loading daily tasks…
          </div>
        ) : tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/60 p-8 sm:p-10 text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto">
              <Calendar size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                No Daily Tasks Added for {readableDate}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                Select from your assigned tasks (with from–to dates) to schedule your daily work focus and track time with the live timer.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-xs"
              >
                <Plus size={14} />
                <span>Add from Assigned Tasks</span>
              </button>
              <button
                type="button"
                onClick={() => setShowQuickModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition-colors cursor-pointer"
              >
                <Plus size={13} />
                <span>Add Quick Task</span>
              </button>
            </div>
          </div>
        ) : (
          tasks.map((item) => {
            const isTimerRunning = Boolean(item.timerRunning);
            let liveSeconds = item.timeSpentSeconds || 0;
            if (isTimerRunning && item.timerStartedAt) {
              const extra = Math.max(0, Math.floor((nowTimestamp - new Date(item.timerStartedAt).getTime()) / 1000));
              liveSeconds += extra;
            }

            const RoleIcon = getRoleIcon(item.roleLabel);
            const isCompleted = item.status === 'completed' || item.status === 'done';

            return (
              <div
                key={item._id}
                className={`group rounded-2xl p-4 sm:p-4.5 border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3.5 ${
                  isTimerRunning
                    ? 'bg-primary/5 border-primary/40 shadow-[0_0_15px_-3px_hsl(var(--brand)/0.2)]'
                    : isCompleted
                    ? 'bg-secondary/15 border-border/30 opacity-75'
                    : 'bg-card border-border/40 hover:border-border/80'
                }`}
              >
                {/* Left: Check toggle + Content details */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      const next = isCompleted ? 'todo' : 'completed';
                      updateStatusMutation.mutate({ id: item._id, status: next });
                    }}
                    className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg border transition-colors cursor-pointer shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'border-border/70 hover:border-primary text-transparent'
                    }`}
                    title={isCompleted ? 'Mark as Incomplete' : 'Mark as Completed'}
                  >
                    <Check size={14} className={isCompleted ? 'stroke-[3]' : 'opacity-0'} />
                  </button>

                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-[10px] font-bold text-muted-foreground shrink-0">
                        <RoleIcon size={11} className="text-primary" />
                        <span>{item.roleLabel || 'Assignee'}</span>
                      </span>

                      {item.priority && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            item.priority === 'urgent'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : item.priority === 'high'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                          }`}
                        >
                          {item.priority}
                        </span>
                      )}

                      <h4
                        onClick={() => {
                          if (item.task?._id || item.task) {
                            setSelectedTaskDetailId(item.task?._id || item.task);
                          }
                        }}
                        className={`text-xs sm:text-sm font-bold text-foreground hover:underline cursor-pointer transition-colors truncate ${
                          isCompleted ? 'line-through text-muted-foreground' : ''
                        }`}
                        title="Click to view task details"
                      >
                        {item.title}
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground tabular-nums">
                      {item.clientName && (
                        <span className="inline-flex items-center gap-1 text-foreground/80 font-medium">
                          <Building2 size={11} className="text-muted-foreground" />
                          <span className="truncate">{item.clientName}</span>
                        </span>
                      )}

                      {item.projectName && (
                        <span className="inline-flex items-center gap-1 text-foreground/80 font-medium">
                          <FolderOpen size={11} className="text-muted-foreground" />
                          <span className="truncate">{item.projectName}</span>
                        </span>
                      )}

                      {/* FROM DATE - TO DATE BADGE */}
                      {item.dateLabel && (
                        <span className="inline-flex items-center gap-1 font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md shrink-0">
                          <Calendar size={10} />
                          <span>{item.dateLabel}</span>
                        </span>
                      )}

                      {(item.allocatedHours > 0 || item.allocatedMinutes > 0) && (
                        <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded-md shrink-0">
                          <Clock size={10} />
                          <span>Target: {item.allocatedHours || 0}h {item.allocatedMinutes || 0}m</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Live Timer Controller & Status Actions */}
                <div className="flex flex-wrap items-center justify-between md:justify-end gap-2.5 pt-2 md:pt-0 border-t border-border/20 md:border-none shrink-0">
                  {/* Live Timer Display & Play/Pause */}
                  <div className="flex items-center gap-2 bg-secondary/30 px-3 py-1.5 rounded-xl border border-border/30">
                    {isTimerRunning ? (
                      <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                    ) : (
                      <Clock size={13} className="text-muted-foreground" />
                    )}

                    <span
                      className={`text-xs font-mono font-extrabold tabular-nums ${
                        isTimerRunning
                          ? 'text-primary'
                          : liveSeconds > 0
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {formatTimerDisplay(liveSeconds)}
                    </span>

                    {/* Timer Button */}
                    {isTimerRunning ? (
                      <button
                        type="button"
                        onClick={() => stopTimerMutation.mutate(item._id)}
                        disabled={stopTimerMutation.isPending}
                        className="p-1 rounded-lg bg-card hover:bg-secondary text-amber-500 transition-colors cursor-pointer"
                        title="Pause Timer"
                      >
                        <Pause size={14} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startTimerMutation.mutate(item._id)}
                        disabled={startTimerMutation.isPending || isCompleted}
                        className="p-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors cursor-pointer disabled:opacity-40"
                        title="Start Timer"
                      >
                        <Play size={14} />
                      </button>
                    )}
                  </div>

                  {/* Status Dropdown */}
                  <div className="w-[125px]">
                    <SelectDropdown
                      value={item.status}
                      onChange={(val) => {
                        if (val && val !== item.status) {
                          updateStatusMutation.mutate({ id: item._id, status: val });
                        }
                      }}
                      options={[
                        { value: 'todo', label: 'To Do' },
                        { value: 'in_progress', label: 'In Progress' },
                        { value: 'review', label: 'Review' },
                        { value: 'completed', label: 'Completed' },
                      ]}
                      allowCustom={false}
                      allowDeselect={false}
                      className="w-full"
                      buttonClassName={`h-8 text-[11px] font-bold rounded-xl ${
                        item.status === 'completed' || item.status === 'done'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : item.status === 'in_progress'
                          ? 'bg-primary/15 text-primary'
                          : item.status === 'review'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          : 'bg-secondary text-foreground'
                      }`}
                    />
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => deleteDailyTaskMutation.mutate(item._id)}
                    className="p-1.5 rounded-lg text-muted-foreground/60 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Remove from Daily Tasks"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── MODALS ──────────────────────────────────────────────────── */}
      {showAddModal && (
        <AddDailyTaskModal
          open={showAddModal}
          onOpenChange={setShowAddModal}
          targetUser={targetUserObj}
          currentDateStr={selectedDate}
          onTaskAdded={() => refetch()}
        />
      )}

      {/* Quick Task Modal */}
      {showQuickModal && (
        <Dialog open={showQuickModal} onOpenChange={setShowQuickModal}>
          <DialogContent size="md" className="p-6 rounded-3xl bg-card border border-border/40 shadow-2xl space-y-4">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-foreground">
                Add Quick Daily Task
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Create a quick one-off task for today's daily focus.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleQuickCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Finish final color grade for Reel #2..."
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  required
                  className="h-10 w-full rounded-xl bg-background px-3 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Priority
                  </label>
                  <SelectDropdown
                    value={quickPriority}
                    onChange={(val) => setQuickPriority(val || 'medium')}
                    options={[
                      { value: 'urgent', label: 'Urgent' },
                      { value: 'high', label: 'High' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'low', label: 'Low' },
                    ]}
                    allowCustom={false}
                    className="w-full"
                    buttonClassName="h-10 text-xs rounded-xl bg-background"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground mb-1">
                    Allocated Hours
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 2"
                    value={quickHours}
                    onChange={(e) => setQuickHours(e.target.value)}
                    className="h-10 w-full rounded-xl bg-background px-3 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-foreground mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief note or checklist..."
                  value={quickNotes}
                  onChange={(e) => setQuickNotes(e.target.value)}
                  className="w-full rounded-xl bg-background p-3 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuickModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-secondary text-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createQuickTaskMutation.isPending}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {createQuickTaskMutation.isPending ? 'Adding…' : 'Add Task'}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Task Details Modal */}
      {selectedTaskDetailId && (
        <TaskDetailModal
          isOpen={Boolean(selectedTaskDetailId)}
          onClose={() => setSelectedTaskDetailId(null)}
          taskId={selectedTaskDetailId}
        />
      )}
    </div>
  );
};

export default DailyTasksWidget;
