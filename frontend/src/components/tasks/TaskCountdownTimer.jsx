import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  Clock,
  Play,
  CheckCircle2,
  AlertTriangle,
  Send,
  Timer,
  AlertCircle,
  FileText,
  Hourglass,
  Calendar,
} from 'lucide-react';
import { useAcceptTask, useCheckTaskOverdue } from '../../hooks/useTasks';
import { toast } from 'sonner';

/**
 * Format milliseconds into HH : MM : SS
 */
const formatDuration = (ms) => {
  if (ms <= 0) return { hours: 0, minutes: 0, seconds: 0, formatted: '00:00:00' };
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');
  const formatted = `${hours > 0 ? `${pad(hours)}:` : ''}${pad(minutes)}:${pad(seconds)}`;
  return { hours, minutes, seconds, formatted };
};

export const TaskCountdownTimer = ({
  task,
  onOpenSubmitModal,
  compact = false,
  className = '',
}) => {
  const { user } = useSelector((state) => state.auth);
  const acceptTaskMutation = useAcceptTask();
  const checkOverdueMutation = useCheckTaskOverdue();

  const [now, setNow] = useState(() => Date.now());

  // Tick every second when task is accepted and not completed
  useEffect(() => {
    if (!task?.isAccepted || task?.completedAt || ['completed', 'done', 'approved'].includes(task?.status)) {
      return;
    }
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [task?.isAccepted, task?.completedAt, task?.status]);

  const hasAllocatedTimer = Boolean(
    (Number(task?.allocatedHours) || 0) > 0 || (Number(task?.allocatedMinutes) || 0) > 0
  );

  const isCompleted = ['completed', 'done', 'approved'].includes(task?.status) || Boolean(task?.completedAt);

  const timerTargetMs = useMemo(() => {
    if (!task?.timerExpiresAt) return null;
    return new Date(task.timerExpiresAt).getTime();
  }, [task?.timerExpiresAt]);

  const timerStartMs = useMemo(() => {
    if (!task?.timerStartedAt && !task?.acceptedAt) return null;
    return new Date(task.timerStartedAt || task.acceptedAt).getTime();
  }, [task?.timerStartedAt, task?.acceptedAt]);

  const totalAllocatedMs = useMemo(() => {
    if (!hasAllocatedTimer) return 0;
    return ((Number(task?.allocatedHours) || 0) * 60 + (Number(task?.allocatedMinutes) || 0)) * 60 * 1000;
  }, [hasAllocatedTimer, task?.allocatedHours, task?.allocatedMinutes]);

  const remainingMs = useMemo(() => {
    if (!timerTargetMs) return 0;
    return timerTargetMs - now;
  }, [timerTargetMs, now]);

  const isExpired = Boolean(timerTargetMs && remainingMs <= 0);
  const isOverdue = Boolean(task?.isOverdue || isExpired);

  // Trigger overdue check when countdown hits 0 in real-time
  useEffect(() => {
    if (isExpired && !task?.isOverdue && !isCompleted && task?._id) {
      checkOverdueMutation.mutate(task._id);
    }
  }, [isExpired, task?.isOverdue, isCompleted, task?._id]);

  // Check if current user is assigned or has administrative rights
  const isAssigned = useMemo(() => {
    if (!user?._id || !task) return false;
    const uId = user._id.toString();
    if (task.assignedTo) {
      const list = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo];
      if (list.some((a) => (typeof a === 'object' ? a?._id?.toString() : a?.toString()) === uId)) {
        return true;
      }
    }
    if (task.editorAssigned && task.editorAssigned.toString() === uId) return true;
    if (task.videographerAssigned && task.videographerAssigned.toString() === uId) return true;
    if (task.designerAssigned && task.designerAssigned.toString() === uId) return true;
    if (task.publisherAssigned && task.publisherAssigned.toString() === uId) return true;
    if (task.scriptWriterAssigned && task.scriptWriterAssigned.toString() === uId) return true;
    if (task.voiceArtistAssigned && task.voiceArtistAssigned.toString() === uId) return true;
    return false;
  }, [user?._id, task]);

  const canAccept = useMemo(() => {
    if (task?.isAccepted || isCompleted) return false;
    if (isAssigned) return true;
    // Admins and managers can also accept on behalf of employee
    if (['superAdmin', 'admin', 'manager', 'organizationOwner'].includes(user?.role)) return true;
    return false;
  }, [task?.isAccepted, isCompleted, isAssigned, user?.role]);

  const handleAcceptTask = async () => {
    if (!task?._id) return;
    try {
      await acceptTaskMutation.mutateAsync(task._id);
    } catch {
      // toast is already handled in mutation onError
    }
  };

  const timeFormatted = formatDuration(Math.max(0, remainingMs));
  const overdueDuration = formatDuration(Math.abs(remainingMs));

  // Progress percentage (0 to 100)
  const percentElapsed = useMemo(() => {
    if (!totalAllocatedMs || !timerStartMs) return 0;
    const elapsed = now - timerStartMs;
    return Math.min(100, Math.max(0, Math.round((elapsed / totalAllocatedMs) * 100)));
  }, [now, timerStartMs, totalAllocatedMs]);

  // If no timer configured and already completed without any timer info, render nothing
  if (!hasAllocatedTimer && !task?.isAccepted && !task?.timerExpiresAt) {
    return null;
  }

  // ── COMPACT VIEW (For Cards / Kanban) ──
  if (compact) {
    if (isCompleted) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 size={11} />
          <span>Completed</span>
        </span>
      );
    }
    if (!task?.isAccepted) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
          <Clock size={11} />
          <span>Timer: {task.allocatedHours || 0}h {task.allocatedMinutes || 0}m</span>
        </span>
      );
    }
    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse">
          <AlertTriangle size={11} />
          <span>Overdue (+{overdueDuration.formatted})</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
        <Timer size={11} className="animate-spin text-sky-500" style={{ animationDuration: '4s' }} />
        <span>{timeFormatted.formatted} left</span>
      </span>
    );
  }

  // ── DETAILED FULL VIEW (For TaskDetailModal & TaskDetails page) ──

  // Case 1: Task Completed
  if (isCompleted) {
    return (
      <div className={`rounded-2xl border p-4 transition-all shadow-xs ${
        task.submissionStatus === 'completed_with_delay' || task.isOverdue
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-emerald-500/30 bg-emerald-500/5'
      } ${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl border shrink-0 ${
              task.submissionStatus === 'completed_with_delay' || task.isOverdue
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            }`}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm text-foreground">
                  {task.submissionStatus === 'incomplete_with_reason'
                    ? 'Task Submitted Incomplete'
                    : task.submissionStatus === 'completed_with_delay' || task.isOverdue
                    ? 'Task Completed with Delay'
                    : 'Task Completed On Time'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  task.submissionStatus === 'completed_with_delay' || task.isOverdue
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                }`}>
                  {task.submissionStatus === 'completed_with_delay' || task.isOverdue ? 'Overdue Submission' : 'On Time 🎉'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {task.actualTimeSpentMinutes
                  ? `Time spent: ${Math.floor(task.actualTimeSpentMinutes / 60)}h ${task.actualTimeSpentMinutes % 60}m`
                  : 'Delivered'}
                {hasAllocatedTimer ? ` (Allocated: ${task.allocatedHours || 0}h ${task.allocatedMinutes || 0}m)` : ''}
                {task.submittedAt && ` • Submitted on ${new Date(task.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              </p>
            </div>
          </div>

          {onOpenSubmitModal && ['superAdmin', 'admin', 'manager'].includes(user?.role) && (
            <button
              type="button"
              onClick={onOpenSubmitModal}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-secondary text-foreground shrink-0 transition-all cursor-pointer"
            >
              Update Submission
            </button>
          )}
        </div>

        {/* Delay / Incomplete Reason display */}
        {task.completionReason && (
          <div className="mt-3.5 pt-3 border-t border-border/60">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <FileText size={13} />
                <span>Recorded Delay / Incomplete Reason</span>
              </span>
              <p className="text-xs text-foreground font-medium whitespace-pre-wrap">
                "{task.completionReason}"
              </p>
              {task.submissionNotes && (
                <p className="text-[11px] text-muted-foreground pt-1 border-t border-amber-500/15">
                  <span className="font-semibold text-foreground">Submission Note:</span> {task.submissionNotes}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Case 2: Not Accepted Yet
  if (!task?.isAccepted) {
    return (
      <div className={`rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent p-4 sm:p-5 shadow-xs transition-all ${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Clock size={22} className="animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-sm sm:text-base text-foreground tracking-tight">
                  Task Completion Timer
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                  Ready to Start
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {hasAllocatedTimer ? (
                  <>
                    Allocated completion duration: <span className="font-bold text-foreground">{task.allocatedHours || 0} hours {task.allocatedMinutes || 0} minutes</span>.
                    {task.dueTime && <> (Due by {task.dueTime})</>}
                    <br />
                    The countdown timer will start immediately once the task is accepted.
                  </>
                ) : (
                  <>Accept this task to log your start timestamp and begin work.</>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 sm:self-center">
            {canAccept ? (
              <button
                type="button"
                disabled={acceptTaskMutation.isLoading}
                onClick={handleAcceptTask}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-md shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-50"
              >
                <Play size={15} fill="currentColor" />
                <span>{acceptTaskMutation.isLoading ? 'Starting...' : 'Accept Task & Start Timer'}</span>
              </button>
            ) : (
              <span className="text-xs text-muted-foreground italic px-3 py-1.5 rounded-xl bg-secondary/60 border border-border/60">
                Awaiting assigned employee acceptance
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Case 3: Timer Expired / Overdue
  if (isOverdue) {
    return (
      <div className={`rounded-2xl border-2 border-rose-500/40 bg-rose-500/10 p-4 sm:p-5 shadow-sm space-y-3 animate-in fade-in duration-300 ${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-600 dark:text-rose-400 shrink-0 animate-pulse">
              <AlertTriangle size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-sm sm:text-base text-rose-700 dark:text-rose-300 uppercase tracking-tight">
                  🚨 Task Overdue Alert!
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black uppercase bg-rose-500 text-white shadow-xs">
                  Timer Expired
                </span>
              </div>
              <p className="text-xs text-rose-800/90 dark:text-rose-200 mt-1">
                The allocated time of <span className="font-bold">{task.allocatedHours || 0}h {task.allocatedMinutes || 0}m</span> has expired.
                {task.timerExpiresAt && ` Target was ${new Date(task.timerExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`}
                <br />
                <span className="font-semibold underline">A reason for delay / non-completion is required upon submitting.</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <div className="text-center sm:text-right px-3 py-2 rounded-xl bg-card border border-rose-500/30">
              <span className="text-[10px] uppercase font-bold text-rose-600 block">Exceeded by</span>
              <span className="font-mono font-black text-rose-600 text-sm sm:text-base">
                +{overdueDuration.formatted}
              </span>
            </div>

            {onOpenSubmitModal && (
              <button
                type="button"
                onClick={onOpenSubmitModal}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-md shadow-rose-600/30 transition-all cursor-pointer"
              >
                <Send size={14} />
                <span>Submit with Reason</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Case 4: Active & Running (On Track or Running Low)
  const isRunningLow = remainingMs <= 15 * 60 * 1000; // <= 15 minutes left

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 shadow-xs transition-all ${
      isRunningLow
        ? 'border-amber-500/40 bg-amber-500/10'
        : 'border-sky-500/30 bg-gradient-to-r from-sky-500/10 via-blue-500/5 to-transparent'
    } ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`p-3 rounded-2xl border shrink-0 ${
            isRunningLow
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-600 dark:text-amber-400 animate-pulse'
              : 'bg-sky-500/15 border-sky-500/30 text-sky-600 dark:text-sky-400'
          }`}>
            <Hourglass size={22} className={isRunningLow ? 'animate-bounce' : ''} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-sm sm:text-base text-foreground tracking-tight">
                Active Completion Countdown
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                isRunningLow
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                  : 'bg-sky-500/20 text-sky-700 dark:text-sky-300'
              }`}>
                {isRunningLow ? '⚠️ Time Running Low' : '⚡ In Progress'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Allocated: <span className="font-semibold text-foreground">{task.allocatedHours || 0}h {task.allocatedMinutes || 0}m</span>
              {task.timerExpiresAt && ` • Deadline: ${new Date(task.timerExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              {task.acceptedAt && ` (Started: ${new Date(task.acceptedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-stretch sm:self-auto justify-between sm:justify-end">
          {/* Big Live Countdown Digits */}
          <div className={`px-4 py-2 rounded-2xl border text-center font-mono ${
            isRunningLow
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300'
              : 'bg-card border-border text-foreground shadow-2xs'
          }`}>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">Remaining</span>
            <span className="text-base sm:text-xl font-black tracking-widest text-primary">
              {timeFormatted.formatted}
            </span>
          </div>

          {onOpenSubmitModal && (
            <button
              type="button"
              onClick={onOpenSubmitModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 shadow-md shadow-emerald-500/25 transition-all cursor-pointer"
            >
              <CheckCircle2 size={15} />
              <span>Submit Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar of Elapsed Time */}
      {hasAllocatedTimer && (
        <div className="mt-3.5 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold">
            <span>Elapsed: {percentElapsed}%</span>
            <span>Target: {task.timerExpiresAt ? new Date(task.timerExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'End'}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isRunningLow ? 'bg-amber-500' : 'bg-primary'
              }`}
              style={{ width: `${percentElapsed}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
