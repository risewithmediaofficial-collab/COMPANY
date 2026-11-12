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
  Bug,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCcw,
  Clock,
  ExternalLink,
  ShieldAlert,
  X,
} from '@/components/ui/muiIcons';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

export default function DevelopmentQA() {
  const { isDateInRange } = useDateFilter();
  const [rawTasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [qaStatus, setQaStatus] = useState('passed'); // passed | failed | blocked
  const [testNotes, setTestNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reusable task modal
  const [detailTaskId, setDetailTaskId] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchQATasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await devApi.getTasks();
      if (res.data?.success) {
        const list = (res.data.data || []).filter(
          (t) =>
            t.development?.stage === 'qa_testing' ||
            (t.development?.testStatus && t.development.testStatus !== 'none')
        );
        setTasks(list);
      }
    } catch (err) {
      console.error('Failed to load QA tasks:', err);
      toast.error('Failed to load QA tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQATasks();
  }, [fetchQATasks]);

  const tasks = useMemo(
    () => rawTasks.filter((t) => isDateInRange([t.dueDate, t.updatedAt, t.createdAt])),
    [rawTasks, isDateInRange]
  );

  const handleOpenTestModal = (task) => {
    setSelectedTask(task);
    setQaStatus('passed');
    setTestNotes('');
  };

  const handleSubmitQA = async (e) => {
    e.preventDefault();
    if (!selectedTask) return;

    if (qaStatus === 'failed' && !testNotes.trim()) {
      toast.error('Please describe why the test failed');
      return;
    }

    setSubmitting(true);
    try {
      await devApi.submitQA(selectedTask._id, {
        testStatus: qaStatus,
        testNotes: testNotes.trim(),
      });
      toast.success(
        qaStatus === 'passed'
          ? 'QA Test Passed! Task moved to Client UAT.'
          : qaStatus === 'failed'
          ? 'QA Test Failed! Task returned to In Development.'
          : 'Task marked as Blocked in QA.'
      );
      setSelectedTask(null);
      fetchQATasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit QA result');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingQA = tasks.filter((t) => t.development?.stage === 'qa_testing');

  return (
    <div className="space-y-6">
      <PageHeader
        title="QA & Testing"
        subtitle="Validate quality, execute test verification runs, and record test statuses on existing tasks"
        actions={
          <button
            onClick={fetchQATasks}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-secondary border border-border text-foreground font-semibold rounded-xl text-xs hover:bg-secondary/80 transition-all shadow-xs min-h-[38px]"
          >
            <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      <DevelopmentSubNav />

      {/* ── Pending QA Runs ──────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-foreground" />
          <h3 className="font-bold text-foreground text-sm uppercase tracking-wider tabular-nums">
            Ready for Testing ({pendingQA.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-xs flex items-center justify-center gap-2 bg-card border border-border rounded-2xl">
            <RefreshCcw size={16} className="animate-spin text-foreground" /> Loading QA queue...
          </div>
        ) : pendingQA.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs bg-card border border-border rounded-2xl space-y-1">
            <CheckCircle2 size={24} className="mx-auto text-muted-foreground/50" />
            <p className="font-semibold text-foreground">No tasks waiting for QA</p>
            <p className="text-[11px]">Tasks approved from Code Review will appear here automatically.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingQA.map((task) => {
              const dev = task.development || {};
              const devUser = dev.developer || (task.assignedTo && task.assignedTo[0]);

              return (
                <div
                  key={task._id}
                  className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-3 hover:shadow-md transition-all"
                >
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

                  <div className="p-2.5 bg-secondary/30 rounded-xl border border-border space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Branch:</span>
                      <span className="font-mono text-foreground font-semibold">{dev.branch || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Developer:</span>
                      <span className="font-semibold text-foreground">{devUser?.name || 'Unassigned'}</span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => handleOpenTestModal(task)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-all shadow-xs min-h-[38px] cursor-pointer"
                    >
                      <Bug size={13} /> Log Test Result
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── QA Test Side Drawer ──────────────────────────────────────── */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent
          variant="side"
          size="md"
          noPadding
          hideCloseButton
          className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-l border-border shadow-2xl"
        >
          <DialogHeader className="px-5 py-4 border-b border-border bg-card shrink-0 select-none flex flex-row items-center justify-between gap-3 m-0 space-y-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary border border-border text-foreground">
                <Bug size={18} />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-foreground truncate">
                  Record QA Test Result
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate">
                  Log test verification outcome &amp; notes
                </DialogDescription>
              </div>
            </div>
            <DialogClose
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/70 transition-all cursor-pointer shrink-0"
            >
              <X size={16} />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>

          <form onSubmit={handleSubmitQA} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
            <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              <p className="text-muted-foreground">
                Task: <strong className="text-foreground">{selectedTask?.title}</strong>
              </p>

              <div>
                <label className="font-semibold text-foreground block mb-1.5">Test Result *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setQaStatus('passed')}
                    className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1 min-h-[38px] transition-all cursor-pointer ${
                      qaStatus === 'passed'
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-secondary text-muted-foreground border-border'
                    }`}
                  >
                    <CheckCircle2 size={13} /> Passed
                  </button>
                  <button
                    type="button"
                    onClick={() => setQaStatus('failed')}
                    className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1 min-h-[38px] transition-all cursor-pointer ${
                      qaStatus === 'failed'
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-secondary text-muted-foreground border-border'
                    }`}
                  >
                    <XCircle size={13} /> Failed
                  </button>
                  <button
                    type="button"
                    onClick={() => setQaStatus('blocked')}
                    className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1 min-h-[38px] transition-all cursor-pointer ${
                      qaStatus === 'blocked'
                        ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                        : 'bg-secondary text-muted-foreground border-border'
                    }`}
                  >
                    <ShieldAlert size={13} /> Blocked
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1.5">
                  {qaStatus === 'failed' ? 'Failure Description / Bug Steps *' : 'Test Notes (optional)'}
                </label>
                <textarea
                  rows={5}
                  required={qaStatus === 'failed'}
                  placeholder={
                    qaStatus === 'passed'
                      ? 'e.g. All test cases passed on Chrome, Firefox and Mobile Safari.'
                      : 'e.g. Broken button alignment, form throws 500 error when date is empty.'
                  }
                  value={testNotes}
                  onChange={(e) => setTestNotes(e.target.value)}
                  className="w-full p-3 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-foreground"
                />
              </div>
            </div>

            <div className="shrink-0 flex flex-wrap items-center justify-end gap-2 px-5 py-4 border-t border-border bg-card">
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="app-button-secondary text-xs min-h-[38px] px-4"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs min-h-[38px] cursor-pointer"
              >
                {submitting ? 'Submitting...' : 'Save Result'}
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
              fetchQATasks();
            }
          }}
        />
      )}
    </div>
  );
}
