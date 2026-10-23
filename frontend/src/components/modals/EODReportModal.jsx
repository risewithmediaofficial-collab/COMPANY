import { useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FileCheck, X } from 'lucide-react';
import { useSubmitEOD } from '../../hooks/useAttendance';

const eodSchema = z.object({
  date: z.string().min(1, 'Report date is required'),
  summary: z.string().min(10, 'Add a short summary of your day'),
  tasksCompleted: z.string().min(2, 'Add at least one completed task'),
  blockers: z.string().optional(),
});

export const EODReportModal = ({ open, onOpenChange, report }) => {
  const form = useForm({
    resolver: zodResolver(eodSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      summary: '',
      tasksCompleted: '',
      blockers: '',
    },
  });
  const submitEOD = useSubmitEOD();
  const wasOpenRef = useRef(false);

  useEffect(() => {
    // Only reset form values when modal transitions from closed to open
    if (open && !wasOpenRef.current) {
      form.reset({
        date: report?.date ? new Date(report.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        summary: report?.summary || '',
        tasksCompleted: Array.isArray(report?.tasksCompleted) ? report.tasksCompleted.join(', ') : (report?.tasksCompleted || ''),
        blockers: report?.blockers || '',
      });
    }
    wasOpenRef.current = open;
  }, [open, report, form]);

  const onSubmit = async (data) => {
    await submitEOD.mutateAsync({
      date: data.date,
      summary: data.summary,
      tasksCompleted: data.tasksCompleted.split(',').map((task) => task.trim()).filter(Boolean),
      blockers: data.blockers || '',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="center" size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-border shadow-2xl max-w-2xl max-h-[90dvh]">
        <DialogHeader className="px-4 py-3 sm:px-6 sm:py-4 border-b border-border bg-card shrink-0 select-none flex flex-row items-center justify-between gap-3 m-0 space-y-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 shadow-2xs">
              <FileCheck size={20} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                End of Day Report
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-normal">
                Share progress, completed work, and blockers for today or a previous date
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <kbd className="hidden sm:inline-flex items-center justify-center h-6 px-2 rounded-md bg-secondary/80 border border-border text-[10px] font-mono font-medium text-muted-foreground shadow-xs select-none">
              ESC
            </kbd>
            <DialogClose className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/70 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/20">
              <X size={16} className="stroke-[2.5]" />
              <span className="sr-only">Close</span>
            </DialogClose>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable Form Body - Google Form Linear Stack */}
            <div className="space-y-4 sm:space-y-6 p-4 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
              <div className="space-y-4 sm:space-y-6">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Report Date *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          max={new Date().toISOString().split('T')[0]}
                          className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">Select date for this report. Missed a day? Select a previous date.</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="summary"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Daily Work Summary *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What did you work on today? Detail key accomplishments and progress..."
                          className="min-h-[110px] rounded-xl border-border bg-background p-3.5 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs resize-y"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tasksCompleted"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Completed Tasks *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Campaign copy, client revisions, QA checklist"
                          className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">Separate multiple completed deliverables with commas.</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="blockers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-foreground">Blockers / Challenges</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Anything blocking your progress or needing management support? (Optional)"
                          className="min-h-[90px] rounded-xl border-border bg-background p-3.5 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs resize-y"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Pinned Sticky Bottom Action Footer */}
            <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-md px-4 py-3 sm:px-6 sm:py-4 flex flex-wrap items-center justify-between gap-3 z-10 shadow-xs select-none">
              <span className="text-xs text-muted-foreground/80 hidden sm:inline-flex items-center gap-1.5">
                <span>Press</span>
                <kbd className="px-1.5 py-0.5 rounded-md bg-secondary border border-border text-[10px] font-mono font-medium text-foreground">
                  ESC
                </kbd>
                <span>to close</span>
              </span>

              <div className="flex items-center gap-3 ml-auto">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => onOpenChange(false)}
                  disabled={submitEOD.isPending}
                  className="h-11 px-5 rounded-xl text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitEOD.isPending}
                  className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/95 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 cursor-pointer transition-all"
                >
                  {submitEOD.isPending ? 'Submitting...' : 'Submit Report'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
