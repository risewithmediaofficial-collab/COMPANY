import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { devApi } from '../../api/development';
import { DevelopmentSubNav } from '../../components/development/DevelopmentSubNav';
import { PageHeader } from '../../components/ui/page';
import { TaskDetailModal } from '../../components/ui/TaskDetailModal';
import { useDateFilter } from '../../context/DateFilterContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../../components/ui/dialog';
import {
  GitPullRequest,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCcw,
  ExternalLink,
  MessageSquare,
  AlertTriangle,
  User,
  X,
} from '@/components/ui/muiIcons';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function DevelopmentReviews() {
  const { isDateInRange } = useDateFilter();
  const [rawTasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approved' | 'changes_requested'
  const [commentsInput, setCommentsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Task details modal
  const [detailTaskId, setDetailTaskId] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchReviewTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await devApi.getTasks();
      if (res.data?.success) {
        // Filter tasks that are in code_review stage or have reviewStatus
        const list = (res.data.data || []).filter(
          (t) =>
            t.development?.stage === 'code_review' ||
            (t.development?.reviewStatus && t.development.reviewStatus !== 'none')
        );
        setTasks(list);
      }
    } catch (err) {
      console.error('Failed to load review tasks:', err);
      toast.error('Failed to load code review tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviewTasks();
  }, [fetchReviewTasks]);

  const tasks = useMemo(
    () => rawTasks.filter((t) => isDateInRange(t.dueDate || t.createdAt)),
    [rawTasks, isDateInRange]
  );

  const handleOpenAction = (task, type) => {
    setSelectedTask(task);
    setActionType(type);
    setCommentsInput('');
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedTask || !actionType) return;

    if (actionType === 'changes_requested' && !commentsInput.trim()) {
      toast.error('Please provide comments explaining what changes are requested');
      return;
    }

    setSubmitting(true);
    try {
      await devApi.submitReview(selectedTask._id, {
        reviewStatus: actionType,
        reviewComments: commentsInput.trim(),
      });
      toast.success(
        actionType === 'approved'
          ? 'Code review approved! Task moved to QA Testing.'
          : 'Changes requested! Task returned to In Development.'
      );
      setSelectedTask(null);
      setActionType(null);
      fetchReviewTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit code review');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingReviews = tasks.filter((t) => t.development?.stage === 'code_review');
  const pastReviews = tasks.filter((t) => t.development?.stage !== 'code_review');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Code Reviews"
        actions={
          <button
            onClick={fetchReviewTasks}
            disabled={loading}
            className="flex items-center gap-2 h-10 px-3.5 bg-secondary text-foreground font-semibold rounded-xl text-xs hover:bg-secondary/80 transition-all cursor-pointer"
          >
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      <DevelopmentSubNav />

      {/* ── Pending Code Reviews ─────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-foreground" />
          <h3 className="font-bold text-foreground text-sm uppercase tracking-wider tabular-nums">
            Pending Code Reviews ({pendingReviews.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-xs flex items-center justify-center gap-2 bg-card rounded-2xl">
            <RefreshCcw size={16} className="animate-spin text-foreground" /> Loading review queue...
          </div>
        ) : pendingReviews.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs bg-card rounded-2xl space-y-1.5">
            <CheckCircle2 size={24} className="mx-auto text-muted-foreground/50" />
            <p className="font-semibold text-foreground">No pending code reviews</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingReviews.map((task) => {
              const dev = task.development || {};
              const devUser = dev.developer || (task.assignedTo && task.assignedTo[0]);

              return (
                <div
                  key={task._id}
                  className="bg-card rounded-2xl p-4 space-y-3 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-secondary px-2 py-0.5 rounded">
                        {task.project?.name || 'CRM Task'}
                      </span>
                      <h4
                        onClick={() => {
                          setDetailTaskId(task._id);
                          setShowDetailModal(true);
                        }}
                        className="font-bold text-foreground text-sm mt-1.5 hover:underline cursor-pointer"
                      >
                        {task.title}
                      </h4>
                    </div>
                  </div>

                  {/* Git branch & PR info */}
                  <div className="p-2.5 bg-secondary/30 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-[11px] font-medium">Branch:</span>
                      <span className="font-mono font-semibold text-foreground">
                        {dev.branch || 'No branch specified'}
                      </span>
                    </div>

                    {(dev.pullRequestUrl || dev.pullRequestNumber) && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-[11px] font-medium">Pull Request:</span>
                        {dev.pullRequestUrl ? (
                          <a
                            href={dev.pullRequestUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-foreground font-bold inline-flex items-center gap-1 hover:underline text-[11px]"
                          >
                            PR #{dev.pullRequestNumber || 'Link'} <ExternalLink size={10} />
                          </a>
                        ) : (
                          <span className="font-mono font-bold text-foreground">#{dev.pullRequestNumber}</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Developer:</span>
                      <span className="font-semibold text-foreground">{devUser?.name || 'Unassigned'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleOpenAction(task, 'changes_requested')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-rose-600 dark:text-rose-400 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-xs font-bold transition-all min-h-[38px] cursor-pointer"
                    >
                      <XCircle size={13} /> Request Changes
                    </button>
                    <button
                      onClick={() => handleOpenAction(task, 'approved')}
                      className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20 text-xs font-bold transition-all min-h-[38px] cursor-pointer"
                    >
                      <CheckCircle2 size={13} /> Approve Code
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Review Action Side Drawer ────────────────────────────────── */}
      <Dialog
        open={Boolean(selectedTask && actionType)}
        onOpenChange={(open) => !open && setSelectedTask(null)}
      >
        <DialogContent
          variant="side"
          size="md"
          noPadding
          hideCloseButton
          className="flex flex-col min-h-0 p-0 overflow-hidden bg-card "
        >
          <DialogHeader className="px-5 py-4 bg-card shrink-0 select-none flex flex-row items-center justify-between gap-3 m-0 space-y-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
                {actionType === 'approved' ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <XCircle size={18} />
                )}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground truncate">
                  {actionType === 'approved' ? 'Approve Code Review' : 'Request Changes'}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  {actionType === 'approved' ? 'Confirm code review approval' : 'Provide requested revisions for this PR'}
                </DialogDescription>
              </div>
            </div>
            <DialogClose
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer shrink-0"
            >
              <X size={16} />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>

          <form onSubmit={handleSubmitReview} className="flex flex-col flex-1 min-h-0 overflow-hidden text-left">
            <div className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-7 space-y-5 custom-scrollbar">
              <p className="text-sm text-muted-foreground">
                Task: <strong className="text-foreground">{selectedTask?.title}</strong>
              </p>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
                  {actionType === 'approved' ? 'Approval Notes (optional)' : 'Change Request Details *'}
                </label>
                <textarea
                  rows={5}
                  required={actionType === 'changes_requested'}
                  placeholder={
                    actionType === 'approved'
                      ? 'e.g. Code looks clean, tests pass, ready for QA.'
                      : 'e.g. Please refactor API error handling and fix missing props in component.'
                  }
                  value={commentsInput}
                  onChange={(e) => setCommentsInput(e.target.value)}
                  className="w-full min-h-[112px] px-4 py-3 bg-secondary/75 rounded-xl text-sm font-normal text-foreground outline-none focus:bg-background focus:ring-2 focus:ring-brand/40"
                />
              </div>
            </div>

            <div className="shrink-0 flex flex-wrap items-center justify-end gap-2.5 px-6 py-4 bg-card">
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="h-11 px-5 rounded-xl bg-secondary text-foreground text-sm font-semibold hover:bg-secondary/80 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="h-11 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {submitting
                  ? 'Submitting...'
                  : actionType === 'approved'
                  ? 'Confirm Approval'
                  : 'Send Change Request'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Reusable Task Detail Modal ───────────────────────────────── */}
      {detailTaskId && (
        <TaskDetailModal
          taskId={detailTaskId}
          open={showDetailModal}
          onOpenChange={(isOpen) => {
            setShowDetailModal(isOpen);
            if (!isOpen) {
              setDetailTaskId(null);
              fetchReviewTasks();
            }
          }}
        />
      )}
    </div>
  );
}
