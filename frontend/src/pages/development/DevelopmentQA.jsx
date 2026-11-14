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
import { toast } from 'sonner';
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
    () => rawTasks.filter((t) => isDateInRange(t.dueDate || t.createdAt)),
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
        actions={
          <button
            onClick={fetchQATasks}
            disabled={loading}
            className="flex items-center gap-2 h-10 px-3.5 bg-secondary text-foreground font-semibold rounded-xl text-xs hover:bg-secondary/80 transition-all cursor-pointer"
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
          <div className="p-12 text-center text-muted-foreground text-xs flex items-center justify-center gap-2 bg-card rounded-2xl">
            <RefreshCcw size={16} className="animate-spin text-foreground" /> Loading QA queue...
          </div>
        ) : pendingQA.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs bg-card rounded-2xl space-y-1.5">
            <CheckCircle2 size={24} className="mx-auto text-muted-foreground/50" />
            <p className="font-semibold text-foreground">No tasks waiting for QA</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingQA.map((task) => {
              const dev = task.development || {};
              const devUser = dev.developer || (task.assignedTo && task.assignedTo[0]);

              return (
                <div
                  key={task._id}
                  className="bg-card rounded-2xl p-4 space-y-3 transition-all"
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

                  <div className="p-2.5 bg-secondary/30 rounded-xl space-y-1 text-xs">
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
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-all min-h-[38px] cursor-pointer"
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
          className="flex flex-col min-h-0 p-0 overflow-hidden bg-card "
        >
          <DialogHeader className="px-5 py-4 bg-card shrink-0 select-none flex flex-row items-center justify-between gap-3 m-0 space-y-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
                <Bug size={18} />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground truncate">
                  Record QA Test Result
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Log test verification outcome and notes
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

          <form onSubmit={handleSubmitQA} className="flex flex-col flex-1 min-h-0 overflow-hidden text-left">
            <div className="flex-1 min-h-0 overflow-y-auto p-6 sm:p-7 space-y-5 custom-scrollbar">
              <p className="text-sm text-muted-foreground">
                Task: <strong className="text-foreground">{selectedTask?.title}</strong>
              </p>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Test Result *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setQaStatus('passed')}
                    className={`h-11 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      qaStatus === 'passed'
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
                        : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                    }`}
                  >
                    <CheckCircle2 size={15} /> Passed
                  </button>
                  <button
                    type="button"
                    onClick={() => setQaStatus('failed')}
                    className={`h-11 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      qaStatus === 'failed'
                        ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/25'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 hover:bg-rose-500/20'
                    }`}
                  >
                    <XCircle size={15} /> Failed
                  </button>
                  <button
                    type="button"
                    onClick={() => setQaStatus('blocked')}
                    className={`h-11 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      qaStatus === 'blocked'
                        ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/25'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                    }`}
                  >
                    <ShieldAlert size={15} /> Blocked
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">
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
