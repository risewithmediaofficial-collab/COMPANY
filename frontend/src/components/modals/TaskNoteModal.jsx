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
} from '../ui/dialog';
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
      <DialogContent size="lg" className="max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar p-6">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <StickyNote size={18} />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                {initial ? 'Edit Task Note / Change Log' : 'Create Task Note & Change Log'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Record task revisions, client feedback, action checklists, or quick scratchpads.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* 1. Quick Template Selector (only when creating new) */}
        {!initial && (
          <div className="pt-2">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
              Select Note Template:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {NOTE_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => applyTemplate(tmpl)}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold text-left transition-all ${
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

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Note Title */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Note Title / Change Subject *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Revision: Update Instagram Hook & Thumbnail"
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>

          {/* Linked Task & Client Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Link to Active Task (Optional)
              </label>
              <select
                value={taskId}
                onChange={(e) => handleTaskSelect(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                <option value="">-- No Linked Task --</option>
                {tasks.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.taskTitle || t.title} {t.clientName ? `(${t.clientName})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">
                Client (Optional)
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              >
                <option value="">-- No Client --</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.company ? `(${c.company})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category & Scope & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-primary"
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

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Change Scope</label>
              <select
                value={changeScope}
                onChange={(e) => setChangeScope(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-primary"
              >
                <option value="minor_tweak">Minor Tweak (≤ 30 min)</option>
                <option value="major_overhaul">Major Overhaul (&gt; 2 hrs)</option>
                <option value="timeline_update">Timeline / Deadline Shift</option>
                <option value="scope_addition">New Scope / Deliverable</option>
                <option value="none">Standard Note / Idea</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-primary"
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🔵 Medium</option>
                <option value="high">🟠 High</option>
                <option value="urgent">🔴 Urgent</option>
              </select>
            </div>
          </div>

          {/* Description / Content Body */}
          <div>
            <label className="block text-xs font-bold text-foreground mb-1">
              Detailed Notes & Specifications
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail out the exact changes needed, client feedback verbatim, or links to assets..."
              className="w-full rounded-xl border border-border bg-background p-3 text-xs font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 leading-relaxed"
            />
          </div>

          {/* Checklist Builder */}
          <div className="space-y-2 rounded-xl border border-border/80 bg-secondary/20 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <CheckSquare size={13} className="text-primary" />
                <span>Action Checklist ({checklists.filter((c) => c.completed).length}/{checklists.length})</span>
              </span>
            </div>

            <div className="space-y-1.5">
              {checklists.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-card border border-border/60 text-xs">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={item.completed}
                      onChange={() => handleChecklistToggle(idx)}
                      className="rounded border-border text-primary cursor-pointer h-3.5 w-3.5"
                    />
                    <span className={`text-xs font-medium truncate ${item.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {item.text}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveChecklist(idx)}
                    className="text-muted-foreground hover:text-destructive p-0.5"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}

              <div className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  onKeyDown={handleAddChecklist}
                  placeholder="Type an action item and press Enter..."
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newChecklistText.trim()) {
                      setChecklists([...checklists, { text: newChecklistText.trim(), completed: false }]);
                      setNewChecklistText('');
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-bold hover:bg-secondary/80"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Color Accent & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-foreground mb-1.5">Note Card Highlight Color</label>
              <div className="flex items-center gap-2">
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    title={c.label}
                    onClick={() => setColor(c.id)}
                    className={`h-6 w-6 rounded-full ${c.dot} transition-all flex items-center justify-center ${
                      color === c.id ? 'ring-2 ring-primary ring-offset-2 scale-110' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {color === c.id && <CheckCircle2 size={12} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-foreground mb-1">Tags (Press Enter to add)</label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="e.g. revision, urgent, client-fix"
                className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
              />
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-[10px] font-bold text-muted-foreground"
                    >
                      #{t}
                      <button type="button" onClick={() => handleRemoveTag(t)} className="hover:text-destructive">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shadow-sm disabled:opacity-50"
            >
              <Send size={13} />
              <span>{loading ? 'Saving Note...' : initial ? 'Update Note' : 'Save & Publish Note'}</span>
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default TaskNoteModal;
