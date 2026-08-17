import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  Plus,
  Send,
  Trash2,
  Edit3,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  StickyNote,
  Building2,
  Calendar,
  Pencil,
  Search,
} from 'lucide-react';
import { useMyNotes, useCreateNote, useUpdateNote, useDeleteNote } from '../../hooks/useTaskNotes';
import { Button } from '../../components/ui/button';
import WorkspacePage from '../../components/ui/WorkspacePage';
import DatabaseView from '../../components/ui/DatabaseView';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];

const priorityTone = {
  low: 'bg-slate-500/10 text-slate-600',
  medium: 'bg-blue-500/10 text-blue-600',
  high: 'bg-amber-500/10 text-amber-600',
  urgent: 'bg-rose-500/10 text-rose-600',
};

const statusTone = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  assigned: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  dismissed: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
};

// ── Inline form for create / edit ─────────────────────────────────────────────
const NoteForm = ({ initial = {}, onSubmit, onCancel, loading }) => {
  const [form, setForm] = useState({
    title: initial.title || '',
    content: initial.content || initial.description || '',
    priority: initial.priority || 'medium',
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-4 rounded-2xl border border-border bg-card shadow-sm">
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">Task Requirement / Title *</label>
        <input
          autoFocus
          value={form.title}
          onChange={set('title')}
          placeholder="What needs to be done?"
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">Detailed Notes / Requirements</label>
        <textarea
          value={form.content}
          onChange={set('content')}
          rows={3}
          placeholder="Client notes, references, or instructions..."
          className="w-full rounded-xl border border-border bg-background p-3 text-xs"
        />
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Priority:</span>
          {PRIORITY_OPTIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setForm((f) => ({ ...f, priority: p }))}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-bold capitalize transition-all ${
                form.priority === p
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary"
            >
              Cancel
            </button>
          )}
          <Button type="submit" size="sm" disabled={loading || !form.title.trim()} className="rounded-xl text-xs font-bold gap-1">
            <Send size={12} />
            <span>{loading ? 'Submitting...' : initial._id ? 'Update Note' : 'Submit for Review'}</span>
          </Button>
        </div>
      </div>
    </form>
  );
};

export default function PendingNotes() {
  const { user } = useSelector((state) => state.auth);
  const [isCreating, setIsCreating] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');

  const { data: notes = [], isLoading } = useMyNotes();
  const createMutation = useCreateNote();
  const updateMutation = useUpdateNote();
  const deleteMutation = useDeleteNote();

  const pendingNotes = useMemo(() => notes.filter((n) => n.status === 'pending'), [notes]);
  const assignedNotes = useMemo(() => notes.filter((n) => n.status === 'assigned'), [notes]);
  const dismissedNotes = useMemo(() => notes.filter((n) => n.status === 'dismissed'), [notes]);

  const filteredNotes = useMemo(() => {
    const list = tab === 'pending' ? pendingNotes : tab === 'assigned' ? assignedNotes : dismissedNotes;
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((n) => {
      const title = (n.title || '').toLowerCase();
      const content = (n.content || '').toLowerCase();
      return title.includes(q) || content.includes(q);
    });
  }, [tab, pendingNotes, assignedNotes, dismissedNotes, search]);

  const handleCreate = async (data) => {
    await createMutation.mutateAsync(data);
    setIsCreating(false);
  };

  const handleUpdate = async (data) => {
    await updateMutation.mutateAsync({ noteId: editingNote._id, data });
    setEditingNote(null);
  };

  // Table Columns
  const tableColumns = [
    {
      key: 'title',
      label: 'Note Title',
      render: (note) => (
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            <StickyNote size={14} />
          </div>
          <div>
            <p className="font-bold text-foreground">{note.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">{note.content}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (note) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${priorityTone[note.priority] || priorityTone.medium}`}>
          {note.priority || 'medium'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (note) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize ${statusTone[note.status] || statusTone.pending}`}>
          {note.status}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (note) => (
        <span className="text-xs text-muted-foreground">
          {new Date(note.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (note) => (
        <div className="flex items-center justify-end gap-1">
          {note.status === 'pending' && (
            <button
              onClick={() => setEditingNote(note)}
              className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
              title="Edit"
            >
              <Pencil size={14} />
            </button>
          )}
          <button
            onClick={() => setDeleteId(note._id)}
            className="p-1 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  // Cards Render
  const renderCard = (note) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${priorityTone[note.priority] || priorityTone.medium}`}>
          {note.priority || 'medium'}
        </span>
        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border capitalize ${statusTone[note.status] || statusTone.pending}`}>
          {note.status}
        </span>
      </div>

      <div>
        <h4 className="font-bold text-sm text-foreground">{note.title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">
          Created: {new Date(note.createdAt).toLocaleDateString()}
        </p>
      </div>

      {note.content && (
        <p className="text-xs text-foreground/80 bg-secondary/30 p-2.5 rounded-xl border border-border/40 line-clamp-3">
          {note.content}
        </p>
      )}

      {note.managerNote && (
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 space-y-1">
          <p className="font-bold">Manager Feedback:</p>
          <p>{note.managerNote}</p>
        </div>
      )}

      {note.status === 'pending' && (
        <div className="flex items-center justify-end gap-1 pt-1 border-t border-border/40">
          <button
            onClick={() => setEditingNote(note)}
            className="p-1 rounded hover:bg-secondary text-muted-foreground text-xs flex items-center gap-1 font-semibold"
          >
            <Pencil size={12} />
            <span>Edit</span>
          </button>
          <button
            onClick={() => setDeleteId(note._id)}
            className="p-1 rounded hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 text-xs flex items-center gap-1 font-semibold"
          >
            <Trash2 size={12} />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <WorkspacePage
      breadcrumbs={['RiseWithMedia', 'Delivery', 'Pending Notes']}
      title="Pending Task Notes Queue"
      subtitle="Submit ideas, client requests, and ad-hoc task requirements for manager assignment and execution."
      icon="📝"
      properties={[
        { label: 'Pending Review', value: pendingNotes.length, tone: pendingNotes.length > 0 ? 'warning' : 'neutral', icon: Clock },
        { label: 'Assigned', value: assignedNotes.length, tone: 'success', icon: CheckCircle2 },
        { label: 'Dismissed', value: dismissedNotes.length, tone: 'neutral' },
      ]}
      actions={
        !isCreating && (
          <Button
            size="sm"
            onClick={() => setIsCreating(true)}
            className="rounded-xl text-xs font-bold gap-1.5 shadow-sm"
          >
            <Plus size={14} className="stroke-[2.5]" />
            <span>New Note</span>
          </Button>
        )
      }
    >
      {/* Create Note Drawer */}
      {isCreating && (
        <div className="mb-6">
          <NoteForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreating(false)}
            loading={createMutation.isPending}
          />
        </div>
      )}

      {/* Edit Note Drawer */}
      {editingNote && (
        <div className="mb-6">
          <NoteForm
            initial={editingNote}
            onSubmit={handleUpdate}
            onCancel={() => setEditingNote(null)}
            loading={updateMutation.isPending}
          />
        </div>
      )}

      {/* Quick Filter Tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
        {[
          { id: 'pending', label: `Pending (${pendingNotes.length})` },
          { id: 'assigned', label: `Assigned (${assignedNotes.length})` },
          { id: 'dismissed', label: `Dismissed (${dismissedNotes.length})` },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3.5 py-1 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              tab === t.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <DatabaseView
        viewKey="rwm_pending_notes_v1"
        views={['cards', 'table']}
        items={filteredNotes}
        totalCount={filteredNotes.length}
        searchPlaceholder="Search your notes..."
        columns={tableColumns}
        renderCard={renderCard}
        onSearchChange={setSearch}
      />

      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Delete Note?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This note will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteMutation.mutate(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs font-bold"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspacePage>
  );
}
