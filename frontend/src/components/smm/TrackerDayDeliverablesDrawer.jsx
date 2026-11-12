import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  ListTodo,
  ExternalLink,
  Film,
  Image,
  Smartphone,
  Sparkles,
  Calendar,
  Building2,
  Check,
  ChevronRight,
  Share2,
  Layers,
  Info,
  Edit2,
  Save,
} from '@/components/ui/muiIcons';
import { toast } from 'sonner';

const TYPE_CONFIG = {
  reel: {
    label: 'Reel / Short',
    shortLabel: 'Reel',
    prefix: 'R',
    icon: Film,
    color: 'text-foreground',
    badge: 'bg-primary text-primary-foreground ',
    border: ' ',
  },
  post: {
    label: 'Feed Post / Graphic',
    shortLabel: 'Post',
    prefix: 'P',
    icon: Image,
    color: 'text-foreground',
    badge: 'bg-secondary text-foreground ',
    border: ' ',
  },
  story: {
    label: 'Story Update',
    shortLabel: 'Story',
    prefix: 'S',
    icon: Smartphone,
    color: 'text-muted-foreground',
    badge: 'bg-muted text-muted-foreground ',
    border: ' ',
  },
};

const STATUS_CONFIG = {
  todo: {
    label: 'TODO',
    icon: ListTodo,
    badge: 'bg-muted text-muted-foreground ',
  },
  pending: {
    label: 'PENDING',
    icon: Clock,
    badge: 'bg-secondary text-foreground ',
  },
  done: {
    label: 'DONE',
    icon: CheckCircle2,
    badge: 'bg-primary text-primary-foreground ',
  },
  skip: {
    label: 'SKIP',
    icon: X,
    badge: 'bg-muted/60 text-muted-foreground opacity-75',
  },
};

const COMMON_TIMES = ['09:00 AM', '12:30 PM', '06:30 PM', '07:30 PM', '08:30 PM', '09:30 PM'];

/**
 * Normalizes day items from cell data or creates default items from legacy postLabel/storyLabel
 */
export const extractDayItems = (dayCell = {}, section = 'posts') => {
  if (Array.isArray(dayCell.items) && dayCell.items.length > 0) {
    return dayCell.items.map((item, idx) => ({
      id: item.id || `item-${dayCell.day || 1}-${idx}-${Date.now()}`,
      type: item.type || (section === 'stories' ? 'story' : 'reel'),
      label: item.label || '',
      time: item.time || '',
      status: item.status || 'todo',
      title: item.title || '',
      note: item.note || '',
      driveLink: item.driveLink || '',
    }));
  }

  // Derive initial items from legacy fields if items array is empty
  const derived = [];
  const pLabel = (dayCell.postLabel || '').trim();
  const sLabel = (dayCell.storyLabel || '').trim();

  if (pLabel && !/^[-—–\s]+$/.test(pLabel)) {
    const isPost = pLabel.toUpperCase().startsWith('P');
    derived.push({
      id: `legacy-post-${dayCell.day || 1}`,
      type: isPost ? 'post' : 'reel',
      label: pLabel,
      time: pLabel.split(/[\s-]+/)[1] || '',
      status: dayCell.postStatus || 'todo',
      title: '',
      note: '',
      driveLink: '',
    });
  }

  if (sLabel && !/^[-—–\s]+$/.test(sLabel)) {
    derived.push({
      id: `legacy-story-${dayCell.day || 1}`,
      type: 'story',
      label: sLabel,
      time: sLabel.split(/[\s-]+/)[1] || '',
      status: dayCell.storyStatus || 'todo',
      title: '',
      note: '',
      driveLink: '',
    });
  }

  return derived;
};

export const TrackerDayDeliverablesDrawer = ({
  isOpen,
  onClose,
  client,
  dayNumber,
  monthName,
  year,
  dayOfWeek,
  isToday,
  dayCell,
  trackerId,
  onSaveCell,
}) => {
  const [items, setItems] = useState([]);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'reel' | 'post' | 'story'
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editing deliverable state
  const [editingItemId, setEditingItemId] = useState(null);
  const [editDraft, setEditDraft] = useState({
    type: 'reel',
    label: '',
    time: '',
    status: 'todo',
    title: '',
    note: '',
    driveLink: '',
  });

  // New item draft form state
  const [newType, setNewType] = useState('reel');
  const [newLabel, setNewLabel] = useState('');
  const [newTime, setNewTime] = useState('07:30 PM');
  const [newStatus, setNewStatus] = useState('todo');
  const [newTitle, setNewTitle] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newDriveLink, setNewDriveLink] = useState('');

  // Synchronize state when opened or when dayCell updates
  useEffect(() => {
    if (isOpen && dayCell) {
      const parsedItems = extractDayItems(dayCell);
      setItems(parsedItems);
      // Auto-expand add form if day has 0 items
      setShowAddForm(parsedItems.length === 0);
      setFilterType('all');
      setEditingItemId(null);
      setEditDraft({});
    }
  }, [isOpen, dayCell]);

  // Keyboard escape handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Suggested code generator based on existing items
  useEffect(() => {
    const typePrefix = TYPE_CONFIG[newType]?.prefix || 'R';
    const sameTypeCount = items.filter((it) => it.type === newType).length + 1;
    setNewLabel(`${typePrefix}${sameTypeCount} - ${newTime.replace(/[\s:APMapm]+/g, '')}`);
  }, [newType, newTime, items]);

  // Calculate sortout metrics
  const sortoutMetrics = useMemo(() => {
    const reels = items.filter((it) => it.type === 'reel');
    const posts = items.filter((it) => it.type === 'post');
    const stories = items.filter((it) => it.type === 'story');

    const reelsDone = reels.filter((r) => r.status === 'done').length;
    const postsDone = posts.filter((p) => p.status === 'done').length;
    const storiesDone = stories.filter((s) => s.status === 'done').length;
    const totalDone = reelsDone + postsDone + storiesDone;

    return {
      total: items.length,
      doneTotal: totalDone,
      reels: { total: reels.length, done: reelsDone, pending: reels.filter((r) => r.status === 'pending').length },
      posts: { total: posts.length, done: postsDone, pending: posts.filter((p) => p.status === 'pending').length },
      stories: { total: stories.length, done: storiesDone, pending: stories.filter((s) => s.status === 'pending').length },
      pct: items.length > 0 ? Math.round((totalDone / items.length) * 100) : 0,
    };
  }, [items]);

  // Filtered deliverables list
  const filteredItems = useMemo(() => {
    if (filterType === 'all') return items;
    return items.filter((it) => it.type === filterType);
  }, [items, filterType]);

  // Persist items changes to parent & backend
  const handlePersistItems = async (updatedItems) => {
    setItems(updatedItems);
    if (!onSaveCell || !dayNumber) return;

    setSaving(true);
    try {
      // Primary labels derived from items for main grid display
      const firstContent = updatedItems.find((it) => ['reel', 'post', 'video', 'carousel'].includes(it.type));
      const firstStory = updatedItems.find((it) => it.type === 'story');

      const contentItems = updatedItems.filter((it) => ['reel', 'post', 'video', 'carousel'].includes(it.type));
      const allContentDone = contentItems.length > 0 && contentItems.every((it) => it.status === 'done');
      const anyContentPending = contentItems.some((it) => it.status === 'pending');
      const resolvedContentStatus = allContentDone ? 'done' : anyContentPending ? 'pending' : (firstContent?.status || 'todo');

      const payload = {
        items: updatedItems,
        postLabel: firstContent ? firstContent.label : '',
        postStatus: firstContent ? resolvedContentStatus : 'todo',
        storyLabel: firstStory ? firstStory.label : '',
        storyStatus: firstStory ? firstStory.status : 'todo',
      };

      await onSaveCell(dayNumber, payload);
    } catch (err) {
      console.error('Failed to save day deliverables:', err);
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  // Status toggle on an individual deliverable
  const handleToggleItemStatus = (itemId) => {
    const cycle = { todo: 'pending', pending: 'done', done: 'skip', skip: 'todo' };
    const updated = items.map((it) => {
      if (it.id === itemId) {
        return { ...it, status: cycle[it.status || 'todo'] || 'pending' };
      }
      return it;
    });
    handlePersistItems(updated);
  };

  // Direct status select on an individual deliverable
  const handleSetItemStatus = (itemId, status) => {
    const updated = items.map((it) => {
      if (it.id === itemId) {
        return { ...it, status };
      }
      return it;
    });
    handlePersistItems(updated);
  };

  // Start inline editing of an item
  const handleStartEdit = (item) => {
    setEditingItemId(item.id);
    setEditDraft({
      type: item.type || 'reel',
      label: item.label || '',
      time: item.time || '',
      status: item.status || 'todo',
      title: item.title || '',
      note: item.note || '',
      driveLink: item.driveLink || '',
    });
  };

  // Cancel inline editing
  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditDraft({});
  };

  // Save inline edit changes
  const handleSaveEdit = (e) => {
    if (e) e.preventDefault();
    if (!editDraft.label || !editDraft.label.trim()) {
      toast.error('Please enter a label / code (e.g. R2 7:30P)');
      return;
    }

    const updated = items.map((it) => {
      if (it.id === editingItemId) {
        return {
          ...it,
          type: editDraft.type || it.type,
          label: editDraft.label.trim(),
          time: editDraft.time ? editDraft.time.trim() : '',
          status: editDraft.status || 'todo',
          title: editDraft.title ? editDraft.title.trim() : '',
          note: editDraft.note ? editDraft.note.trim() : '',
          driveLink: editDraft.driveLink ? editDraft.driveLink.trim() : '',
        };
      }
      return it;
    });

    handlePersistItems(updated);
    setEditingItemId(null);
    setEditDraft({});
    toast.success('Deliverable updated successfully!');
  };

  // Delete a deliverable from this date
  const handleDeleteItem = (itemId) => {
    if (editingItemId === itemId) {
      setEditingItemId(null);
      setEditDraft({});
    }
    const updated = items.filter((it) => it.id !== itemId);
    handlePersistItems(updated);
    toast.success('Deliverable removed from day');
  };

  // Add new deliverable to this date
  const handleAddNewItem = (e) => {
    e.preventDefault();
    if (!newLabel.trim()) {
      toast.error('Please enter a label / code (e.g. R2 7:30P)');
      return;
    }

    const newItem = {
      id: `item-${dayNumber}-${Date.now()}`,
      type: newType,
      label: newLabel.trim(),
      time: newTime.trim(),
      status: newStatus,
      title: newTitle.trim(),
      note: newNote.trim(),
      driveLink: newDriveLink.trim(),
    };

    const updated = [...items, newItem];
    handlePersistItems(updated);
    toast.success(`Added ${TYPE_CONFIG[newType]?.shortLabel || 'Deliverable'} for Day ${dayNumber}!`);

    // Reset draft fields
    setNewTitle('');
    setNewNote('');
    setNewDriveLink('');
    setShowAddForm(false);
  };

  if (!isOpen) return null;

  const clientName = client?.companyName || client?.name || 'Client';

  return createPortal(
    <div
      className="fixed inset-0 z-[999] flex justify-end bg-black/60 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex h-full w-full max-w-full sm:max-w-xl md:max-w-2xl flex-col bg-card animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 1. Drawer Header ── */}
        <div className="flex items-center justify-between px-5 py-4 bg-secondary/40 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-sm">
              {clientName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-foreground truncate">
                  {clientName}
                </h2>
                {isToday && (
                  <span className="rounded-md bg-primary px-1.5 py-0.5 text-[9px] font-black uppercase text-primary-foreground tracking-wider shrink-0">
                    TODAY LIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5 tabular-nums">
                <Calendar size={12} className="text-foreground shrink-0" />
                <span>
                  {dayOfWeek}, {monthName} {dayNumber}, {year} &nbsp;•&nbsp; Day {dayNumber}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {saving && (
              <span className="text-[11px] text-muted-foreground font-semibold">
                Saving...
              </span>
            )}
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
              title="Close drawer (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── 2. Scrollable Body Content ── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-6 custom-scrollbar">

          {/* ── Sortout Metric Cards (Reels / Posts / Stories Counts) ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-foreground">
              <span className="uppercase tracking-wider text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Sparkles size={13} className="text-foreground shrink-0" />
                Day Deliverables Breakdown
              </span>
              <span className="tabular-nums">
                {sortoutMetrics.doneTotal} of {sortoutMetrics.total} Complete ({sortoutMetrics.pct}%)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 tabular-nums">
              {/* Reels Stat Card */}
              <div className="rounded-2xl bg-secondary/40 p-3">
                <div className="flex items-center justify-between text-foreground">
                  <span className="text-xs font-bold flex items-center gap-1">
                    <Film size={13} className="shrink-0" /> Reels
                  </span>
                  <span className="text-lg font-black">{sortoutMetrics.reels.total}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="text-foreground font-bold inline-flex items-center gap-1">
                    <Check size={10} /> {sortoutMetrics.reels.done} Done
                  </span>
                  <span>{sortoutMetrics.reels.total - sortoutMetrics.reels.done} Left</span>
                </div>
              </div>

              {/* Posts Stat Card */}
              <div className="rounded-2xl bg-secondary/40 p-3">
                <div className="flex items-center justify-between text-foreground">
                  <span className="text-xs font-bold flex items-center gap-1">
                    <Image size={13} className="shrink-0" /> Posts
                  </span>
                  <span className="text-lg font-black">{sortoutMetrics.posts.total}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="text-foreground font-bold inline-flex items-center gap-1">
                    <Check size={10} /> {sortoutMetrics.posts.done} Done
                  </span>
                  <span>{sortoutMetrics.posts.total - sortoutMetrics.posts.done} Left</span>
                </div>
              </div>

              {/* Stories Stat Card */}
              <div className="rounded-2xl bg-secondary/40 p-3">
                <div className="flex items-center justify-between text-foreground">
                  <span className="text-xs font-bold flex items-center gap-1">
                    <Smartphone size={13} className="shrink-0" /> Stories
                  </span>
                  <span className="text-lg font-black">{sortoutMetrics.stories.total}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="text-foreground font-bold inline-flex items-center gap-1">
                    <Check size={10} /> {sortoutMetrics.stories.done} Done
                  </span>
                  <span>{sortoutMetrics.stories.total - sortoutMetrics.stories.done} Left</span>
                </div>
              </div>
            </div>

            {/* Overall Day Progress Bar */}
            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${sortoutMetrics.pct}%` }}
              />
            </div>
          </div>

          {/* ── 3. Deliverables Header & Filter Tabs ── */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 ">
            <div className="flex items-center gap-1.5 p-1 bg-secondary rounded-xl text-xs font-bold tabular-nums">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-primary text-primary-foreground '
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('reel')}
                className={`px-2.5 py-1 rounded-lg transition-all inline-flex items-center gap-1 cursor-pointer ${
                  filterType === 'reel'
                    ? 'bg-primary text-primary-foreground '
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                }`}
              >
                <Film size={11} /> Reels ({sortoutMetrics.reels.total})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('post')}
                className={`px-2.5 py-1 rounded-lg transition-all inline-flex items-center gap-1 cursor-pointer ${
                  filterType === 'post'
                    ? 'bg-primary text-primary-foreground '
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                }`}
              >
                <Image size={11} /> Posts ({sortoutMetrics.posts.total})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('story')}
                className={`px-2.5 py-1 rounded-lg transition-all inline-flex items-center gap-1 cursor-pointer ${
                  filterType === 'story'
                    ? 'bg-primary text-primary-foreground '
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                }`}
              >
                <Smartphone size={11} /> Stories ({sortoutMetrics.stories.total})
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Add Extra Deliverable</span>
            </button>
          </div>

          {/* ── 4. Add Deliverable Form (Expandable) ── */}
          {showAddForm && (
            <form
              onSubmit={handleAddNewItem}
              className="rounded-2xl bg-secondary/40 p-4 space-y-3.5 animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between pb-1">
                <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Plus size={14} /> Add New Deliverable for Day {dayNumber}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {/* Type Switcher */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'reel', label: 'Reel', icon: Film, desc: 'Short Video' },
                  { id: 'post', label: 'Post', icon: Image, desc: 'Feed / Graphic' },
                  { id: 'story', label: 'Story', icon: Smartphone, desc: '24hr Story' },
                ].map((t) => {
                  const IconComp = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setNewType(t.id)}
                      className={`rounded-xl p-2 text-center text-xs font-bold transition-all cursor-pointer ${
                        newType === t.id
                          ? ' bg-primary text-primary-foreground '
                          : ' bg-card text-muted-foreground hover:text-foreground hover:bg-secondary'
                      }`}
                    >
                      <div className="inline-flex items-center justify-center gap-1.5">
                        <IconComp size={13} />
                        <span>{t.label}</span>
                      </div>
                      <div className="text-[10px] font-normal opacity-75">{t.desc}</div>
                    </button>
                  );
                })}
              </div>

              {/* Label Code & Posting Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Label Code (e.g. R2 7:30P)
                  </label>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="e.g. R2 7:30P"
                    className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-ring/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Scheduled Time
                  </label>
                  <input
                    type="text"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    placeholder="07:30 PM"
                    className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-ring/20 tabular-nums"
                  />
                  {/* Quick Time Pills */}
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {COMMON_TIMES.slice(0, 4).map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setNewTime(time)}
                        className="rounded-md bg-card px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer tabular-nums"
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Initial Status & Topic */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Initial Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="app-select h-11 bg-background px-4 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-brand/40 cursor-pointer"
                  >
                    <option value="todo">TODO</option>
                    <option value="pending">PENDING</option>
                    <option value="done">DONE</option>
                    <option value="skip">SKIP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Topic / Concept (Optional)
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Behind the scenes reel"
                    className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-brand/40"
                  />
                </div>
              </div>

              {/* Drive Link & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Google Drive / Asset Link
                  </label>
                  <input
                    type="url"
                    value={newDriveLink}
                    onChange={(e) => setNewDriveLink(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-brand/40"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">
                    Caption / Notes
                  </label>
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Caption copy or instructions"
                    className="h-11 w-full rounded-xl bg-background px-4 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-brand/40"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground hover:bg-primary/95 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add to Day {dayNumber}</span>
                </button>
              </div>
            </form>
          )}

          {/* ── 5. Deliverables List ── */}
          <div className="space-y-3">
            {filteredItems.length === 0 ? (
              <div className="rounded-2xl p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground mb-3">
                  <Layers size={22} />
                </div>
                <h4 className="text-sm font-bold text-foreground">
                  No deliverables scheduled for Day {dayNumber}
                </h4>
                <p className="mt-1 text-xs text-muted-foreground max-w-xs mx-auto">
                  Click the button above to add a Reel, Post, or Story for this date.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Add First Deliverable</span>
                </button>
              </div>
            ) : (
              filteredItems.map((item, index) => {
                const isEditing = editingItemId === item.id;
                const typeCfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.reel;
                const statusCfg = STATUS_CONFIG[item.status || 'todo'] || STATUS_CONFIG.todo;
                const TypeIcon = typeCfg.icon;
                const StatusIcon = statusCfg.icon;

                if (isEditing) {
                  return (
                    <form
                      key={item.id || index}
                      onSubmit={handleSaveEdit}
                      className="rounded-2xl bg-card p-4 shadow-lg space-y-3.5 animate-in fade-in duration-200"
                    >
                      {/* Edit Header */}
                      <div className="flex items-center justify-between pb-2">
                        <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          <Edit2 size={14} /> Edit Deliverable
                        </span>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="text-xs text-muted-foreground hover:text-foreground font-semibold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      {/* Type Switcher */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'reel', label: 'Reel', icon: Film, desc: 'Short Video' },
                          { id: 'post', label: 'Post', icon: Image, desc: 'Feed / Graphic' },
                          { id: 'story', label: 'Story', icon: Smartphone, desc: '24hr Story' },
                        ].map((t) => {
                          const IconComp = t.icon;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setEditDraft((prev) => ({ ...prev, type: t.id }))}
                              className={`rounded-xl p-2 text-center text-xs font-bold transition-all cursor-pointer ${
                                editDraft.type === t.id
                                  ? ' bg-primary text-primary-foreground '
                                  : ' bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary'
                              }`}
                            >
                              <div className="inline-flex items-center justify-center gap-1.5">
                                <IconComp size={13} />
                                <span>{t.label}</span>
                              </div>
                              <div className="text-[10px] font-normal opacity-75">{t.desc}</div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Label Code & Posting Time */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-1.5">
                            Label Code (e.g. R2 7:30P)
                          </label>
                          <input
                            type="text"
                            value={editDraft.label || ''}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, label: e.target.value }))}
                            placeholder="e.g. R2 7:30P"
                            className="h-11 w-full rounded-xl bg-secondary/75 px-4 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-ring/20"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-1.5">
                            Scheduled Time
                          </label>
                          <input
                            type="text"
                            value={editDraft.time || ''}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, time: e.target.value }))}
                            placeholder="07:30 PM"
                            className="h-11 w-full rounded-xl bg-secondary/75 px-4 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-ring/20 tabular-nums"
                          />
                          {/* Quick Time Pills */}
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {COMMON_TIMES.slice(0, 4).map((time) => (
                              <button
                                key={time}
                                type="button"
                                onClick={() => setEditDraft((prev) => ({ ...prev, time }))}
                                className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer tabular-nums"
                              >
                                {time}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Status & Topic */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-1.5">
                            Status
                          </label>
                          <select
                            value={editDraft.status || 'todo'}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, status: e.target.value }))}
                            className="app-select h-11 px-4 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-brand/40 cursor-pointer"
                          >
                            <option value="todo">TODO</option>
                            <option value="pending">PENDING</option>
                            <option value="done">DONE</option>
                            <option value="skip">SKIP</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-1.5">
                            Topic / Concept (Optional)
                          </label>
                          <input
                            type="text"
                            value={editDraft.title || ''}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, title: e.target.value }))}
                            placeholder="e.g. Behind the scenes reel"
                            className="h-11 w-full rounded-xl bg-secondary/75 px-4 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-brand/40"
                          />
                        </div>
                      </div>

                      {/* Drive Link & Notes */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-1.5">
                            Google Drive / Asset Link
                          </label>
                          <input
                            type="url"
                            value={editDraft.driveLink || ''}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, driveLink: e.target.value }))}
                            placeholder="https://drive.google.com/..."
                            className="h-11 w-full rounded-xl bg-secondary/75 px-4 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-brand/40"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-foreground mb-1.5">
                            Caption / Notes
                          </label>
                          <input
                            type="text"
                            value={editDraft.note || ''}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, note: e.target.value }))}
                            placeholder="Caption copy or instructions"
                            className="h-11 w-full rounded-xl bg-secondary/75 px-4 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-brand/40"
                          />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-secondary px-4 text-sm font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                          title="Delete this deliverable"
                        >
                          <Trash2 size={14} />
                          <span>Delete Deliverable</span>
                        </button>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="h-11 rounded-xl bg-secondary px-5 text-sm font-semibold text-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/95 transition-all cursor-pointer"
                          >
                            <Save size={14} />
                            <span>Save Changes</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  );
                }

                return (
                  <div
                    key={item.id || index}
                    className={`rounded-2xl bg-card p-4 transition-all ${typeCfg.border}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: Type Badge, Label, Time */}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-xs font-black uppercase tracking-wider ${typeCfg.badge}`}
                          >
                            <TypeIcon size={12} />
                            <span>{typeCfg.shortLabel}</span>
                          </span>

                          <span className="text-sm font-extrabold text-foreground">
                            {item.label || `${typeCfg.prefix}${index + 1}`}
                          </span>

                          {item.time && (
                            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1 tabular-nums">
                              <Clock size={11} className="text-foreground shrink-0" />
                              {item.time}
                            </span>
                          )}
                        </div>

                        {item.title && (
                          <p className="text-xs font-bold text-foreground">
                            {item.title}
                          </p>
                        )}

                        {item.note && (
                          <p className="text-xs text-muted-foreground">
                            {item.note}
                          </p>
                        )}

                        {item.driveLink && (
                          <div className="pt-1">
                            <a
                              href={item.driveLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-foreground hover:text-muted-foreground underline underline-offset-2"
                            >
                              <ExternalLink size={11} />
                              <span>Open Google Drive Footage / Asset</span>
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Right: Status Pill, Edit & Delete Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Status Switcher Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleItemStatus(item.id)}
                          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold transition-all cursor-pointer select-none ${statusCfg.badge}`}
                          title="Click to cycle status (TODO → PENDING → DONE → SKIP)"
                        >
                          <StatusIcon size={12} />
                          <span>{statusCfg.label}</span>
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                          title="Edit deliverable"
                        >
                          <Edit2 size={13} />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
                          title="Delete deliverable"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── 6. Drawer Sticky Footer ── */}
        <div className="px-5 py-3.5 bg-secondary/40 flex items-center justify-between shrink-0">
          <div className="text-xs text-muted-foreground font-medium tabular-nums">
            Total on Day {dayNumber}: <strong className="text-foreground font-bold">{items.length} deliverables</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-secondary px-4 py-2 text-xs font-bold text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            Done & Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TrackerDayDeliverablesDrawer;
