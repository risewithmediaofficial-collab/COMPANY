import { useState } from 'react';
import { X, FileText, Calendar, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import api from '../../api';

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];

const priorityColors = {
  low: 'bg-slate-500/10 text-slate-600 border-slate-200',
  medium: 'bg-blue-500/10 text-blue-600 border-blue-200',
  high: 'bg-amber-500/10 text-amber-600 border-amber-200',
  urgent: 'bg-red-500/10 text-red-600 border-red-200',
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain p-3 sm:p-4 flex min-h-full items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal */}
      <div className="relative w-full my-auto max-w-lg max-h-[min(90vh,calc(100dvh-2rem))] rounded-3xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 sm:px-6 py-4 sm:py-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Add Project Brief</h2>
              <p className="text-xs text-muted-foreground">Manager will see this and assign tasks</p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
          {error && (
            <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              Brief Title <span className="text-destructive">*</span>
            </label>
            <input
              id="brief-title"
              type="text"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g. Social Media Campaign – July 2026"
              className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">
              Task Details / Instructions
            </label>
            <textarea
              id="brief-description"
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={4}
              placeholder="Describe the project scope, deliverables, and any specific instructions for the manager..."
              className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          {/* Dates row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Calendar size={12} />
                Start Date
              </label>
              <input
                id="brief-start-date"
                type="date"
                value={form.startDate}
                onChange={(e) => handleChange('startDate', e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <AlertTriangle size={12} />
                Deadline
              </label>
              <input
                id="brief-deadline"
                type="date"
                value={form.deadline}
                onChange={(e) => handleChange('deadline', e.target.value)}
                className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-foreground">Priority</label>
            <div className="flex gap-2 flex-wrap">
              {PRIORITY_OPTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleChange('priority', p)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize transition-all ${
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
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !form.title.trim()}>
              {loading ? 'Posting...' : 'Post Brief'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
