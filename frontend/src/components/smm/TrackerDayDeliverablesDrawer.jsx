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
} from 'lucide-react';
import toast from 'react-hot-toast';

const TYPE_CONFIG = {
  reel: {
    label: 'Reel / Short',
    shortLabel: 'Reel',
    prefix: 'R',
    icon: Film,
    color: 'text-fuchsia-600 dark:text-fuchsia-400',
    badge: 'bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20 dark:text-fuchsia-300',
    border: 'border-l-4 border-l-fuchsia-500',
    gradient: 'from-fuchsia-500/20 to-purple-500/5',
  },
  post: {
    label: 'Feed Post / Graphic',
    shortLabel: 'Post',
    prefix: 'P',
    icon: Image,
    color: 'text-sky-600 dark:text-sky-400',
    badge: 'bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-300',
    border: 'border-l-4 border-l-sky-500',
    gradient: 'from-sky-500/20 to-blue-500/5',
  },
  story: {
    label: 'Story Update',
    shortLabel: 'Story',
    prefix: 'S',
    icon: Smartphone,
    color: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-300',
    border: 'border-l-4 border-l-emerald-500',
    gradient: 'from-emerald-500/20 to-teal-500/5',
  },
};

const STATUS_CONFIG = {
  todo: {
    label: 'TODO',
    icon: ListTodo,
    badge: 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
  },
  pending: {
    label: 'PENDING',
    icon: Clock,
    badge: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  },
  done: {
    label: 'DONE',
    icon: CheckCircle2,
    badge: 'bg-emerald-600 text-white border-emerald-600 shadow-xs shadow-emerald-500/20',
  },
  skip: {
    label: 'SKIP',
    icon: X,
    badge: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
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
        postLabel: firstContent ? firstContent.label : (updatedItems.length === 0 ? '' : undefined),
        postStatus: firstContent ? resolvedContentStatus : (updatedItems.length === 0 ? 'todo' : undefined),
        storyLabel: firstStory ? firstStory.label : (updatedItems.length === 0 ? '' : undefined),
        storyStatus: firstStory ? firstStory.status : (updatedItems.length === 0 ? 'todo' : undefined),
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

  // Delete a deliverable from this date
  const handleDeleteItem = (itemId) => {
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
      className="fixed inset-0 z-[999] flex justify-end bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex h-full w-full max-w-full sm:max-w-xl md:max-w-2xl flex-col bg-white shadow-2xl dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 1. Drawer Header ── */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-black text-sm shadow-md shadow-indigo-500/20">
              {clientName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                  {clientName}
                </h2>
                {isToday && (
                  <span className="rounded-md bg-rose-500 px-1.5 py-0.5 text-[9px] font-black uppercase text-white tracking-wider">
                    ● TODAY LIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Calendar size={12} className="text-indigo-500" />
                <span>
                  {dayOfWeek}, {monthName} {dayNumber}, {year} &nbsp;•&nbsp; Day {dayNumber}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saving && (
              <span className="text-[11px] text-indigo-500 font-semibold animate-pulse">
                Saving...
              </span>
            )}
            <button
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
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
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Sparkles size={13} className="text-indigo-500" />
                Day Deliverables Breakdown
              </span>
              <span>
                {sortoutMetrics.doneTotal} of {sortoutMetrics.total} Complete ({sortoutMetrics.pct}%)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {/* Reels Stat Card */}
              <div className="rounded-2xl border border-fuchsia-200 bg-gradient-to-br from-fuchsia-500/10 to-transparent p-3 dark:border-fuchsia-900/50">
                <div className="flex items-center justify-between text-fuchsia-600 dark:text-fuchsia-400">
                  <span className="text-xs font-bold flex items-center gap-1">
                    <Film size={13} /> Reels
                  </span>
                  <span className="text-lg font-black">{sortoutMetrics.reels.total}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    ✓ {sortoutMetrics.reels.done} Done
                  </span>
                  <span>{sortoutMetrics.reels.total - sortoutMetrics.reels.done} Left</span>
                </div>
              </div>

              {/* Posts Stat Card */}
              <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-500/10 to-transparent p-3 dark:border-sky-900/50">
                <div className="flex items-center justify-between text-sky-600 dark:text-sky-400">
                  <span className="text-xs font-bold flex items-center gap-1">
                    <Image size={13} /> Posts
                  </span>
                  <span className="text-lg font-black">{sortoutMetrics.posts.total}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    ✓ {sortoutMetrics.posts.done} Done
                  </span>
                  <span>{sortoutMetrics.posts.total - sortoutMetrics.posts.done} Left</span>
                </div>
              </div>

              {/* Stories Stat Card */}
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-500/10 to-transparent p-3 dark:border-emerald-900/50">
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                  <span className="text-xs font-bold flex items-center gap-1">
                    <Smartphone size={13} /> Stories
                  </span>
                  <span className="text-lg font-black">{sortoutMetrics.stories.total}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    ✓ {sortoutMetrics.stories.done} Done
                  </span>
                  <span>{sortoutMetrics.stories.total - sortoutMetrics.stories.done} Left</span>
                </div>
              </div>
            </div>

            {/* Overall Day Progress Bar */}
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden dark:bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-emerald-500 to-teal-400 transition-all duration-300"
                style={{ width: `${sortoutMetrics.pct}%` }}
              />
            </div>
          </div>

          {/* ── 3. Deliverables Header & Filter Tabs ── */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl dark:bg-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterType === 'all'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                All ({items.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('reel')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  filterType === 'reel'
                    ? 'bg-fuchsia-600 text-white shadow-xs'
                    : 'text-fuchsia-600 dark:text-fuchsia-400 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-950/40'
                }`}
              >
                <Film size={11} /> Reels ({sortoutMetrics.reels.total})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('post')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  filterType === 'post'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40'
                }`}
              >
                <Image size={11} /> Posts ({sortoutMetrics.posts.total})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('story')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                  filterType === 'story'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                }`}
              >
                <Smartphone size={11} /> Stories ({sortoutMetrics.stories.total})
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowAddForm((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-indigo-600/30 hover:bg-indigo-500 transition-all cursor-pointer"
            >
              <Plus size={14} className="stroke-[2.5]" />
              <span>+ Add Extra Deliverable</span>
            </button>
          </div>

          {/* ── 4. Add Deliverable Form (Expandable) ── */}
          {showAddForm && (
            <form
              onSubmit={handleAddNewItem}
              className="rounded-2xl border-2 border-indigo-500/30 bg-indigo-50/40 p-4 dark:bg-indigo-950/20 space-y-3.5 animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between pb-1 border-b border-indigo-200/50 dark:border-indigo-800/50">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                  <Plus size={13} className="stroke-[3]" /> Add New Deliverable for Day {dayNumber}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  Cancel
                </button>
              </div>

              {/* Type Switcher */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'reel', label: '🎬 Reel', desc: 'Short Video' },
                  { id: 'post', label: '🖼️ Post', desc: 'Feed / Graphic' },
                  { id: 'story', label: '📱 Story', desc: '24hr Story' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setNewType(t.id)}
                    className={`rounded-xl border p-2 text-center text-xs font-bold transition-all ${
                      newType === t.id
                        ? 'border-indigo-600 bg-white shadow-xs text-indigo-700 ring-2 ring-indigo-500/20 dark:bg-slate-800 dark:text-white'
                        : 'border-slate-200 bg-white/60 text-slate-600 hover:bg-white dark:border-slate-700 dark:bg-slate-900/60'
                    }`}
                  >
                    <div>{t.label}</div>
                    <div className="text-[10px] font-normal opacity-70">{t.desc}</div>
                  </button>
                ))}
              </div>

              {/* Label Code & Posting Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Label Code (e.g. R2 7:30P)
                  </label>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="e.g. R2 7:30P"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Scheduled Time
                  </label>
                  <input
                    type="text"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    placeholder="07:30 PM"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  {/* Quick Time Pills */}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {COMMON_TIMES.slice(0, 4).map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setNewTime(time)}
                        className="rounded-md bg-white border border-slate-200 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 hover:border-indigo-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Initial Status & Topic */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white cursor-pointer"
                  >
                    <option value="todo">📋 TODO</option>
                    <option value="pending">⏳ PENDING</option>
                    <option value="done">✅ DONE</option>
                    <option value="skip">⏭ SKIP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Topic / Concept (Optional)
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Behind the scenes reel"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Drive Link & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Google Drive / Asset Link
                  </label>
                  <input
                    type="url"
                    value={newDriveLink}
                    onChange={(e) => setNewDriveLink(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Caption / Notes
                  </label>
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Caption copy or instructions"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition-all cursor-pointer"
                >
                  <Plus size={14} className="stroke-[3]" />
                  <span>Add to Day {dayNumber}</span>
                </button>
              </div>
            </form>
          )}

          {/* ── 5. Deliverables List ── */}
          <div className="space-y-3">
            {filteredItems.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center dark:border-slate-800">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 mb-3">
                  <Layers size={22} />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No deliverables scheduled for Day {dayNumber}
                </h4>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Click the button above to add a Reel, Post, or Story for this date.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-500 transition-all"
                >
                  <Plus size={14} className="stroke-[2.5]" />
                  <span>+ Add First Deliverable</span>
                </button>
              </div>
            ) : (
              filteredItems.map((item, index) => {
                const typeCfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.reel;
                const statusCfg = STATUS_CONFIG[item.status || 'todo'] || STATUS_CONFIG.todo;
                const TypeIcon = typeCfg.icon;
                const StatusIcon = statusCfg.icon;

                return (
                  <div
                    key={item.id || index}
                    className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 ${typeCfg.border}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: Type Badge, Label, Time */}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.5 text-xs font-black uppercase tracking-wider border ${typeCfg.badge}`}
                          >
                            <TypeIcon size={12} />
                            <span>{typeCfg.shortLabel}</span>
                          </span>

                          <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {item.label || `${typeCfg.prefix}${index + 1}`}
                          </span>

                          {item.time && (
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <Clock size={11} className="text-indigo-500" />
                              {item.time}
                            </span>
                          )}
                        </div>

                        {item.title && (
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {item.title}
                          </p>
                        )}

                        {item.note && (
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {item.note}
                          </p>
                        )}

                        {item.driveLink && (
                          <div className="pt-1">
                            <a
                              href={item.driveLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 underline underline-offset-2"
                            >
                              <ExternalLink size={11} />
                              <span>Open Google Drive Footage / Asset</span>
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Right: Status Pill & Delete Button */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Status Switcher Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleItemStatus(item.id)}
                          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-bold transition-all cursor-pointer select-none ${statusCfg.badge}`}
                          title="Click to cycle status (TODO → PENDING → DONE → SKIP)"
                        >
                          <StatusIcon size={12} />
                          <span>{statusCfg.label}</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
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
        <div className="border-t border-slate-200 px-5 py-3.5 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Total on Day {dayNumber}: <strong className="text-slate-900 dark:text-white font-bold">{items.length} deliverables</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
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
