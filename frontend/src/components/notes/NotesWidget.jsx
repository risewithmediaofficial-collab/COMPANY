import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  StickyNote,
  Plus,
  Pin,
  CheckSquare,
  Clock,
  Search,
  CheckCircle2,
  Trash2,
  Edit2,
  Tag,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Filter,
} from 'lucide-react';
import {
  useMyNotes,
  useAllNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  useToggleNotePin,
  useToggleNoteChecklist,
} from '../../hooks/useTaskNotes';
import { TaskNoteModal, NOTE_TEMPLATES } from '../modals/TaskNoteModal';
import { AppTooltip } from '../ui/tooltip';

const COLOR_MAP = {
  default: 'bg-card border-border',
  amber: 'bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50',
  emerald: 'bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50',
  blue: 'bg-blue-500/5 border-blue-500/30 hover:border-blue-500/50',
  purple: 'bg-purple-500/5 border-purple-500/30 hover:border-purple-500/50',
  rose: 'bg-rose-500/5 border-rose-500/30 hover:border-rose-500/50',
};

const CATEGORY_TAGS = {
  task_change: { label: 'Task Change', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  revision: { label: 'Revision', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  client_feedback: { label: 'Client Feedback', color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
  bug_fix: { label: 'Bug Fix', color: 'bg-rose-500/10 text-rose-600 border-rose-500/20' },
  feature_request: { label: 'Feature Request', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  meeting_notes: { label: 'Meeting Note', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  scratchpad: { label: 'Scratchpad', color: 'bg-slate-500/10 text-slate-600 border-slate-500/20' },
  general: { label: 'General', color: 'bg-secondary text-muted-foreground border-border' },
};

export function NotesWidget({ isEmployee = true, user = null, maxItems = 6, showLink = true }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  // Queries & Mutations
  const myNotesQuery = useMyNotes({}, { enabled: isEmployee });
  const allNotesQuery = useAllNotes({}, { enabled: !isEmployee });
  const notesQuery = isEmployee ? myNotesQuery : allNotesQuery;

  const notes = notesQuery.data || [];
  const createMutation = useCreateNote();
  const updateMutation = useUpdateNote();
  const deleteMutation = useDeleteNote();
  const pinMutation = useToggleNotePin();
  const checklistMutation = useToggleNoteChecklist();

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (selectedCategory !== 'all' && n.category !== selectedCategory) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const title = (n.title || '').toLowerCase();
        const desc = (n.description || '').toLowerCase();
        const taskName = (n.task?.title || n.task?.taskTitle || '').toLowerCase();
        const clientName = (n.client?.name || n.clientName || '').toLowerCase();
        return title.includes(q) || desc.includes(q) || taskName.includes(q) || clientName.includes(q);
      }
      return true;
    });
  }, [notes, selectedCategory, searchTerm]);

  const pinnedCount = notes.filter((n) => n.isPinned).length;
  const pendingCount = notes.filter((n) => n.status === 'pending').length;

  const handleCreateOrUpdate = (payload) => {
    if (editingNote) {
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
        },
      });
    }
  };

  const handleOpenCreateWithTemplate = (template) => {
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

  return (
    <div className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <StickyNote size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground">
                {isEmployee ? 'Task Change Notes & Scratchpad' : 'Team Task Change Notes & Briefs'}
              </h2>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-secondary text-muted-foreground">
                {notes.length}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isEmployee
                ? 'Record revisions on deliverables, client notes & quick checklists'
                : 'Team-submitted task changes, briefs & revision logs'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditingNote(null);
              setShowModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shadow-sm transition-all"
          >
            <Plus size={13} />
            <span>New Note</span>
          </button>
          {showLink && (
            <Link
              to="/pending-notes"
              className="p-1.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              title="Open full Notes Hub"
            >
              <ExternalLink size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* Quick Template Launcher Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 mr-1">
          Quick:
        </span>
        {NOTE_TEMPLATES.map((tmpl) => (
          <button
            key={tmpl.id}
            type="button"
            onClick={() => handleOpenCreateWithTemplate(tmpl)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border/80 bg-secondary/40 hover:bg-secondary text-[11px] font-semibold text-foreground transition-all shrink-0 hover:border-primary/40"
          >
            <span>{tmpl.icon}</span>
            <span>{tmpl.label}</span>
          </button>
        ))}
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search notes, tasks, tags..."
            className="w-full pl-7 pr-3 py-1 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
          {['all', 'task_change', 'revision', 'client_feedback', 'scratchpad'].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold capitalize transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-foreground text-background shadow-xs'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat === 'all' ? 'All Notes' : cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Notes Grid */}
      {filteredNotes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredNotes.slice(0, maxItems).map((note) => {
            const colorClass = COLOR_MAP[note.color] || COLOR_MAP.default;
            const categoryMeta = CATEGORY_TAGS[note.category] || CATEGORY_TAGS.general;
            const totalChecklists = note.checklists?.length || 0;
            const completedChecklists = note.checklists?.filter((c) => c.completed).length || 0;

            return (
              <div
                key={note._id}
                className={`p-3.5 rounded-2xl border transition-all space-y-2.5 group relative shadow-xs hover:shadow-sm ${colorClass}`}
              >
                {/* Top badges & Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${categoryMeta.color}`}>
                      {categoryMeta.label}
                    </span>
                    {note.isPinned && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 text-[10px] font-bold">
                        <Pin size={10} className="fill-amber-600" />
                        <span>Pinned</span>
                      </span>
                    )}
                    {note.priority === 'urgent' && (
                      <span className="px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-600 text-[10px] font-bold">
                        🔴 Urgent
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <AppTooltip content={note.isPinned ? 'Unpin note' : 'Pin to top'}>
                      <button
                        type="button"
                        onClick={() => pinMutation.mutate(note._id)}
                        className={`p-1 rounded-lg hover:bg-secondary transition-colors ${
                          note.isPinned ? 'text-amber-500' : 'text-muted-foreground'
                        }`}
                      >
                        <Pin size={12} className={note.isPinned ? 'fill-current' : ''} />
                      </button>
                    </AppTooltip>
                    <AppTooltip content="Edit note">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNote(note);
                          setShowModal(true);
                        }}
                        className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Edit2 size={12} />
                      </button>
                    </AppTooltip>
                    <AppTooltip content="Delete note">
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(note._id)}
                        className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </AppTooltip>
                  </div>
                </div>

                {/* Title & Body */}
                <div>
                  <h4 className="text-xs font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {note.title}
                  </h4>
                  {note.description && (
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {note.description}
                    </p>
                  )}
                </div>

                {/* Linked Task Indicator */}
                {note.task && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/5 border border-primary/15 text-[10px] font-semibold text-primary">
                    <CheckSquare size={11} />
                    <span className="truncate">Task: {note.task.title || note.task.taskTitle}</span>
                  </div>
                )}

                {/* Interactive Checklists */}
                {totalChecklists > 0 && (
                  <div className="space-y-1 pt-1 border-t border-border/50">
                    <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                      <span>Checklist</span>
                      <span>{completedChecklists}/{totalChecklists}</span>
                    </div>
                    <div className="space-y-1">
                      {note.checklists.slice(0, 3).map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() => checklistMutation.mutate({ id: note._id, itemIndex: idx })}
                          className="flex items-center gap-1.5 text-[11px] cursor-pointer hover:text-primary transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={item.completed}
                            readOnly
                            className="rounded border-border text-primary cursor-pointer h-3 w-3 pointer-events-none"
                          />
                          <span className={`truncate ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}`}>
                            {item.text}
                          </span>
                        </div>
                      ))}
                      {totalChecklists > 3 && (
                        <span className="text-[10px] text-muted-foreground italic block">
                          +{totalChecklists - 3} more items...
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Footer Metadata */}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/40">
                  <span>
                    {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {note.submittedBy?.name && !isEmployee ? ` • by ${note.submittedBy.name}` : ''}
                  </span>
                  <span className="capitalize font-semibold">
                    {note.status === 'assigned' ? '✅ Assigned' : note.status === 'dismissed' ? 'Done' : '⏳ Pending'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-8 text-center bg-secondary/10 rounded-2xl border border-dashed border-border text-xs text-muted-foreground space-y-2">
          <StickyNote size={24} className="mx-auto text-muted-foreground/40" />
          <p className="font-semibold">No notes found.</p>
          <p className="text-[11px]">Use the template buttons above to log your first task change note or scratchpad.</p>
        </div>
      )}

      {/* Footer link to full dashboard */}
      {showLink && (
        <div className="pt-1 flex items-center justify-between text-xs border-t border-border/60">
          <span className="text-[11px] text-muted-foreground">
            {pinnedCount > 0 ? `📌 ${pinnedCount} pinned notes • ` : ''}
            {pendingCount} pending review
          </span>
          <Link
            to="/pending-notes"
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            <span>View All Notes & Boards</span>
            <ChevronRight size={13} />
          </Link>
        </div>
      )}

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
    </div>
  );
}

export default NotesWidget;
