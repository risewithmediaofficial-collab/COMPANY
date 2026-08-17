import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

  useEffect(() => {
    form.reset({
      date: report?.date ? new Date(report.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      summary: report?.summary || '',
      tasksCompleted: report?.tasksCompleted?.join(', ') || '',
      blockers: report?.blockers || '',
    });
  }, [form, open, report]);

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
      <DialogContent noPadding className="max-w-2xl w-[92vw] sm:w-full max-h-[85vh] sm:max-h-[88vh] flex flex-col min-h-0 p-0 overflow-hidden bg-card border-border rounded-2xl shadow-2xl">
        <div className="shrink-0 p-5 sm:p-6 border-b border-border bg-secondary/20">
          <DialogHeader className="border-b-0 mb-0 pb-0">
            <DialogTitle>End of Day Report</DialogTitle>
            <DialogDescription>Share progress, completed work, and blockers for today or a previous date.</DialogDescription>
          </DialogHeader>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="p-5 sm:p-6 space-y-4 flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Report Date *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Select date for this report. Missed a day? Select a previous date.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Summary *</FormLabel>
                    <FormControl>
                      <Textarea placeholder="What did you work on?" {...field} />
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
                    <FormLabel>Completed Tasks *</FormLabel>
                    <FormControl>
                      <Input placeholder="Campaign copy, client revisions, QA checklist" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Separate multiple tasks with commas.</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="blockers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Blockers</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Anything blocking work?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="shrink-0 p-4 bg-secondary/20 border-t border-border flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitEOD.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitEOD.isPending}>
                {submitEOD.isPending ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
