import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '../ui/alert-dialog';
import { AlertTriangle, ArrowRight, X } from '@/components/ui/muiIcons';

export default function DuplicateConfirmDialog({
  open,
  onOpenChange,
  title = 'Duplicate Record Detected',
  message,
  existingRecord,
  onConfirm,
  onCancel,
  confirmLabel = 'Yes, Continue & Add',
  cancelLabel = 'Cancel & Review',
}) {
  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    if (onOpenChange) onOpenChange(false);
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    if (onOpenChange) onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md p-6 bg-card border border-border shadow-2xl rounded-2xl">
        <AlertDialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-foreground border border-border shadow-xs">
              <AlertTriangle className="h-6 w-6 shrink-0" />
            </div>
            <div>
              <AlertDialogTitle className="text-base font-extrabold text-foreground">
                {title}
              </AlertDialogTitle>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Action Required
              </span>
            </div>
          </div>

          <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
            {message || 'A matching or very similar record already exists in the system.'}
          </AlertDialogDescription>

          {existingRecord && (
            <div className="rounded-xl border border-border bg-secondary/40 p-3 text-xs space-y-1">
              <div className="font-bold text-foreground">
                Existing Match:
              </div>
              {existingRecord.title && (
                <div className="text-foreground">
                  <span className="font-semibold text-muted-foreground">Title:</span> {existingRecord.title}
                </div>
              )}
              {existingRecord.name && (
                <div className="text-foreground">
                  <span className="font-semibold text-muted-foreground">Name:</span> {existingRecord.name}
                </div>
              )}
              {existingRecord.company && (
                <div className="text-foreground">
                  <span className="font-semibold text-muted-foreground">Company:</span> {existingRecord.company}
                </div>
              )}
              {existingRecord.amount !== undefined && (
                <div className="text-foreground tabular-nums">
                  <span className="font-semibold text-muted-foreground">Amount:</span> ₹{Number(existingRecord.amount).toLocaleString('en-IN')}
                </div>
              )}
              {existingRecord.date && (
                <div className="text-muted-foreground text-[11px] tabular-nums">
                  Date: {new Date(existingRecord.date).toLocaleDateString('en-IN')}
                </div>
              )}
            </div>
          )}

          <div className="text-[11px] text-muted-foreground italic">
            Do you want to continue and add this record anyway?
          </div>
        </AlertDialogHeader>

        {/* Action Buttons */}
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-xl border border-border bg-background px-4 py-2 text-xs font-bold text-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all cursor-pointer"
          >
            <span>{confirmLabel}</span>
            <ArrowRight size={13} className="shrink-0" />
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

