import React, { useState, useEffect, useCallback } from 'react';
import { devApi } from '../../api/development';
import { DevelopmentSubNav } from '../../components/development/DevelopmentSubNav';
import { PageHeader } from '../../components/ui/page';
import { TaskDetailModal } from '../../components/ui/TaskDetailModal';
import {
  Bug,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCcw,
  Clock,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

export default function DevelopmentQA() {
  const [tasks, setTasks] = useState([]);
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
          <Clock size={16} className="text-cyan-500" />
          <h3 className="font-bold text-foreground text-sm uppercase tracking-wider">
            Ready for Testing ({pendingQA.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-xs flex items-center justify-center gap-2 bg-card border border-border rounded-2xl">
            <RefreshCcw size={16} className="animate-spin text-primary" /> Loading QA queue...
          </div>
        ) : pendingQA.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs bg-card border border-border rounded-2xl space-y-1">
            <CheckCircle2 size={24} className="mx-auto text-emerald-500/50" />
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
                      className="font-bold text-foreground text-sm mt-1.5 hover:text-primary transition-colors cursor-pointer"
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
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 text-white hover:bg-cyan-700 text-xs font-bold transition-all shadow-sm shadow-cyan-600/20 min-h-[38px]"
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

      {/* ── QA Test Modal ────────────────────────────────────────────── */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-card border border-border rounded-2xl w-[calc(100vw-24px)] max-w-md max-h-[90dvh] overflow-y-auto p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <Bug size={16} className="text-cyan-500" /> Record QA Test Result
              </h3>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitQA} className="space-y-3.5 text-xs">
              <p className="text-muted-foreground">
                Task: <strong className="text-foreground">{selectedTask.title}</strong>
              </p>

              <div>
                <label className="font-semibold text-foreground block mb-1">Test Result *</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setQaStatus('passed')}
                    className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1 min-h-[38px] transition-all ${
                      qaStatus === 'passed'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-secondary text-muted-foreground border-border'
                    }`}
                  >
                    <CheckCircle2 size={13} /> Passed
                  </button>
                  <button
                    type="button"
                    onClick={() => setQaStatus('failed')}
                    className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1 min-h-[38px] transition-all ${
                      qaStatus === 'failed'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-secondary text-muted-foreground border-border'
                    }`}
                  >
                    <XCircle size={13} /> Failed
                  </button>
                  <button
                    type="button"
                    onClick={() => setQaStatus('blocked')}
                    className={`py-2 px-3 rounded-xl border font-bold flex items-center justify-center gap-1 min-h-[38px] transition-all ${
                      qaStatus === 'blocked'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-secondary text-muted-foreground border-border'
                    }`}
                  >
                    <ShieldAlert size={13} /> Blocked
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-foreground block mb-1">
                  {qaStatus === 'failed' ? 'Failure Description / Bug Steps *' : 'Test Notes (optional)'}
                </label>
                <textarea
                  rows={4}
                  required={qaStatus === 'failed'}
                  placeholder={
                    qaStatus === 'passed'
                      ? 'e.g. All test cases passed on Chrome, Firefox and Mobile Safari.'
                      : 'e.g. Broken button alignment, form throws 500 error when date is empty.'
                  }
                  value={testNotes}
                  onChange={(e) => setTestNotes(e.target.value)}
                  className="w-full p-2.5 bg-background border border-border rounded-xl text-xs outline-none focus:border-cyan-500"
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
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-cyan-600/20 min-h-[38px]"
                >
                  {submitting ? 'Submitting...' : 'Save Result'}
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
              fetchQATasks();
            }
          }}
        />
      )}
    </div>
  );
}
