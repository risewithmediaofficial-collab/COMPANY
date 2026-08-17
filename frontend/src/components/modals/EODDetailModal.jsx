import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileText, CheckCircle2, AlertCircle, Clock, User, Calendar, Tag } from 'lucide-react';
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
      <DialogContent noPadding className="max-w-xl w-[92vw] sm:w-full max-h-[85vh] sm:max-h-[88vh] flex flex-col min-h-0 p-0 overflow-hidden bg-card border-border rounded-2xl shadow-2xl">
        {/* Header styling */}
        <div className="shrink-0 bg-gradient-to-r from-primary/10 via-indigo-500/10 to-purple-500/10 p-5 sm:p-6 border-b border-border">
          <DialogHeader className="border-b-0 mb-0 pb-0">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                <CheckCircle2 size={14} /> EOD Report Submitted
              </span>
              {submittedTime && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock size={13} /> {submittedTime}
                </span>
              )}
            </div>
            <DialogTitle className="text-xl font-bold mt-3 flex items-center gap-2 text-foreground">
              <FileText className="text-primary" size={22} />
              End of Day Report
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Submitted for <span className="font-semibold text-foreground">{submittedDate}</span>
            </DialogDescription>
          </DialogHeader>

          {/* User profile row */}
          <div className="mt-4 flex items-center gap-3 pt-3 border-t border-border/50">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold text-sm overflow-hidden shrink-0">
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
        <div className="p-4 sm:p-6 space-y-5 flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar">
          {/* Summary */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <FileText size={14} className="text-primary" /> Daily Summary
            </h4>
            <div className="bg-secondary/40 rounded-xl p-4 border border-border text-sm text-foreground leading-relaxed whitespace-pre-line">
              {eod.summary || 'No summary text available.'}
            </div>
          </div>

          {/* Completed Tasks */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-500" /> Completed Tasks ({eod.tasksCompleted?.length || 0})
            </h4>
            {eod.tasksCompleted && eod.tasksCompleted.length > 0 ? (
              <ul className="space-y-2">
                {eod.tasksCompleted.map((task, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm bg-card p-3 rounded-xl border border-border shadow-xs">
                    <span className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-2 flex items-center gap-1.5">
                <AlertCircle size={14} /> Reported Blockers
              </h4>
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-950 dark:text-amber-200 rounded-xl p-4 text-sm font-medium">
                {eod.blockers}
              </div>
            </div>
          ) : (
            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3 text-xs text-emerald-600 flex items-center gap-2">
              <CheckCircle2 size={15} /> No blockers reported for this day.
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="shrink-0 p-4 bg-secondary/20 border-t border-border flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl px-6 font-semibold">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
