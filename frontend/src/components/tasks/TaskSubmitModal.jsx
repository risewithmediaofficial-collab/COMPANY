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
} from '@/components/ui/muiIcons';
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
      <DialogContent size="lg" className="p-0 overflow-hidden bg-card ">
        <DialogHeader className="px-5 sm:px-6 pt-5 pb-3 bg-card">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${
              isLate ? 'bg-primary text-primary-foreground ' : 'bg-secondary text-foreground'
            }`}>
              {isLate ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
            </div>
            <div className="text-left">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight">
                {isLate ? 'Submit Task (Overdue / Delayed)' : 'Submit Completed Task'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Task: <span className="font-semibold text-foreground">{task.taskTitle || task.title}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar text-left">
          {/* Timer Summary Banner */}
          <div className={`rounded-xl p-3.5 space-y-2 ${
            isLate ? ' bg-secondary/70' : ' bg-secondary/40'
          }`}>
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-foreground">
                <Clock size={13} className="text-foreground" />
                <span>Timer Summary</span>
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                isLate ? 'bg-primary text-primary-foreground ' : 'bg-card text-foreground '
              }`}>
                {isLate ? 'Overdue' : 'Within Time'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-card ">
                <span className="text-[10px] text-muted-foreground block font-medium">Allocated Time</span>
                <span className="font-bold text-foreground tabular-nums">
                  {totalAllocatedMinutes > 0 ? `${task.allocatedHours || 0}h ${task.allocatedMinutes || 0}m` : 'None specified'}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-card ">
                <span className="text-[10px] text-muted-foreground block font-medium">Time Taken</span>
                <span className="font-bold text-foreground tabular-nums">{elapsedStr}</span>
              </div>
              <div className="col-span-2 sm:col-span-1 p-2 rounded-lg bg-card ">
                <span className="text-[10px] text-muted-foreground block font-medium">Started At</span>
                <span className="font-bold text-foreground tabular-nums">
                  {startTime ? new Date(startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Submission Mode Selector */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-foreground block mb-1.5">
              Submission Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSubmissionType('completed')}
                className={`p-3 rounded-xl text-left transition-all cursor-pointer ${
                  submissionType === 'completed'
                    ? ' bg-secondary text-foreground ring-1 ring-primary font-bold'
                    : ' bg-card text-muted-foreground hover:bg-secondary/60'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <CheckCircle2 size={14} className="text-foreground" />
                  <span>Work Completed</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Task work has been delivered or finished
                </p>
              </button>

              <button
                type="button"
                onClick={() => setSubmissionType('incomplete_with_reason')}
                className={`p-3 rounded-xl text-left transition-all cursor-pointer ${
                  submissionType === 'incomplete_with_reason'
                    ? ' bg-secondary text-foreground ring-1 ring-primary font-bold'
                    : ' bg-card text-muted-foreground hover:bg-secondary/60'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <AlertCircle size={14} className="text-foreground" />
                  <span>Incomplete with Reason</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Unable to finish; requesting review/rework
                </p>
              </button>
            </div>
          </div>

          {/* Reason Input (Required if overdue or incomplete) */}
          <div className={`rounded-xl p-4 space-y-2.5 transition-all ${
            isReasonRequired ? ' bg-secondary/50' : ' bg-background'
          }`}>
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
                <FileText size={14} className="text-foreground" />
                <span>
                  Reason for {isLate ? 'Delay / Overdue' : 'Incomplete Status'}
                  {isReasonRequired && <span className="text-foreground font-bold ml-1">* Required</span>}
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
                  className={`text-xs px-2.5 py-1 rounded-lg transition-all cursor-pointer select-none text-left ${
                    reason === preset
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'bg-card hover:bg-secondary text-muted-foreground hover:text-foreground'
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
              className="min-h-[96px] w-full text-sm font-normal leading-relaxed rounded-xl bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
              required={isReasonRequired}
            />
          </div>

          {/* Deliverables / Completed Files */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground block mb-1.5">
              Deliverable Files / Attachments
            </label>

            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 bg-secondary/20 hover:bg-secondary/40 rounded-xl p-3 cursor-pointer transition-colors text-sm font-semibold text-muted-foreground hover:text-foreground">
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
                  <div key={i} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-card text-xs">
                    <span className="truncate max-w-[80%] font-medium text-foreground flex items-center gap-1.5">
                      <Paperclip size={12} className="text-primary shrink-0" />
                      <span className="truncate">{f.name}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
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
            <label className="text-sm font-semibold text-foreground block mb-1.5">
              Additional Notes / Summary
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any comments, link to live preview, or notes for the reviewer..."
              className="min-h-[84px] w-full text-sm font-normal leading-relaxed rounded-xl bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Footer Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-11 px-5 text-sm font-semibold text-foreground bg-secondary hover:bg-secondary/80 rounded-xl cursor-pointer transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isUploading || submitMutation.isLoading}
              className="inline-flex h-11 items-center gap-2 px-6 text-sm font-bold rounded-xl text-primary-foreground bg-primary hover:bg-primary/95 transition-all cursor-pointer disabled:opacity-50"
            >
              <Send size={14} />
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
