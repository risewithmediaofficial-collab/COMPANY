import { useState } from 'react';
import { FileText, Calendar, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import api from '../../api';

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];

const priorityColors = {
  low: 'bg-slate-500/10 text-slate-600 border-slate-200 dark:text-slate-400',
  medium: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:text-blue-400',
  high: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:text-amber-400',
  urgent: 'bg-rose-500/10 text-rose-600 border-rose-200 dark:text-rose-400',
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
      <DialogContent size="default">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
              📝
            </span>
            <DialogTitle>Add Project Brief</DialogTitle>
          </div>
          <DialogDescription>
            Brief managers on project deliverables, milestones, and priority
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-3.5 py-2.5 text-xs text-destructive">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="mb-1.5 block font-semibold text-foreground">
              Brief Title <span className="text-destructive">*</span>
            </label>
            <input
              id="brief-title"
              type="text"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g. Social Media Campaign – July 2026"
              className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block font-semibold text-foreground">
              Task Details / Instructions
            </label>
            <textarea
              id="brief-description"
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={4}
              placeholder="Describe the project scope, deliverables, and specific instructions..."
              className="w-full resize-none rounded-xl border border-border bg-background p-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 font-semibold text-foreground">
                <Calendar size={12} />
                Start Date
              </label>
              <input
                id="brief-start-date"
                type="date"
                value={form.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 font-semibold text-foreground">
                <AlertTriangle size={12} />
                Deadline
              </label>
              <input
                id="brief-deadline"
                type="date"
                value={form.deadline}
                onChange={(e) => handleChange('deadline', e.target.value)}
                className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="mb-1.5 block font-semibold text-foreground">Priority</label>
            <div className="flex gap-2 flex-wrap">
              {PRIORITY_OPTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleChange('priority', p)}
                  className={`rounded-lg border px-3 py-1 text-xs font-semibold capitalize transition-all ${
                    form.priority === p
                      ? priorityColors[p]
                      : 'border-border bg-background text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !form.title.trim()} className="rounded-xl bg-primary text-primary-foreground font-bold text-xs">
              {loading ? 'Posting...' : 'Post Brief'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
