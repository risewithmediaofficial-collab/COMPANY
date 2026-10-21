import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CalendarDays, X } from 'lucide-react';
import { useAddProgressUpdate } from '../../hooks/useTasks';
import { uploadFiles } from '../../utils/taskFields';

const buildTaskLabel = (task) => {
  const title = task.taskTitle || task.title || 'Untitled task';
  const client = task.client?.name || task.client?.company || task.clientName || '';
  return client ? `${title} - ${client}` : title;
};

export const DailyTaskUpdateDialog = ({
  open,
  onOpenChange,
  tasks = [],
  defaultDate,
  onSubmitted,
}) => {
  const addProgressUpdate = useAddProgressUpdate();
  const [taskId, setTaskId] = useState('');
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState('');
  const [workNotes, setWorkNotes] = useState('');
  const [workDate, setWorkDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [files, setFiles] = useState([]);

  const orderedTasks = useMemo(
    () => [...tasks].sort((a, b) => buildTaskLabel(a).localeCompare(buildTaskLabel(b))),
    [tasks],
  );

  const resetForm = () => {
    setTaskId('');
    setDescription('');
    setHours('');
    setWorkNotes('');
    setWorkDate(defaultDate || new Date().toISOString().split('T')[0]);
    setFiles([]);
  };

  const handleOpenChange = (nextOpen) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!taskId || !description.trim()) return;

    const attachments = await uploadFiles(files);
    await addProgressUpdate.mutateAsync({
      id: taskId,
      data: {
        description: description.trim(),
        hours: Number(hours) || 0,
        workNotes: workNotes.trim(),
        workDate,
        attachments,
      },
    });

    resetForm();
    onOpenChange(false);
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-border shadow-2xl max-w-2xl max-h-[90vh]">
        <DialogHeader className="px-6 py-4 sm:py-5 border-b border-border bg-card shrink-0 select-none flex flex-row items-center justify-between gap-4 m-0 space-y-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 shadow-2xs">
              <CalendarDays size={20} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                Log Daily Task Update
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-normal">
                Save today&apos;s completed work against a task so it appears in the weekly report
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

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Form Body - Google Form Linear Stack */}
          <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
            <div className="space-y-6">
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Select Task *</label>
                <select
                  value={taskId}
                  onChange={(event) => setTaskId(event.target.value)}
                  className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-2xs"
                >
                  <option value="">Select a task</option>
                  {orderedTasks.map((task) => (
                    <option key={task._id} value={task._id}>{buildTaskLabel(task)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Work Date *</label>
                <Input
                  type="date"
                  value={workDate}
                  onChange={(event) => setWorkDate(event.target.value)}
                  className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Hours Spent</label>
                <Input
                  type="number"
                  min="0"
                  step="0.25"
                  value={hours}
                  onChange={(event) => setHours(event.target.value)}
                  placeholder="0"
                  className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Completed Work *</label>
                <Textarea
                  className="min-h-[110px] rounded-xl border-border bg-background p-3.5 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs resize-y"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What did you complete today?"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Work Notes</label>
                <Textarea
                  className="min-h-[90px] rounded-xl border-border bg-background p-3.5 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs resize-y"
                  value={workNotes}
                  onChange={(event) => setWorkNotes(event.target.value)}
                  placeholder="Blockers, next steps, links, or notes for the team"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">Attachments</label>
                <Input
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                  onChange={(event) => setFiles(Array.from(event.target.files || []))}
                  className="h-11 rounded-xl border-border bg-background px-4 text-sm focus:ring-2 focus:ring-primary/20 shadow-2xs file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
                {files.length ? (
                  <div className="mt-2.5 rounded-xl border border-border bg-secondary/20 p-3 text-xs text-muted-foreground space-y-1">
                    {files.map((file) => (
                      <div key={`${file.name}-${file.size}`} className="truncate font-medium">{file.name}</div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Pinned Sticky Bottom Action Footer */}
          <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-md px-6 py-4 flex items-center justify-between gap-3 z-10 shadow-xs select-none">
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
                onClick={() => handleOpenChange(false)}
                disabled={addProgressUpdate.isPending}
                className="h-11 px-5 rounded-xl text-sm font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addProgressUpdate.isPending || !taskId || !description.trim()}
                className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/95 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 cursor-pointer transition-all"
              >
                {addProgressUpdate.isPending ? 'Saving...' : 'Save Daily Update'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
