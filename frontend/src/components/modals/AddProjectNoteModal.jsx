import { useState } from 'react';
import { FileText, Calendar, AlertTriangle, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../ui/dialog';
import { Button } from '../ui/button';
import api from '../../api';

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];

const priorityColors = {
  low: 'bg-slate-500/10 text-slate-600 border-slate-300 dark:border-slate-700 dark:text-slate-300',
  medium: 'bg-blue-500/10 text-blue-600 border-blue-300 dark:border-blue-700 dark:text-blue-300',
  high: 'bg-amber-500/10 text-amber-600 border-amber-300 dark:border-amber-700 dark:text-amber-300',
  urgent: 'bg-rose-500/10 text-rose-600 border-rose-300 dark:border-rose-700 dark:text-rose-300',
};

export const AddProjectNoteModal = ({ open, onOpenChange, onSuccess }) => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    startDate: '',
    deadline: '',
    priority: 'medium',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/task-notes', {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        startDate: form.startDate || undefined,
        deadline: form.deadline || undefined,
      });
      setForm({ title: '', description: '', startDate: '', deadline: '', priority: 'medium' });
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || 'Failed to post brief');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-border shadow-2xl max-w-2xl max-h-[90vh]">
        <DialogHeader className="px-6 py-4 sm:py-5 border-b border-border bg-card shrink-0 select-none flex flex-row items-center justify-between gap-4 m-0 space-y-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 shadow-2xs">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                Add Project Brief
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-normal">
                Brief managers on project deliverables, instructions, and deadlines
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
            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive font-medium">
                {error}
              </div>
            )}

            <div className="space-y-6">
              {/* Field 1: Brief Title */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Brief Title <span className="text-destructive">*</span>
                </label>
                <input
                  id="brief-title"
                  type="text"
                  value={form.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="e.g. Social Media Campaign – July 2026"
                  className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs"
                  required
                />
              </div>

              {/* Field 2: Description */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">
                  Task Details / Instructions
                </label>
                <textarea
                  id="brief-description"
                  value={form.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={4}
                  placeholder="Describe the project scope, deliverables, and specific instructions..."
                  className="w-full min-h-[120px] rounded-xl border border-border bg-background p-3.5 text-sm outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs resize-y"
                />
              </div>

              {/* Field 3: Start Date */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <Calendar size={14} className="text-muted-foreground" />
                  Start Date
                </label>
                <input
                  id="brief-start-date"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs"
                />
              </div>

              {/* Field 4: Deadline */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-muted-foreground" />
                  Deadline
                </label>
                <input
                  id="brief-deadline"
                  type="date"
                  value={form.deadline}
                  onChange={(e) => handleChange('deadline', e.target.value)}
                  className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs"
                />
              </div>

              {/* Field 5: Priority */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Priority</label>
                <div className="flex gap-2.5 flex-wrap">
                  {PRIORITY_OPTIONS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handleChange('priority', p)}
                      className={`h-10 px-4 rounded-xl border text-sm font-semibold capitalize transition-all cursor-pointer ${
                        form.priority === p
                          ? `${priorityColors[p]} shadow-xs ring-2 ring-primary/20 font-bold`
                          : 'border-border bg-background text-muted-foreground hover:bg-secondary'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
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
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="h-11 px-5 rounded-xl text-sm font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !form.title.trim()}
                className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/95 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 cursor-pointer transition-all"
              >
                {loading ? 'Posting...' : 'Post Brief'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
