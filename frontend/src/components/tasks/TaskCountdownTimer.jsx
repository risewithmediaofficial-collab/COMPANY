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
} from '@/components/ui/muiIcons';
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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-secondary text-foreground ">
          <CheckCircle2 size={11} />
          <span>Completed</span>
        </span>
      );
    }
    if (!task?.isAccepted) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-secondary/70 text-muted-foreground tabular-nums">
          <Clock size={11} />
          <span>Timer: {task.allocatedHours || 0}h {task.allocatedMinutes || 0}m</span>
        </span>
      );
    }
    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-primary text-primary-foreground tabular-nums">
          <AlertTriangle size={11} />
          <span>Overdue (+{overdueDuration.formatted})</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-secondary text-foreground tabular-nums">
        <Timer size={11} className="text-foreground" />
        <span>{timeFormatted.formatted} left</span>
      </span>
    );
  }

  // ── DETAILED FULL VIEW (For TaskDetailModal & TaskDetails page) ──

  // Case 1: Task Completed
  if (isCompleted) {
    return (
      <div className={`rounded-2xl p-4 transition-all ${
        task.submissionStatus === 'completed_with_delay' || task.isOverdue
          ? ' bg-secondary/70'
          : ' bg-secondary/40'
      } ${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${
              task.submissionStatus === 'completed_with_delay' || task.isOverdue
                ? 'bg-secondary text-foreground'
                : 'bg-primary text-primary-foreground'
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
                    ? 'bg-secondary text-foreground '
                    : 'bg-primary text-primary-foreground '
                }`}>
                  {task.submissionStatus === 'completed_with_delay' || task.isOverdue ? 'Overdue Submission' : 'On Time'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 tabular-nums">
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
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-card hover:bg-secondary text-foreground shrink-0 transition-all cursor-pointer"
            >
              Update Submission
            </button>
          )}
        </div>

        {/* Delay / Incomplete Reason display */}
        {task.completionReason && (
          <div className="mt-3.5 pt-3 ">
            <div className="rounded-xl bg-card p-3 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <FileText size={13} />
                <span>Recorded Delay / Incomplete Reason</span>
              </span>
              <p className="text-xs text-foreground font-medium whitespace-pre-wrap">
                &ldquo;{task.completionReason}&rdquo;
              </p>
              {task.submissionNotes && (
                <p className="text-[11px] text-muted-foreground pt-1 ">
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
      <div className={`rounded-2xl bg-card p-4 sm:p-5 transition-all ${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-secondary text-foreground shrink-0">
              <Clock size={22} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-sm sm:text-base text-foreground tracking-tight">
                  Task Completion Timer
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-secondary text-foreground ">
                  Ready to Start
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {hasAllocatedTimer ? (
                  <>
                    Allocated completion duration: <span className="font-bold text-foreground tabular-nums">{task.allocatedHours || 0} hours {task.allocatedMinutes || 0} minutes</span>.
                    {task.dueTime && <> (Due by <span className="tabular-nums">{task.dueTime}</span>)</>}
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
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-primary-foreground bg-primary hover:bg-primary/90 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <Play size={15} fill="currentColor" />
                <span>{acceptTaskMutation.isLoading ? 'Starting...' : 'Accept Task & Start Timer'}</span>
              </button>
            ) : (
              <span className="text-xs text-muted-foreground italic px-3 py-1.5 rounded-xl bg-secondary ">
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
      <div className={`rounded-2xl bg-secondary/70 p-4 sm:p-5 space-y-3 animate-in fade-in duration-300 ${className}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-2xl bg-primary text-primary-foreground shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-sm sm:text-base text-foreground uppercase tracking-tight">
                  Task Overdue Alert
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black uppercase bg-primary text-primary-foreground ">
                  Timer Expired
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                The allocated time of <span className="font-bold text-foreground tabular-nums">{task.allocatedHours || 0}h {task.allocatedMinutes || 0}m</span> has expired.
                {task.timerExpiresAt && ` Target was ${new Date(task.timerExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`}
                <br />
                <span className="font-semibold text-foreground underline">A reason for delay / non-completion is required upon submitting.</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <div className="text-center sm:text-right px-3 py-2 rounded-xl bg-card ">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Exceeded by</span>
              <span className="font-mono font-black text-foreground text-sm sm:text-base tabular-nums">
                +{overdueDuration.formatted}
              </span>
            </div>

            {onOpenSubmitModal && (
              <button
                type="button"
                onClick={onOpenSubmitModal}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-primary-foreground bg-primary hover:bg-primary/90 active:scale-95 transition-all cursor-pointer"
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
    <div className={`rounded-2xl p-4 sm:p-5 transition-all ${
      isRunningLow
        ? ' bg-secondary/70'
        : ' bg-card'
    } ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`p-3 rounded-2xl shrink-0 ${
            isRunningLow
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-foreground'
          }`}>
            <Hourglass size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-sm sm:text-base text-foreground tracking-tight">
                Active Completion Countdown
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                isRunningLow
                  ? 'bg-primary text-primary-foreground '
                  : 'bg-secondary text-foreground '
              }`}>
                {isRunningLow ? 'Time Running Low' : 'In Progress'}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
              Allocated: <span className="font-semibold text-foreground">{task.allocatedHours || 0}h {task.allocatedMinutes || 0}m</span>
              {task.timerExpiresAt && ` • Deadline: ${new Date(task.timerExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              {task.acceptedAt && ` (Started: ${new Date(task.acceptedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-stretch sm:self-auto justify-between sm:justify-end">
          {/* Big Live Countdown Digits */}
          <div className={`px-4 py-2 rounded-2xl text-center font-mono ${
            isRunningLow
              ? 'bg-secondary text-foreground'
              : 'bg-background text-foreground '
          }`}>
            <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">Remaining</span>
            <span className="text-base sm:text-xl font-black tracking-widest text-foreground tabular-nums">
              {timeFormatted.formatted}
            </span>
          </div>

          {onOpenSubmitModal && (
            <button
              type="button"
              onClick={onOpenSubmitModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-primary-foreground bg-primary hover:bg-primary/90 active:scale-95 transition-all cursor-pointer"
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
          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-semibold tabular-nums">
            <span>Elapsed: {percentElapsed}%</span>
            <span>Target: {task.timerExpiresAt ? new Date(task.timerExpiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'End'}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full transition-all duration-500 rounded-full bg-primary"
              style={{ width: `${percentElapsed}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
