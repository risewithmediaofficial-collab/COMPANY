import React, { useState, useMemo, useRef } from 'react';
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
  Pin,
  CheckSquare,
  Sparkles,
  Tag,
  ArrowRight,
  Filter,
  UserCheck,
  FolderKanban,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';
import {
  useMyNotes,
  useAllNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  useToggleNotePin,
  useToggleNoteChecklist,
  useAssignNote,
  useDismissNote,
} from '../../hooks/useTaskNotes';
import { Button } from '../../components/ui/button';
import { WorkspacePage } from '../../components/ui/WorkspacePage';
import { DatabaseView } from '../../components/ui/DatabaseView';
import { TaskNoteModal, NOTE_TEMPLATES, NOTE_COLORS } from '../../components/modals/TaskNoteModal';
import { AppTooltip } from '../../components/ui/tooltip';
import { useUsers } from '../../hooks/useUsers';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PRIORITY_TONE = {
  low: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
  medium: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  high: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  urgent: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

const CATEGORY_META = {
  task_change: { label: 'Task Change', icon: '📝', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  revision: { label: 'Revision', icon: '🔄', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  client_feedback: { label: 'Client Feedback', icon: '💬', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
  bug_fix: { label: 'Bug Fix', icon: '🐛', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
  feature_request: { label: 'Feature Request', icon: '✨', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  meeting_notes: { label: 'Meeting Note', icon: '📋', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  scratchpad: { label: 'Scratchpad', icon: '⚡', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20' },
  general: { label: 'General Note', icon: '📌', color: 'bg-secondary text-muted-foreground border-border' },
};

const COLOR_MAP = {
  default: 'bg-card border-border',
  amber: 'bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50',
  emerald: 'bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50',
  blue: 'bg-blue-500/5 border-blue-500/30 hover:border-blue-500/50',
  purple: 'bg-purple-500/5 border-purple-500/30 hover:border-purple-500/50',
  rose: 'bg-rose-500/5 border-rose-500/30 hover:border-rose-500/50',
};

const KANBAN_COLUMNS = [
  { key: 'pending', label: 'Pending Review / Draft' },
  { key: 'assigned', label: 'Assigned / In Progress' },
  { key: 'dismissed', label: 'Resolved / Archived' },
];

export default function PendingNotes() {
  const { user } = useSelector((state) => state.auth);
  const isManagerOrAdmin = ['superAdmin', 'admin', 'manager'].includes(user?.role);

  const [activeTab, setActiveTab] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [assigningNote, setAssigningNote] = useState(null);
  const [assignedToUserId, setAssignedToUserId] = useState('');
  const [managerInstruction, setManagerInstruction] = useState('');

  // Queries
  const myNotesQuery = useMyNotes();
  const allNotesQuery = useAllNotes();
  const notesQuery = isManagerOrAdmin ? allNotesQuery : myNotesQuery;

  const notes = notesQuery.data || [];
  const { data: users = [] } = useUsers();

  // Mutations
  const createMutation = useCreateNote();
  const updateMutation = useUpdateNote();
  const deleteMutation = useDeleteNote();
  const pinMutation = useToggleNotePin();
  const checklistMutation = useToggleNoteChecklist();
  const assignMutation = useAssignNote();
  const dismissMutation = useDismissNote();

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (activeTab !== 'all' && n.status !== activeTab) return false;
      if (selectedCategory !== 'all' && n.category !== selectedCategory) return false;
      if (selectedPriority !== 'all' && n.priority !== selectedPriority) return false;
      return true;
    });
  }, [notes, activeTab, selectedCategory, selectedPriority]);

  // Metrics
  const metrics = useMemo(() => {
    const total = notes.length;
    const taskChanges = notes.filter((n) => n.category === 'task_change' || n.category === 'revision').length;
    const pinned = notes.filter((n) => n.isPinned).length;
    const pending = notes.filter((n) => n.status === 'pending').length;
    const assigned = notes.filter((n) => n.status === 'assigned').length;

    return [
      { label: 'Total Notes', value: total, tone: 'neutral', icon: StickyNote },
      { label: 'Task Changes & Revisions', value: taskChanges, tone: 'info', icon: Sparkles },
      { label: 'Pinned Notes', value: pinned, tone: 'warning', icon: Pin },
      { label: 'Pending Review', value: pending, tone: pending > 0 ? 'warning' : 'neutral', icon: Clock },
      { label: 'Assigned / In Progress', value: assigned, tone: 'success', icon: CheckCircle2 },
    ];
  }, [notes]);

  const handleCreateOrUpdate = (payload) => {
    if (editingNote && editingNote._id) {
      updateMutation.mutate(
        { id: editingNote._id, data: payload },
        {
          onSuccess: () => {
            setShowModal(false);
            setEditingNote(null);
          },
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          setShowModal(false);
          setEditingNote(null);
        },
      });
    }
  };

  const handleOpenTemplate = (template) => {
    setEditingNote({
      title: template.defaultTitle,
      description: template.defaultDesc,
      category: template.category,
      color: template.color,
      priority: template.priority,
      changeScope: template.scope,
      checklists: template.defaultChecklist.map((text) => ({ text, completed: false })),
    });
    setShowModal(true);
  };

  const handleAssignSubmit = (e) => {
    e.preventDefault();
    if (!assigningNote || !assignedToUserId) return;

    assignMutation.mutate(
      {
        id: assigningNote._id,
        data: {
          assignedTo: assignedToUserId,
          managerNote: managerInstruction,
        },
      },
      {
        onSuccess: () => {
          setAssigningNote(null);
          setAssignedToUserId('');
          setManagerInstruction('');
        },
      }
    );
  };

  const handleStatusMove = (noteId, targetStatus) => {
    if (isManagerOrAdmin) {
      if (targetStatus === 'dismissed') {
        dismissMutation.mutate({ id: noteId, status: 'dismissed' });
      } else {
        updateMutation.mutate({ id: noteId, data: { status: targetStatus } });
      }
    }
  };

  // ── Card Renderer ────────────────────────────────────────────────────────────
  const renderNoteCard = (note) => {
    const colorClass = COLOR_MAP[note.color] || COLOR_MAP.default;
    const categoryMeta = CATEGORY_META[note.category] || CATEGORY_META.general;
    const totalChecklists = note.checklists?.length || 0;
    const completedChecklists = note.checklists?.filter((c) => c.completed).length || 0;

    return (
      <div className={`p-4 rounded-2xl border transition-all space-y-3 group relative shadow-xs hover:shadow-md ${colorClass}`}>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${categoryMeta.color}`}>
              {categoryMeta.icon} {categoryMeta.label}
            </span>
            {note.isPinned && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 text-[10px] font-bold">
                <Pin size={10} className="fill-amber-600" />
                <span>Pinned</span>
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold capitalize ${PRIORITY_TONE[note.priority] || PRIORITY_TONE.medium}`}>
              {note.priority}
            </span>
          </div>

          {/* Quick Action buttons */}
          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <AppTooltip content={note.isPinned ? 'Unpin' : 'Pin to top'}>
              <button
                type="button"
                onClick={() => pinMutation.mutate(note._id)}
                className={`p-1 rounded-lg hover:bg-secondary transition-colors ${
                  note.isPinned ? 'text-amber-500' : 'text-muted-foreground'
                }`}
              >
                <Pin size={13} className={note.isPinned ? 'fill-current' : ''} />
              </button>
            </AppTooltip>

            <AppTooltip content="Edit Note">
              <button
                type="button"
                onClick={() => {
                  setEditingNote(note);
                  setShowModal(true);
                }}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <Edit3 size={13} />
              </button>
            </AppTooltip>

            <AppTooltip content="Delete Note">
              <button
                type="button"
                onClick={() => setDeleteId(note._id)}
                className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </AppTooltip>
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
            {note.title}
          </h3>
          {note.description && (
            <p className="text-xs text-muted-foreground mt-1.5 whitespace-pre-wrap leading-relaxed">
              {note.description}
            </p>
          )}
        </div>

        {/* Linked Task & Project Tags */}
        {(note.task || note.client || note.project) && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {note.task && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 text-primary text-[10px] font-bold">
                <CheckSquare size={11} />
                <span className="truncate max-w-[200px]">{note.task.title || note.task.taskTitle}</span>
              </span>
            )}
            {note.client && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-secondary text-muted-foreground text-[10px] font-semibold">
                <Building2 size={11} />
                <span>{note.client.name}</span>
              </span>
            )}
          </div>
        )}

        {/* Interactive Checklist */}
        {totalChecklists > 0 && (
          <div className="space-y-1.5 pt-1.5 border-t border-border/50">
            <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckSquare size={12} className="text-primary" />
                <span>Checklist Items</span>
              </span>
              <span>{completedChecklists}/{totalChecklists} done</span>
            </div>
            <div className="space-y-1">
              {note.checklists.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => checklistMutation.mutate({ id: note._id, itemIndex: idx })}
                  className="flex items-center gap-2 text-xs cursor-pointer p-1 rounded-md hover:bg-secondary/50 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={item.completed}
                    readOnly
                    className="rounded border-border text-primary cursor-pointer h-3.5 w-3.5 pointer-events-none"
                  />
                  <span className={`flex-1 text-xs ${item.completed ? 'line-through text-muted-foreground font-normal' : 'text-foreground font-medium'}`}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Manager Action Note */}
        {note.managerNote && (
          <div className="p-2 rounded-xl bg-primary/5 border border-primary/20 text-xs space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Manager Note:</span>
            <p className="text-foreground/90">{note.managerNote}</p>
          </div>
        )}

        {/* Footer Meta & Manager Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
          <span>
            {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {note.submittedBy?.name ? ` by ${note.submittedBy.name}` : ''}
          </span>

          <div className="flex items-center gap-1.5">
            {isManagerOrAdmin && note.status === 'pending' && (
              <button
                type="button"
                onClick={() => setAssigningNote(note)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:bg-primary/90 shadow-xs"
              >
                <UserCheck size={11} />
                <span>Assign Task</span>
              </button>
            )}

            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-secondary text-muted-foreground">
              {note.status === 'assigned' ? 'Assigned' : note.status === 'dismissed' ? 'Resolved' : 'Pending'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // ── Table Columns ────────────────────────────────────────────────────────────
  const tableColumns = [
    {
      key: 'title',
      label: 'Note / Change Title',
      render: (row) => {
        const categoryMeta = CATEGORY_META[row.category] || CATEGORY_META.general;
        return (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              {row.isPinned && <Pin size={11} className="text-amber-500 fill-amber-500 shrink-0" />}
              <span className="font-bold text-foreground hover:text-primary transition-colors">{row.title}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${categoryMeta.color}`}>
                {categoryMeta.label}
              </span>
              {row.task && (
                <span className="text-[10px] text-muted-foreground truncate">
                  ↳ Task: {row.task.title || row.task.taskTitle}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (row) => (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${PRIORITY_TONE[row.priority] || PRIORITY_TONE.medium}`}>
          {row.priority}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold capitalize bg-secondary text-muted-foreground">
          {row.status}
        </span>
      ),
    },
    {
      key: 'checklists',
      label: 'Checklist Progress',
      render: (row) => {
        const total = row.checklists?.length || 0;
        const done = row.checklists?.filter((c) => c.completed).length || 0;
        if (!total) return <span className="text-muted-foreground text-[11px]">—</span>;
        return (
          <span className="text-xs font-semibold text-foreground">
            {done}/{total} ({Math.round((done / total) * 100)}%)
          </span>
        );
      },
    },
    {
      key: 'submittedBy',
      label: 'Author',
      render: (row) => (
        <span className="text-xs text-muted-foreground">{row.submittedBy?.name || 'You'}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => pinMutation.mutate(row._id)}
            className={`p-1 rounded-lg hover:bg-secondary ${row.isPinned ? 'text-amber-500' : 'text-muted-foreground'}`}
          >
            <Pin size={12} className={row.isPinned ? 'fill-current' : ''} />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingNote(row);
              setShowModal(true);
            }}
            className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
          >
            <Edit3 size={12} />
          </button>
          <button
            type="button"
            onClick={() => setDeleteId(row._id)}
            className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          >
            <Trash2 size={12} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <WorkspacePage
      title="Task Change Notes & Ideas Hub"
      description="Capture revisions, client feedback, task changes, action checklists, and team project briefs."
      metrics={metrics}
      actionButton={
        <Button
          onClick={() => {
            setEditingNote(null);
            setShowModal(true);
          }}
          className="rounded-2xl gap-2 font-bold shadow-sm"
        >
          <Plus size={16} />
          <span>New Task Note</span>
        </Button>
      }
    >
      <div className="space-y-4">
        {/* 1. Quick Template Launcher Bar */}
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sparkles size={14} className="text-primary" />
              <span>1-Click Task Note Templates:</span>
            </span>
            <span className="text-[11px] text-muted-foreground">Pick a template to start drafting instantly</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {NOTE_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => handleOpenTemplate(tmpl)}
                className="flex flex-col p-3 rounded-xl border border-border bg-secondary/30 hover:bg-secondary hover:border-primary/40 text-left transition-all group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl">{tmpl.icon}</span>
                  <span className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Draft →
                  </span>
                </div>
                <span className="text-xs font-bold text-foreground mt-2">{tmpl.label}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                  {tmpl.category === 'task_change' ? 'Task revision checklist' : tmpl.category === 'client_feedback' ? 'Client comments log' : 'Quick notes & ideas'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Category & Priority Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-card rounded-2xl border border-border">
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
            {['all', 'task_change', 'revision', 'client_feedback', 'bug_fix', 'scratchpad', 'meeting_notes'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                {cat === 'all' ? 'All Categories' : cat.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">🔴 Urgent</option>
              <option value="high">🟠 High</option>
              <option value="medium">🔵 Medium</option>
              <option value="low">🟢 Low</option>
            </select>
          </div>
        </div>

        {/* 3. Database Multi-View (Cards, Board, Table) */}
        <DatabaseView
          viewKey="task_notes_view_preference"
          views={[
            { id: 'cards', label: 'Cards Grid', icon: StickyNote },
            { id: 'board', label: 'Status Board', icon: FolderKanban },
            { id: 'table', label: 'Table List', icon: FileText },
          ]}
          items={filteredNotes}
          columns={tableColumns}
          totalCount={filteredNotes.length}
          searchPlaceholder="Search notes by title, task, client, tags..."
          renderCard={(note) => renderNoteCard(note)}
          renderKanbanCard={(note) => renderNoteCard(note)}
          kanbanColumns={KANBAN_COLUMNS}
          groupBy="status"
          onStatusChange={handleStatusMove}
        />
      </div>

      {/* Task Note Create / Edit Modal */}
      <TaskNoteModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingNote(null);
        }}
        initial={editingNote}
        onSubmit={handleCreateOrUpdate}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Manager Assign Note Modal */}
      <Dialog open={Boolean(assigningNote)} onOpenChange={(open) => { if (!open) setAssigningNote(null); }}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Assign Task Note to Team Member</DialogTitle>
            <DialogDescription>
              Assign this task change request or brief to an employee with manager notes.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignSubmit} className="space-y-4 pt-2">
            <div className="p-3 rounded-xl bg-secondary/30 border border-border text-xs">
              <span className="font-bold text-foreground block">{assigningNote?.title}</span>
              <span className="text-muted-foreground mt-0.5 block">{assigningNote?.description}</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Assign to Employee *</label>
              <select
                required
                value={assignedToUserId}
                onChange={(e) => setAssignedToUserId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
              >
                <option value="">-- Select Team Member --</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.role} {u.department ? `• ${u.department}` : ''})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Manager Instructions (Optional)</label>
              <textarea
                rows={3}
                value={managerInstruction}
                onChange={(e) => setManagerInstruction(e.target.value)}
                placeholder="Add specific directives or deadline notes for the assignee..."
                className="w-full rounded-xl border border-border bg-background p-3 text-xs outline-none focus:border-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setAssigningNote(null)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-bold hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!assignedToUserId || assignMutation.isPending}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shadow-sm disabled:opacity-50"
              >
                {assignMutation.isPending ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this Task Note?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently remove this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-2 pt-3">
            <AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteMutation.mutate(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
            >
              Delete Note
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspacePage>
  );
}
