import { useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Plus, Send, Trash2, Edit3, X,
  Clock, CheckCircle2, XCircle,
  StickyNote, ChevronDown,
} from 'lucide-react';
import { useMyNotes, useCreateNote, useUpdateNote, useDeleteNote } from '../../hooks/useTaskNotes';
import { PageHeader, MetricGrid, MetricCard, EmptyState, StatusBadge } from '../../components/ui/page';
import { Button } from '../../components/ui/button';

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];

const priorityTone = { low: 'neutral', medium: 'info', high: 'warning', urgent: 'danger' };
const statusTone   = { pending: 'warning', assigned: 'success', dismissed: 'danger' };
const statusIcon   = {
  pending:   <Clock size={13} />,
  assigned:  <CheckCircle2 size={13} />,
  dismissed: <XCircle size={13} />,
};

// ── Inline form for create / edit ─────────────────────────────────────────────
const NoteForm = ({ initial = {}, onSubmit, onCancel, loading }) => {
  const [form, setForm] = useState({
    title:       initial.title       || '',
    description: initial.description || '',
    priority:    initial.priority    || 'medium',
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Task Title *
        </label>
        <input
          autoFocus
          value={form.title}
          onChange={set('title')}
          placeholder="What needs to be done?"
          className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Description
        </label>
        <textarea
          value={form.description}
          onChange={set('description')}
          rows={3}
          placeholder="Add details, context or requirements..."
          className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-all placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Priority
        </label>
        <div className="relative">
          <select
            value={form.priority}
            onChange={set('priority')}
            className="w-full appearance-none rounded-2xl border border-border bg-background px-4 py-3 pr-10 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
          <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          <X size={14} className="mr-1" /> Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!form.title.trim() || loading}>
          <Send size={14} className="mr-1" />
          {initial._id ? 'Save Changes' : 'Send to Manager'}
        </Button>
      </div>
    </form>
  );
};

// ── Note card ────────────────────────────────────────────────────────────────
const NoteCard = ({ note, onEdit, onDelete }) => {
  const isPending = note.status === 'pending';

  return (
    <div className="group relative overflow-hidden rounded-[22px] border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md">
      {/* Priority stripe */}
      <div
        className={`absolute left-0 top-0 h-full w-1 rounded-l-[22px] ${
          note.priority === 'urgent' ? 'bg-red-500' :
          note.priority === 'high'   ? 'bg-amber-500' :
          note.priority === 'medium' ? 'bg-blue-500' : 'bg-slate-300'
        }`}
      />

      <div className="pl-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground leading-snug">{note.title}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {new Date(note.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric',
              })}
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <StatusBadge tone={statusTone[note.status]}>
              <span className="mr-1">{statusIcon[note.status]}</span>
              {note.status.charAt(0).toUpperCase() + note.status.slice(1)}
            </StatusBadge>
          </div>
        </div>

        {/* Description */}
        {note.description && (
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {note.description}
          </p>
        )}

        {/* Priority badge */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge tone={priorityTone[note.priority]}>
            {note.priority.charAt(0).toUpperCase() + note.priority.slice(1)} Priority
          </StatusBadge>

          {note.assignedTo && (
            <StatusBadge tone="success">
              Assigned → {note.assignedTo.name}
            </StatusBadge>
          )}

          {note.dueDate && (
            <StatusBadge tone="info">
              Due: {new Date(note.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </StatusBadge>
          )}
        </div>

        {/* Manager note */}
        {note.managerNote && (
          <div className="mt-3 rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Manager note: </span>
            {note.managerNote}
          </div>
        )}

        {/* Actions (only for pending) */}
        {isPending && (
          <div className="mt-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => onEdit(note)}
              className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <Edit3 size={12} /> Edit
            </button>
            <button
              onClick={() => onDelete(note._id)}
              className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main page ────────────────────────────────────────────────────────────────
const PendingNotes = () => {
  const { user } = useSelector((s) => s.auth);
  const { data: notes = [], isLoading } = useMyNotes();
  const createMutation = useCreateNote();
  const updateMutation = useUpdateNote();
  const deleteMutation = useDeleteNote();

  const [showForm, setShowForm]   = useState(false);
  const [editNote, setEditNote]   = useState(null);
  const [statusFilter, setFilter] = useState('all');

  const pending   = notes.filter((n) => n.status === 'pending');
  const assigned  = notes.filter((n) => n.status === 'assigned');
  const dismissed = notes.filter((n) => n.status === 'dismissed');

  const filtered =
    statusFilter === 'all'      ? notes :
    statusFilter === 'pending'  ? pending :
    statusFilter === 'assigned' ? assigned : dismissed;

  const handleCreate = (form) => {
    createMutation.mutate(form, {
      onSuccess: () => setShowForm(false),
    });
  };

  const handleUpdate = (form) => {
    updateMutation.mutate({ id: editNote._id, data: form }, {
      onSuccess: () => setEditNote(null),
    });
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this note?')) deleteMutation.mutate(id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        eyebrow="My Pending Notes"
        title="Task Notes"
        actions={
          !showForm && !editNote && (
            <Button onClick={() => setShowForm(true)}>
              <Plus size={16} className="mr-2" />
              New Note
            </Button>
          )
        }
      >
        <MetricGrid>
          <MetricCard label="Total Notes"  value={notes.length}     icon={StickyNote}   tone="info" />
          <MetricCard label="Pending"      value={pending.length}   icon={Clock}        tone="warning" />
          <MetricCard label="Assigned"     value={assigned.length}  icon={CheckCircle2} tone="success" />
          <MetricCard label="Dismissed"    value={dismissed.length} icon={XCircle}      tone="danger" />
        </MetricGrid>
      </PageHeader>

      {/* Create form panel */}
      {showForm && (
        <div className="rounded-[28px] border border-primary/20 bg-card p-6 shadow-lg">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <StickyNote size={16} />
            </div>
            <h2 className="text-base font-bold text-foreground">New Task Note</h2>
          </div>
          <NoteForm
            onSubmit={handleCreate}
            onCancel={() => setShowForm(false)}
            loading={createMutation.isPending}
          />
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {['all', 'pending', 'assigned', 'dismissed'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
              statusFilter === s
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                : 'border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            <span className="ml-1.5 opacity-70">
              ({s === 'all' ? notes.length : s === 'pending' ? pending.length : s === 'assigned' ? assigned.length : dismissed.length})
            </span>
          </button>
        ))}
      </div>

      {/* Notes grid */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">
          Loading notes...
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title={statusFilter === 'all' ? 'No notes yet' : `No ${statusFilter} notes`}
          action={
            statusFilter === 'all' && (
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus size={14} className="mr-1" /> Write your first note
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((note) => (
            editNote?._id === note._id ? (
              <div key={note._id} className="rounded-[22px] border border-primary/30 bg-card p-5 shadow-md sm:col-span-2 xl:col-span-1">
                <h3 className="mb-4 text-sm font-bold text-foreground">Edit Note</h3>
                <NoteForm
                  initial={note}
                  onSubmit={handleUpdate}
                  onCancel={() => setEditNote(null)}
                  loading={updateMutation.isPending}
                />
              </div>
            ) : (
              <NoteCard
                key={note._id}
                note={note}
                onEdit={setEditNote}
                onDelete={handleDelete}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingNotes;
