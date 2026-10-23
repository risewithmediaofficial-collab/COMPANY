import React, { useState, useEffect, useCallback } from 'react';
import { devApi } from '../../api/development';
import { DevelopmentSubNav } from '../../components/development/DevelopmentSubNav';
import { PageHeader } from '../../components/ui/page';
import { TaskDetailModal } from '../../components/ui/TaskDetailModal';
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
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

export default function DevelopmentReviews() {
  const [tasks, setTasks] = useState([]);
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
        subtitle="Review pull requests, approve code for QA testing, or request revisions from developers"
        actions={
          <button
            onClick={fetchReviewTasks}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-secondary border border-border text-foreground font-semibold rounded-xl text-xs hover:bg-secondary/80 transition-all shadow-xs min-h-[38px]"
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
          <Clock size={16} className="text-purple-500" />
          <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">
            Pending Code Reviews ({pendingReviews.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-xs flex items-center justify-center gap-2 bg-card border border-border rounded-2xl">
            <RefreshCcw size={16} className="animate-spin text-primary" /> Loading review queue...
          </div>
        ) : pendingReviews.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs bg-card border border-border rounded-2xl space-y-1">
            <CheckCircle2 size={24} className="mx-auto text-emerald-500/50" />
            <p className="font-semibold text-foreground">No pending code reviews</p>
            <p className="text-[11px]">All tasks in development are up to date.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingReviews.map((task) => {
              const dev = task.development || {};
              const devUser = dev.developer || (task.assignedTo && task.assignedTo[0]);

              return (
                <div
                  key={task._id}
                  className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-3 hover:shadow-md transition-all"
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
                        className="font-bold text-foreground text-sm mt-1.5 hover:text-primary transition-colors cursor-pointer"
                      >
                        {task.title}
                      </h4>
                    </div>
                  </div>

                  {/* Git branch & PR info */}
                  <div className="p-2.5 bg-secondary/30 rounded-xl border border-border space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-[11px] font-medium">Branch:</span>
                      <span className="font-mono font-semibold text-foreground">
                        {dev.branch ? `🌿 ${dev.branch}` : 'No branch specified'}
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
                            className="text-primary font-bold inline-flex items-center gap-1 hover:underline text-[11px]"
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
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-bold transition-all min-h-[38px]"
                    >
                      <XCircle size={13} /> Request Changes
                    </button>
                    <button
                      onClick={() => handleOpenAction(task, 'approved')}
                      className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition-all shadow-sm min-h-[38px]"
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

      {/* ── Review Action Modal ──────────────────────────────────────── */}
      {selectedTask && actionType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card border border-border rounded-2xl w-[calc(100vw-24px)] max-w-md max-h-[90dvh] overflow-y-auto p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                {actionType === 'approved' ? (
                  <CheckCircle2 size={16} className="text-emerald-500" />
                ) : (
                  <XCircle size={16} className="text-rose-500" />
                )}
                {actionType === 'approved' ? 'Approve Code Review' : 'Request Changes'}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-3.5 text-xs">
              <p className="text-muted-foreground">
                Task: <strong className="text-foreground">{selectedTask.title}</strong>
              </p>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  {actionType === 'approved' ? 'Approval Notes (optional)' : 'Change Request Details *'}
                </label>
                <textarea
                  rows={4}
                  required={actionType === 'changes_requested'}
                  placeholder={
                    actionType === 'approved'
                      ? 'e.g. Code looks clean, tests pass, ready for QA.'
                      : 'e.g. Please refactor API error handling and fix missing props in component.'
                  }
                  value={commentsInput}
                  onChange={(e) => setCommentsInput(e.target.value)}
                  className="w-full p-2.5 bg-background border border-border rounded-xl text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="app-button-secondary text-xs min-h-[38px] px-3.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-2 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md min-h-[38px] ${
                    actionType === 'approved'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  }`}
                >
                  {submitting
                    ? 'Submitting...'
                    : actionType === 'approved'
                    ? 'Confirm Approval'
                    : 'Send Change Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
