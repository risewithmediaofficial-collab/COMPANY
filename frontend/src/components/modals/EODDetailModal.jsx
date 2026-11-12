import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { FileText, CheckCircle2, AlertCircle, Clock, User, Calendar, Tag, X } from '@/components/ui/muiIcons';
import { Button } from '@/components/ui/button';
import { getAssetUrl } from '@/utils/assetUrl';

export const EODDetailModal = ({ open, onOpenChange, record }) => {
  if (!record) return null;

  const eod = record.eodReport || {};
  const user = record.user || {};
  const submittedDate = record.date ? new Date(record.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }) : 'N/A';

  const submittedTime = eod.submittedAt ? new Date(eod.submittedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  }) : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="lg"
        noPadding
        hideCloseButton
        className="flex flex-col min-h-0 p-0 overflow-hidden bg-card max-w-xl max-h-[90vh]"
      >
        {/* Pinned Sticky Header */}
        <div className="shrink-0 bg-secondary/40 p-5 sm:p-6 select-none">
          <DialogHeader className="mb-0 pb-0">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground bg-secondary px-3 py-1 rounded-full ">
                <CheckCircle2 size={14} className="shrink-0" /> EOD Report Submitted
              </span>
              <div className="flex items-center gap-2">
                {submittedTime && (
                  <span className="text-xs text-muted-foreground tabular-nums flex items-center gap-1 mr-1">
                    <Clock size={13} className="shrink-0" /> {submittedTime}
                  </span>
                )}
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-medium text-muted-foreground bg-muted rounded-md">
                  ESC
                </span>
                <DialogClose className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer">
                  <X className="h-4 w-4" />
                </DialogClose>
              </div>
            </div>
            <DialogTitle className="text-xl font-bold mt-3 flex items-center gap-2 text-foreground">
              <FileText className="text-foreground shrink-0" size={22} />
              End of Day Report
            </DialogTitle>
            <DialogDescription className="sr-only">
              Submitted for <span className="font-semibold text-foreground">{submittedDate}</span>
            </DialogDescription>
          </DialogHeader>

          {/* User profile row */}
          <div className="mt-4 flex items-center gap-3 pt-3 ">
            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-foreground font-bold text-sm overflow-hidden shrink-0">
              {user.avatar ? (
                <img src={getAssetUrl(user.avatar)} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                user.name ? user.name.charAt(0).toUpperCase() : 'U'
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">{user.name || 'Team Member'}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {user.department || user.position || user.role || 'Employee'}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Modal content */}
        <div className="p-6 sm:p-7 space-y-6 flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar">
          {/* Summary */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <FileText size={14} className="text-foreground shrink-0" /> Daily Summary
            </h4>
            <div className="bg-secondary/40 rounded-xl p-4 text-sm text-foreground leading-relaxed whitespace-pre-line">
              {eod.summary || 'No summary text available.'}
            </div>
          </div>

          {/* Completed Tasks */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5 tabular-nums">
              <CheckCircle2 size={14} className="text-foreground shrink-0" /> Completed Tasks ({eod.tasksCompleted?.length || 0})
            </h4>
            {eod.tasksCompleted && eod.tasksCompleted.length > 0 ? (
              <ul className="space-y-2">
                {eod.tasksCompleted.map((task, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm bg-card p-3 rounded-xl ">
                    <span className="h-5 w-5 rounded-full bg-secondary text-foreground flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                      ✓
                    </span>
                    <span className="text-foreground font-medium">{task}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground italic bg-secondary/20 p-3 rounded-xl">No specific tasks highlighted.</p>
            )}
          </div>

          {/* Blockers */}
          {eod.blockers ? (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-2 flex items-center gap-1.5">
                <AlertCircle size={14} className="shrink-0" /> Reported Blockers
              </h4>
              <div className="bg-secondary/60 text-foreground rounded-xl p-4 text-sm font-medium">
                {eod.blockers}
              </div>
            </div>
          ) : (
            <div className="bg-secondary/30 rounded-xl p-3 text-xs text-muted-foreground flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0" /> No blockers reported for this day.
            </div>
          )}
        </div>

        {/* Pinned Sticky Footer */}
        <div className="shrink-0 bg-card px-6 py-4 flex items-center justify-between gap-3 z-10 select-none">
          <span className="text-xs text-muted-foreground hidden sm:inline">Press ESC to exit</span>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-11 px-6 rounded-xl font-semibold text-sm ml-auto"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

