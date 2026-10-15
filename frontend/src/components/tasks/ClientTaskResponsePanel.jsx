import { useState } from 'react';
import { AlertCircle, AlertTriangle, Check, CheckCircle2, Loader2, MessageSquarePlus, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { useSubmitClientTaskResponse } from '../../hooks/useTasks';
import { canClientRespondToTask } from '../../utils/taskFields';

export const ClientTaskResponsePanel = ({ task, onSubmitted, compact = false }) => {
  const [feedback, setFeedback] = useState(task?.clientFeedback || '');
  const [showFeedback, setShowFeedback] = useState(false);
  const submitResponse = useSubmitClientTaskResponse();

  if (!task) return null;

  const responseState = task.clientResponse || 'pending';
  const canRespond = canClientRespondToTask(task);

  const handleRespond = async (clientResponse) => {
    if (clientResponse === 'no' && !feedback.trim()) {
      toast.error('Feedback is required when requesting revisions');
      return;
    }

    try {
      await submitResponse.mutateAsync({
        id: task._id,
        data: {
          clientResponse,
          clientFeedback: clientResponse === 'no' ? feedback.trim() : '',
        },
      });

      toast.success(
        clientResponse === 'yes'
          ? 'Deliverable successfully approved! Thank you.'
          : 'Your revision request has been submitted to the team.',
      );

      setShowFeedback(false);
      onSubmitted?.();
    } catch (err) {
      // Error handled by query hook
    }
  };

  return (
    <div className={`rounded-2xl border transition-all ${compact ? 'p-3' : 'p-5'} ${
      responseState === 'yes'
        ? 'border-emerald-500/20 bg-emerald-500/[0.04]'
        : responseState === 'no'
        ? 'border-amber-500/20 bg-amber-500/[0.04]'
        : canRespond
        ? 'border-primary/30 bg-primary/[0.03] shadow-sm'
        : 'border-border bg-card/60'
    }`}>
      {/* Response Status Display */}
      {responseState === 'yes' && (
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">You approved this deliverable</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Approved on {task.clientResponseDate ? new Date(task.clientResponseDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'recently'}. All delivery requirements met.
            </p>
          </div>
        </div>
      )}

      {responseState === 'no' && (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Revisions Requested</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Our team has received your notes and is working on the requested updates.
              </p>
            </div>
          </div>
          {task.clientFeedback && (
            <div className="rounded-xl border border-border/80 bg-background/80 p-3 text-xs text-foreground">
              <p className="font-semibold text-muted-foreground mb-1">Your notes to the team:</p>
              <p className="whitespace-pre-wrap">{task.clientFeedback}</p>
            </div>
          )}
        </div>
      )}

      {/* Awaiting response action box */}
      {canRespond && responseState === 'pending' && (
        <div>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles size={15} />
              </span>
              <div>
                <h4 className="text-sm font-bold text-foreground">Ready for Your Sign-off</h4>
                <p className="text-xs text-muted-foreground">Please review the deliverables above and confirm your approval.</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              onClick={() => handleRespond('yes')}
              disabled={submitResponse.isPending}
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs font-semibold px-4 text-xs h-9"
            >
              {submitResponse.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Approve Deliverable
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFeedback((curr) => !curr)}
              disabled={submitResponse.isPending}
              className="gap-2 text-xs font-semibold h-9 px-4 border-border hover:bg-secondary"
            >
              <MessageSquarePlus size={14} />
              {showFeedback ? 'Close Feedback' : 'Request Changes'}
            </Button>
          </div>

          {showFeedback && (
            <div className="mt-3.5 space-y-3 rounded-xl border border-border bg-background p-3.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">What adjustments are needed?</p>
                <button
                  type="button"
                  onClick={() => setShowFeedback(false)}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  <X size={14} />
                </button>
              </div>
              <textarea
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder="Describe the adjustments needed (e.g., text edits, color adjustments, additional features)..."
                rows={3}
                className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFeedback(false)}
                  className="h-8 text-xs text-muted-foreground"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleRespond('no')}
                  disabled={submitResponse.isPending || !feedback.trim()}
                  className="h-8 text-xs bg-amber-600 hover:bg-amber-500 text-white font-medium"
                >
                  {submitResponse.isPending ? <Loader2 size={13} className="animate-spin mr-1" /> : null}
                  Submit Changes
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* When not eligible and pending */}
      {!canRespond && responseState === 'pending' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <AlertCircle size={14} />
          <span>Milestone in production. Review will open once deliverables are submitted.</span>
        </div>
      )}
    </div>
  );
};
