import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  StickyNote,
  CheckSquare,
  Sparkles,
  Tag,
  Clock,
  Plus,
  Trash2,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  FolderKanban,
  Building2,
  Calendar,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { useTasks } from '../../hooks/useTasks';
import { useClients } from '../../hooks/useClients';
import { useProjects } from '../../hooks/useProjects';

export const NOTE_TEMPLATES = [
  {
    id: 'task_change',
    label: 'Task Change / Revision',
    icon: '📝',
    color: 'amber',
    category: 'task_change',
    scope: 'minor_tweak',
    priority: 'high',
    defaultTitle: 'Task Change: ',
    defaultDesc: 'Client/team requested modifications to the deliverables.\n\nKey Changes Required:\n- ',
    defaultChecklist: ['Review requested changes', 'Apply updates to draft', 'Internal QA check', 'Submit for re-approval'],
  },
  {
    id: 'client_feedback',
    label: 'Client Feedback',
    icon: '💬',
    color: 'blue',
    category: 'client_feedback',
    scope: 'minor_tweak',
    priority: 'medium',
    defaultTitle: 'Client Feedback: ',
    defaultDesc: 'Direct feedback received during client review/meeting.\n\nFeedback Summary:\n- ',
    defaultChecklist: ['Verify feedback scope', 'Implement client comments', 'Update client on completion'],
  },
  {
    id: 'scratchpad',
    label: 'Quick Scratchpad',
    icon: '⚡',
    color: 'emerald',
    category: 'scratchpad',
    scope: 'none',
    priority: 'medium',
    defaultTitle: '',
    defaultDesc: '',
    defaultChecklist: [],
  },
  {
    id: 'bug_fix',
    label: 'Bug / Issue Fix',
    icon: '🐛',
    color: 'rose',
    category: 'bug_fix',
    scope: 'minor_tweak',
    priority: 'urgent',
    defaultTitle: 'Fix: ',
    defaultDesc: 'Observed Issue:\n- \n\nExpected Result:\n- ',
    defaultChecklist: ['Reproduce issue', 'Implement fix', 'Verify fix in test', 'Deploy / update deliverable'],
  },
  {
    id: 'meeting_notes',
    label: 'Meeting Action Items',
    icon: '📋',
    color: 'purple',
    category: 'meeting_notes',
    scope: 'none',
    priority: 'medium',
    defaultTitle: 'Sync Notes: ',
    defaultDesc: 'Discussion Topics:\n- \n\nKey Decisions Made:\n- ',
    defaultChecklist: ['Share notes with team', 'Assign action items', 'Follow up before next sync'],
  },
];

export const NOTE_COLORS = [
  { id: 'default', label: 'Default', bg: 'bg-card border-border', dot: 'bg-muted-foreground' },
  { id: 'amber', label: 'Amber', bg: 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-100', dot: 'bg-amber-500' },
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-100', dot: 'bg-emerald-500' },
  { id: 'blue', label: 'Blue', bg: 'bg-blue-500/10 border-blue-500/30 text-blue-900 dark:text-blue-100', dot: 'bg-blue-500' },
  { id: 'purple', label: 'Purple', bg: 'bg-purple-500/10 border-purple-500/30 text-purple-900 dark:text-purple-100', dot: 'bg-purple-500' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-100', dot: 'bg-rose-500' },
];

export function TaskNoteModal({ open, onClose, onSubmit, initial = null, loading = false }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('task_change');
  const [changeScope, setChangeScope] = useState('minor_tweak');
  const [color, setColor] = useState('default');
  const [taskId, setTaskId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [clientId, setClientId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [checklists, setChecklists] = useState([]);
  const [newChecklistText, setNewChecklistText] = useState('');

  const { data: tasks = [] } = useTasks({}, { enabled: open });
  const { data: clients = [] } = useClients({}, { enabled: open });
  const { data: projects = [] } = useProjects({}, { enabled: open });

  useEffect(() => {
    if (initial) {
      setTitle(initial.title || '');
      setDescription(initial.description || initial.content || '');
      setPriority(initial.priority || 'medium');
      setCategory(initial.category || 'task_change');
      setChangeScope(initial.changeScope || 'minor_tweak');
      setColor(initial.color || 'default');
      setTaskId(initial.task?._id || initial.task || '');
      setProjectId(initial.project?._id || initial.project || '');
      setClientId(initial.client?._id || initial.client || '');
      setStartDate(initial.startDate ? new Date(initial.startDate).toISOString().split('T')[0] : '');
      setDeadline(initial.deadline ? new Date(initial.deadline).toISOString().split('T')[0] : '');
      setTags(initial.tags || []);
      setChecklists(initial.checklists || []);
    } else {
      setTitle('');
      setDescription('');
      setPriority('medium');
      setCategory('task_change');
      setChangeScope('minor_tweak');
      setColor('default');
      setTaskId('');
      setProjectId('');
      setClientId('');
      setStartDate('');
      setDeadline('');
      setTags([]);
      setChecklists([]);
    }
  }, [initial, open]);

  // When a task is selected, auto-fill project and client if available
  const handleTaskSelect = (tId) => {
    setTaskId(tId);
    if (!tId) return;
    const selected = tasks.find((t) => t._id === tId);
    if (selected) {
      if (selected.client?._id || selected.client) {
        setClientId(selected.client?._id || selected.client);
      }
      if (selected.project?._id || selected.project) {
        setProjectId(selected.project?._id || selected.project);
      }
      if (!title) {
        setTitle(`Notes on ${selected.title || selected.taskTitle}`);
      }
    }
  };

  const applyTemplate = (template) => {
    setCategory(template.category);
    setColor(template.color);
    setPriority(template.priority);
    setChangeScope(template.scope);
    if (!title || title.startsWith('Task Change:') || title.startsWith('Client Feedback:') || title.startsWith('Fix:') || title.startsWith('Sync Notes:')) {
      setTitle(template.defaultTitle);
    }
    if (!description) {
      setDescription(template.defaultDesc);
    }
    if (checklists.length === 0 && template.defaultChecklist.length > 0) {
      setChecklists(template.defaultChecklist.map((text) => ({ text, completed: false })));
    }
  };

  const handleAddTag = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = tagInput.trim().replace(/^#/, '');
      if (trimmed && !tags.includes(trimmed)) {
        setTags([...tags, trimmed]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (t) => {
    setTags(tags.filter((item) => item !== t));
  };

  const handleAddChecklist = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (newChecklistText.trim()) {
        setChecklists([...checklists, { text: newChecklistText.trim(), completed: false }]);
        setNewChecklistText('');
      }
    }
  };

  const handleRemoveChecklist = (index) => {
    setChecklists(checklists.filter((_, idx) => idx !== index));
  };

  const handleChecklistToggle = (index) => {
    setChecklists(
      checklists.map((item, idx) =>
        idx === index ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const payload = {
      title: title.trim(),
      description,
      priority,
      category,
      changeScope,
      color,
      task: taskId || null,
      project: projectId || null,
      client: clientId || null,
      startDate: startDate || null,
      deadline: deadline || null,
      tags,
      checklists,
    };

    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-border shadow-2xl max-w-2xl max-h-[90vh]">
        <DialogHeader className="px-6 py-4 sm:py-5 border-b border-border bg-card shrink-0 select-none flex flex-row items-center justify-between gap-4 m-0 space-y-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 shadow-2xs">
              <StickyNote size={20} />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground leading-tight truncate">
                {initial ? 'Edit Task Note / Change Log' : 'Create Task Note & Change Log'}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground mt-0.5 leading-normal">
                Record task revisions, client feedback, action checklists, or quick scratchpads
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
            {/* 1. Quick Template Selector (only when creating new) */}
            {!initial && (
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  Select Note Template
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {NOTE_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => applyTemplate(tmpl)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                        category === tmpl.category
                          ? 'border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30'
                          : 'border-border bg-secondary/30 text-foreground hover:bg-secondary hover:border-border/80'
                      }`}
                    >
                      <span className="text-base">{tmpl.icon}</span>
                      <span className="truncate">{tmpl.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Note Title */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                Note Title / Change Subject *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Revision: Update Instagram Hook & Thumbnail"
                className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs"
              />
            </div>

            {/* Linked Task */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                Link to Active Task (Optional)
              </label>
              <select
                value={taskId}
                onChange={(e) => handleTaskSelect(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs"
              >
                <option value="">-- No Linked Task --</option>
                {tasks.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.taskTitle || t.title} {t.clientName ? `(${t.clientName})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Linked Client */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                Client (Optional)
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs"
              >
                <option value="">-- No Client --</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.company ? `(${c.company})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs"
              >
                <option value="task_change">📝 Task Change</option>
                <option value="revision">🔄 Revision</option>
                <option value="client_feedback">💬 Client Feedback</option>
                <option value="bug_fix">🐛 Bug / Issue</option>
                <option value="feature_request">✨ Feature Request</option>
                <option value="meeting_notes">📋 Meeting Notes</option>
                <option value="scratchpad">⚡ Scratchpad</option>
                <option value="general">📌 General Note</option>
              </select>
            </div>

            {/* Change Scope */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Change Scope</label>
              <select
                value={changeScope}
                onChange={(e) => setChangeScope(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs"
              >
                <option value="minor_tweak">Minor Tweak (≤ 30 min)</option>
                <option value="major_overhaul">Major Overhaul (&gt; 2 hrs)</option>
                <option value="timeline_update">Timeline / Deadline Shift</option>
                <option value="scope_addition">New Scope / Deliverable</option>
                <option value="none">Standard Note / Idea</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs"
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🔵 Medium</option>
                <option value="high">🟠 High</option>
                <option value="urgent">🔴 Urgent</option>
              </select>
            </div>

            {/* Description / Content Body */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">
                Detailed Notes & Specifications
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail out the exact changes needed, client feedback verbatim, or links to assets..."
                className="w-full min-h-[110px] rounded-xl border border-border bg-background p-3.5 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs leading-relaxed resize-y"
              />
            </div>

            {/* Checklist Builder */}
            <div className="space-y-3 rounded-xl border border-border/80 bg-secondary/20 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <CheckSquare size={16} className="text-primary" />
                  <span>Action Checklist ({checklists.filter((c) => c.completed).length}/{checklists.length})</span>
                </span>
              </div>

              <div className="space-y-2">
                {checklists.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-card border border-border/60 text-sm">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => handleChecklistToggle(idx)}
                        className="rounded border-border text-primary cursor-pointer h-4 w-4"
                      />
                      <span className={`text-sm font-medium truncate ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {item.text}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveChecklist(idx)}
                      className="text-muted-foreground hover:text-destructive p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    onKeyDown={handleAddChecklist}
                    placeholder="Type an action item and press Enter..."
                    className="flex-1 h-11 rounded-xl border border-border bg-background px-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newChecklistText.trim()) {
                        setChecklists([...checklists, { text: newChecklistText.trim(), completed: false }]);
                        setNewChecklistText('');
                      }
                    }}
                    className="h-11 px-4 rounded-xl bg-secondary text-foreground text-sm font-bold hover:bg-secondary/80 flex items-center justify-center gap-1"
                  >
                    <Plus size={16} />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Note Card Highlight Color */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-2 block">Note Card Highlight Color</label>
              <div className="flex items-center gap-3">
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.label}
                    onClick={() => setColor(c.id)}
                    className={`h-8 w-8 rounded-full ${c.dot} transition-all flex items-center justify-center ${
                      color === c.id ? 'ring-2 ring-primary ring-offset-2 scale-110' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {color === c.id && <CheckCircle2 size={16} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="text-sm font-semibold text-foreground mb-1.5 block">Tags (Press Enter to add)</label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="e.g. revision, urgent, client-fix"
                className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 shadow-2xs"
              />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-secondary text-xs font-semibold text-muted-foreground"
                    >
                      #{t}
                      <button type="button" onClick={() => handleRemoveTag(t)} className="hover:text-destructive">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
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
                onClick={onClose}
                className="h-11 px-5 rounded-xl text-sm font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !title.trim()}
                className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/95 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/25 cursor-pointer transition-all flex items-center gap-2"
              >
                <Send size={15} />
                <span>{loading ? 'Saving Note...' : initial ? 'Update Note' : 'Save & Publish Note'}</span>
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default TaskNoteModal;
