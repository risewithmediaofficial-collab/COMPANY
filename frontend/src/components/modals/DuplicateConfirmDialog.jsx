import React from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
} from '../ui/alert-dialog';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';

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
      <AlertDialogContent className="max-w-md p-6 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 shadow-2xl rounded-2xl">
        <AlertDialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-xs">
              <AlertTriangle className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <AlertDialogTitle className="text-base font-extrabold text-slate-900 dark:text-white">
                {title}
              </AlertDialogTitle>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Action Required
              </span>
            </div>
          </div>

          <AlertDialogDescription className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
            {message || 'A matching or very similar record already exists in the system.'}
          </AlertDialogDescription>

          {existingRecord && (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3 text-xs dark:border-amber-900/40 dark:bg-amber-950/20 space-y-1">
              <div className="font-bold text-slate-800 dark:text-slate-200">
                Existing Match:
              </div>
              {existingRecord.title && (
                <div className="text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-slate-500">Title:</span> {existingRecord.title}
                </div>
              )}
              {existingRecord.name && (
                <div className="text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-slate-500">Name:</span> {existingRecord.name}
                </div>
              )}
              {existingRecord.company && (
                <div className="text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-slate-500">Company:</span> {existingRecord.company}
                </div>
              )}
              {existingRecord.amount !== undefined && (
                <div className="text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-slate-500">Amount:</span> ₹{Number(existingRecord.amount).toLocaleString('en-IN')}
                </div>
              )}
              {existingRecord.date && (
                <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Date: {new Date(existingRecord.date).toLocaleDateString('en-IN')}
                </div>
              )}
            </div>
          )}

          <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
            Do you want to continue and add this record anyway?
          </div>
        </AlertDialogHeader>

        {/* Action Buttons */}
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-amber-600/30 hover:bg-amber-500 transition-all cursor-pointer"
          >
            <span>{confirmLabel}</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}

