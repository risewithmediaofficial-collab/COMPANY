import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Send,
  UploadCloud,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  AlertCircle,
  Paperclip,
  Check,
} from 'lucide-react';
import { useSubmitTaskWithReason } from '../../hooks/useTasks';
import { uploadFiles } from '../../utils/taskFields';
import { toast } from 'sonner';

const QUICK_REASON_PRESETS = [
  'Client delayed in providing necessary raw assets / brief',
  'Technical issues with rendering / software export',
  'Required unexpected revisions and scope adjustments',
  'Software / hardware tool malfunction',
  'Awaiting approval or feedback on preceding dependent step',
  'Extra complexity in deliverable requiring additional research',
];

export const TaskSubmitModal = ({
  open,
  onOpenChange,
  task,
  onSubmitted,
}) => {
  const submitMutation = useSubmitTaskWithReason();

  const [submissionType, setSubmissionType] = useState('completed'); // 'completed' | 'incomplete_with_reason'
  const [reason, setReason] = useState(task?.completionReason || '');
  const [notes, setNotes] = useState(task?.submissionNotes || '');
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  if (!open || !task) return null;

  const now = Date.now();
  const startTime = task.timerStartedAt || task.acceptedAt || task.createdAt;
  const elapsedMinutes = startTime
    ? Math.max(1, Math.round((now - new Date(startTime).getTime()) / 60000))
    : 0;
  const elapsedHrs = Math.floor(elapsedMinutes / 60);
  const elapsedMins = elapsedMinutes % 60;
  const elapsedStr = `${elapsedHrs > 0 ? `${elapsedHrs}h ` : ''}${elapsedMins}m`;

  const totalAllocatedMinutes = ((Number(task.allocatedHours) || 0) * 60) + (Number(task.allocatedMinutes) || 0);
  const isLate = Boolean(
    task.isOverdue ||
    (task.timerExpiresAt && now > new Date(task.timerExpiresAt).getTime())
  );

  const isReasonRequired = isLate || submissionType === 'incomplete_with_reason';

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...selected]);
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();

    if (isReasonRequired && !reason.trim()) {
      toast.error('Please provide a reason for the delay or incomplete submission.');
      return;
    }

    try {
      setIsUploading(true);
      let uploadedDeliverables = [];
      if (files.length > 0) {
        uploadedDeliverables = await uploadFiles(files);
      }

      await submitMutation.mutateAsync({
        id: task._id,
        reason: reason.trim(),
        notes: notes.trim(),
        submissionStatus: submissionType === 'incomplete_with_reason'
          ? 'incomplete_with_reason'
          : isLate
          ? 'completed_with_delay'
          : 'completed',
        status: submissionType === 'incomplete_with_reason' ? 'review_required' : 'completed',
        completedFiles: uploadedDeliverables,
      });

      setFiles([]);
      setReason('');
      setNotes('');
      onOpenChange(false);
      if (onSubmitted) onSubmitted();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to submit task');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="p-0 overflow-hidden bg-card border-border shadow-2xl">
        <DialogHeader className="px-5 sm:px-6 pt-5 pb-3 border-b border-border bg-card/90">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border shrink-0 ${
              isLate ? 'bg-rose-500/10 border-rose-500/30 text-rose-600' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
            }`}>
              {isLate ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-black text-foreground">
                {isLate ? 'Submit Task (Overdue / Delayed)' : 'Submit Completed Task'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Task: <span className="font-semibold text-foreground">{task.taskTitle || task.title}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Timer Summary Banner */}
          <div className={`rounded-xl border p-3.5 space-y-2 ${
            isLate ? 'border-rose-500/30 bg-rose-500/10' : 'border-sky-500/30 bg-sky-500/10'
          }`}>
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-foreground">
                <Clock size={13} className={isLate ? 'text-rose-500' : 'text-sky-500'} />
                <span>Timer Summary</span>
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                isLate ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
              }`}>
                {isLate ? '⚠️ Overdue' : '✅ Within Time'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-card/80 border border-border/60">
                <span className="text-[10px] text-muted-foreground block font-medium">Allocated Time</span>
                <span className="font-bold text-foreground">
                  {totalAllocatedMinutes > 0 ? `${task.allocatedHours || 0}h ${task.allocatedMinutes || 0}m` : 'None specified'}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-card/80 border border-border/60">
                <span className="text-[10px] text-muted-foreground block font-medium">Time Taken</span>
                <span className="font-bold text-foreground">{elapsedStr}</span>
              </div>
              <div className="col-span-2 sm:col-span-1 p-2 rounded-lg bg-card/80 border border-border/60">
                <span className="text-[10px] text-muted-foreground block font-medium">Started At</span>
                <span className="font-bold text-foreground">
                  {startTime ? new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Submission Mode Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
              Submission Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSubmissionType('completed')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  submissionType === 'completed'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500/20 font-bold'
                    : 'border-border bg-card text-muted-foreground hover:bg-secondary/60'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>Work Completed</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Task work has been delivered or finished
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSubmissionType('incomplete_with_reason')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  submissionType === 'incomplete_with_reason'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-800 dark:text-amber-200 ring-2 ring-amber-500/20 font-bold'
                    : 'border-border bg-card text-muted-foreground hover:bg-secondary/60'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <AlertCircle size={14} className="text-amber-500" />
                  <span>Incomplete with Reason</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Unable to finish; requesting review/rework
                </p>
              </button>
            </div>
          </div>

          {/* Reason Input (Required if overdue or incomplete) */}
          <div className={`rounded-xl border p-4 space-y-2.5 transition-all ${
            isReasonRequired ? 'border-amber-500/40 bg-amber-500/5' : 'border-border bg-background/50'
          }`}>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                <FileText size={13} className={isReasonRequired ? 'text-amber-500' : 'text-muted-foreground'} />
                <span>
                  Reason for {isLate ? 'Delay / Overdue' : 'Incomplete Status'}
                  {isReasonRequired && <span className="text-rose-500 font-black ml-1">* Required</span>}
                </span>
              </label>
            </div>

            {/* Quick Reason Pills */}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_REASON_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setReason(preset)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer select-none text-left ${
                    reason === preset
                      ? 'bg-amber-500 text-white border-amber-600 font-bold'
                      : 'bg-card hover:bg-secondary border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State the reason clearly (e.g. why the timer was exceeded or why the task could not be completed on time)..."
              className="w-full text-xs rounded-xl border border-border bg-card p-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              required={isReasonRequired}
            />
          </div>

          {/* Deliverables / Completed Files */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
              Deliverable Files / Attachments
            </label>

            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-border hover:border-primary/50 bg-secondary/20 hover:bg-secondary/40 rounded-xl p-3 cursor-pointer transition-colors text-xs font-semibold text-muted-foreground hover:text-foreground">
                <UploadCloud size={16} className="text-primary" />
                <span>Click to select completed work files</span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {files.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-card border border-border text-xs">
                    <span className="truncate max-w-[80%] font-medium text-foreground flex items-center gap-1.5">
                      <Paperclip size={12} className="text-primary shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-muted-foreground hover:text-rose-500 p-1 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes / Remarks */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
              Additional Notes / Summary
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any comments, link to live preview, or notes for the reviewer..."
              className="w-full text-xs rounded-xl border border-border bg-card p-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Footer Submit Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground rounded-xl border border-border hover:bg-secondary cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isUploading || submitMutation.isLoading}
              className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl text-white shadow-md transition-all cursor-pointer disabled:opacity-50 ${
                isLate
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
              }`}
            >
              <Send size={13} />
              <span>
                {isUploading ? 'Uploading Files...' : submitMutation.isLoading ? 'Submitting...' : 'Submit & Note All'}
              </span>
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
