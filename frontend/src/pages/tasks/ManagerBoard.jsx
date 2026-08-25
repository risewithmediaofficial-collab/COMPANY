import { useState, useMemo } from 'react';
import {
  ClipboardList,
  UserCheck,
  XCircle,
  Clock,
  CheckCircle2,
  ChevronDown,
  X,
  Check,
  ArrowRight,
  StickyNote,
  Building2,
  User,
  Calendar,
  AlertCircle,
  Search,
  Filter,
} from 'lucide-react';
import { useAllNotes, useAssignNote, useDismissNote } from '../../hooks/useTaskNotes';
import { useUsers } from '../../hooks/useUsers';
import { Button } from '../../components/ui/button';
import WorkspacePage from '../../components/ui/WorkspacePage';
import DatabaseView from '../../components/ui/DatabaseView';

const priorityTone = { low: 'bg-slate-500/10 text-slate-600', medium: 'bg-blue-500/10 text-blue-600', high: 'bg-amber-500/10 text-amber-600', urgent: 'bg-rose-500/10 text-rose-600' };

// ── Assign panel (drawer inside card) ────────────────────────────────────────
const AssignPanel = ({ note, employees, onAssign, onDismiss, onClose, loading }) => {
  const [assignedTo, setAssignedTo] = useState('');
  const [managerNote, setManagerNote] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [action, setAction] = useState('assign'); // 'assign' | 'dismiss'

  const handleSubmit = (e) => {
    e.preventDefault();
    if (action === 'assign') {
      if (!assignedTo) return;
      onAssign({ assignedTo, managerNote, dueDate: dueDate || undefined });
    } else {
      onDismiss({ managerNote });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 rounded-2xl border border-border bg-secondary/30 p-4">
      {/* Action toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setAction('assign')}
          className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
            action === 'assign'
              ? 'bg-primary text-primary-foreground'
              : 'border border-border bg-background text-muted-foreground hover:bg-secondary'
          }`}
        >
          <UserCheck size={13} className="mr-1 inline" /> Assign to Employee
        </button>
        <button
          type="button"
          onClick={() => setAction('dismiss')}
          className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all ${
            action === 'dismiss'
              ? 'bg-rose-500 text-white'
              : 'border border-border bg-background text-muted-foreground hover:bg-secondary'
          }`}
        >
          <XCircle size={13} className="mr-1 inline" /> Dismiss Note
        </button>
      </div>

      {action === 'assign' ? (
        <>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Assign to Employee *</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              required
              className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs"
            >
              <option value="">Select team member...</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.name} ({emp.department || emp.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs"
            />
          </div>
        </>
      ) : null}

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">
          {action === 'assign' ? 'Instructions / Note for Assignee' : 'Reason for Dismissal'}
        </label>
        <textarea
          value={managerNote}
          onChange={(e) => setManagerNote(e.target.value)}
          rows={2}
          placeholder={action === 'assign' ? 'e.g. Please finish this before Friday...' : 'e.g. Already handled in meeting...'}
          className="w-full rounded-xl border border-border bg-background p-2.5 text-xs"
        />
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-secondary"
        >
          Cancel
        </button>
        <Button
          type="submit"
          size="sm"
          disabled={loading || (action === 'assign' && !assignedTo)}
          className={`rounded-xl text-xs font-bold ${action === 'dismiss' ? 'bg-rose-500 hover:bg-rose-600' : ''}`}
        >
          {loading ? 'Processing...' : action === 'assign' ? 'Create Task & Assign' : 'Confirm Dismiss'}
        </Button>
      </div>
    </form>
  );
};

export default function ManagerBoard() {
  const [tab, setTab] = useState('pending'); // 'pending' | 'assigned' | 'dismissed'
  const [activeNoteId, setActiveNoteId] = useState(null); // card with open assign panel
  const [search, setSearch] = useState('');

  const { data: notes = [], isLoading } = useAllNotes();
  const { data: users = [] } = useUsers();
  const assignMutation = useAssignNote();
  const dismissMutation = useDismissNote();

  const employees = users.filter((u) => u.role !== 'client' && u.isActive);

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
      const client = (n.client?.company || n.client?.name || '').toLowerCase();
      const creator = (n.createdBy?.name || '').toLowerCase();
      return title.includes(q) || content.includes(q) || client.includes(q) || creator.includes(q);
    });
  }, [tab, pendingNotes, assignedNotes, dismissedNotes, search]);

  const handleAssign = async (noteId, data) => {
    await assignMutation.mutateAsync({ noteId, ...data });
    setActiveNoteId(null);
  };

  const handleDismiss = async (noteId, data) => {
    await dismissMutation.mutateAsync({ noteId, ...data });
    setActiveNoteId(null);
  };

  // Table Columns
  const tableColumns = [
    {
      key: 'title',
      label: 'Note / Requirement',
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
      key: 'client',
      label: 'Client',
      render: (note) => (
        <span className="text-xs font-semibold text-foreground">
          {note.client?.company || note.client?.name || 'Internal'}
        </span>
      ),
    },
    {
      key: 'createdBy',
      label: 'Submitted By',
      render: (note) => (
        <span className="text-xs text-muted-foreground">
          {note.createdBy?.name || 'Team Member'}
        </span>
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
      key: 'createdAt',
      label: 'Created Date',
      render: (note) => (
        <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
          <Calendar size={11} className="text-muted-foreground/70" />
          <span>{note.createdAt ? new Date(note.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
        </div>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (note) =>
        note.status === 'pending' ? (
          <Button
            size="sm"
            onClick={() => setActiveNoteId(activeNoteId === note._id ? null : note._id)}
            className="rounded-xl text-xs font-bold gap-1"
          >
            <UserCheck size={13} />
            <span>Review & Assign</span>
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground capitalize">
            {note.status}
          </span>
        ),
    },
  ];

  // Cards Render
  const renderCard = (note) => {
    const isExpanded = activeNoteId === note._id;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${priorityTone[note.priority] || priorityTone.medium}`}>
            {note.priority || 'medium'}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {new Date(note.createdAt).toLocaleDateString()}
          </span>
        </div>

        <div>
          <h4 className="font-bold text-sm text-foreground">{note.title}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            🏢 {note.client?.company || note.client?.name || 'Internal'} • By: {note.createdBy?.name || 'Team'}
          </p>
        </div>

        <p className="text-xs text-foreground/80 bg-secondary/30 p-2.5 rounded-xl border border-border/40 line-clamp-3">
          {note.content}
        </p>

        {note.status === 'pending' && (
          <div>
            <Button
              size="sm"
              onClick={() => setActiveNoteId(isExpanded ? null : note._id)}
              className="w-full rounded-xl text-xs font-bold gap-1.5 shadow-sm"
            >
              <UserCheck size={14} />
              <span>{isExpanded ? 'Close Review Panel' : 'Review & Assign'}</span>
            </Button>

            {isExpanded && (
              <AssignPanel
                note={note}
                employees={employees}
                onAssign={(data) => handleAssign(note._id, data)}
                onDismiss={(data) => handleDismiss(note._id, data)}
                onClose={() => setActiveNoteId(null)}
                loading={assignMutation.isPending || dismissMutation.isPending}
              />
            )}
          </div>
        )}

        {note.status === 'assigned' && note.assignedTo && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex items-center justify-between text-emerald-600 font-bold">
            <span>Assigned to: {note.assignedTo.name}</span>
            <CheckCircle2 size={14} />
          </div>
        )}
      </div>
    );
  };

  return (
    <WorkspacePage
      breadcrumbs={['RiseWithMedia', 'Delivery', 'Manager Review Board']}
      title="Manager Review Board & Notes"
      subtitle="Review pending task notes submitted by team members, distribute assignments, and streamline production workflows."
      icon="📋"
      properties={[
        { label: 'Pending Review', value: pendingNotes.length, tone: pendingNotes.length > 0 ? 'warning' : 'neutral', icon: Clock },
        { label: 'Assigned', value: assignedNotes.length, tone: 'info', icon: CheckCircle2 },
        { label: 'Dismissed', value: dismissedNotes.length, tone: 'neutral' },
      ]}
    >
      {/* Quick Filter Tabs */}
      <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-1">
        {[
          { id: 'pending', label: `Pending Review (${pendingNotes.length})` },
          { id: 'assigned', label: `Assigned Tasks (${assignedNotes.length})` },
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
        viewKey="rwm_manager_board_v1"
        views={['cards', 'table']}
        items={filteredNotes}
        totalCount={filteredNotes.length}
        searchPlaceholder="Search notes by title, client, or team member..."
        columns={tableColumns}
        renderCard={renderCard}
        onSearchChange={setSearch}
      />
    </WorkspacePage>
  );
}
