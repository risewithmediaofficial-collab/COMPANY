import { useState } from 'react';
import { AlertCircle, Clock, Plus, Upload } from '@/components/ui/muiIcons';
import { useAddProgressUpdate } from '../../hooks/useTasks';
import { uploadFiles } from '../../utils/taskFields';

export const ProgressUpdateForm = ({ taskId, onSuccess }) => {
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState('');
  const [workNotes, setWorkNotes] = useState('');
  const [workDate, setWorkDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [files, setFiles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const addProgress = useAddProgressUpdate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!description.trim()) return;

    try {
      const attachments = await uploadFiles(files);
      await addProgress.mutateAsync({
        id: taskId,
        data: {
          description: description.trim(),
          hours: Number(hours) || 0,
          workNotes: workNotes.trim(),
          workDate,
          attachments,
        },
      });

      setDescription('');
      setHours('');
      setWorkNotes('');
      setWorkDate(new Date().toISOString().split('T')[0]);
      setFiles([]);
      setShowForm(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error adding progress:', error);
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="inline-flex items-center rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
      >
        <Plus size={16} className="mr-2 shrink-0" />
        Add Work Update
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-background p-4">
      <div>
        <label className="text-sm font-semibold text-foreground">Completed Work *</label>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="mt-2 min-h-24 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15"
          placeholder="What was completed in this update?"
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-foreground">Work Notes</label>
        <textarea
          value={workNotes}
          onChange={(event) => setWorkNotes(event.target.value)}
          className="mt-2 min-h-20 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15"
          placeholder="Add any context, blockers, or notes for admin/client review..."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-semibold text-foreground">Hours Spent</label>
          <div className="relative mt-2">
            <Clock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="number"
              min="0"
              step="0.5"
              value={hours}
              onChange={(event) => setHours(event.target.value)}
              className="w-full rounded-2xl border border-border bg-background py-3 pl-11 pr-4 text-sm tabular-nums outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15"
              placeholder="0"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground">Work Date</label>
          <input
            type="date"
            value={workDate}
            onChange={(event) => setWorkDate(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm tabular-nums outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-foreground">Update Attachments</label>
          <div className="mt-2 rounded-2xl border border-dashed border-border bg-background px-4 py-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
              <Upload size={15} className="shrink-0" />
              Upload supporting files
            </div>
            <input
              type="file"
              multiple
              onChange={(event) => setFiles(Array.from(event.target.files || []))}
              accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
              className="w-full text-sm"
            />
            {files.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {files.map((file) => (
                  <li key={`${file.name}-${file.size}`}>{file.name}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {!description.trim() && (
        <div className="flex gap-2 rounded-2xl border border-border bg-secondary px-4 py-3 text-sm text-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Add a short summary of completed work before saving the update.</span>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => setShowForm(false)}
          className="rounded-2xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={addProgress.isPending || !description.trim()}
          className="rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {addProgress.isPending ? 'Saving...' : 'Save Update'}
        </button>
      </div>
    </form>
  );
};
