// =============================================
// WEEKLY TODOS WIDGET
// Interactive Weekly Todo List with Day-by-Day breakdowns,
// Manager/Admin assignment & Employee/Intern personal todos,
// completion metrics, and fast inline addition.
// =============================================

import React, { useState, useMemo } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  User,
  Filter,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  Sparkles,
  Search,
  Flag,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  useWeeklyTodos,
  useCreateWeeklyTodo,
  useUpdateWeeklyTodo,
  useToggleWeeklyTodo,
  useDeleteWeeklyTodo,
} from '../../hooks/useWeeklyTodos';
import { useUsers } from '../../hooks/useUsers';
import { WeeklyTodoModal } from '../modals/WeeklyTodoModal';
import { AppTooltip } from '../ui/tooltip';

const DAYS = [
  'All Days',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
  'Weekly Target',
];

const PRIORITY_BADGES = {
  urgent: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  high: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  medium: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  low: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
};

const CATEGORY_ICONS = {
  general: '📋',
  client: '🏢',
  dev: '💻',
  content: '🎨',
  meeting: '📞',
  review: '🔍',
  urgent: '🔥',
};

/**
 * Calculates Monday of current week in YYYY-MM-DD
 */
const getMondayDate = (baseDate = new Date()) => {
  const d = new Date(baseDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDateLabel = (d) => {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export function WeeklyTodosWidget({ isManagerOrAdmin = false, user = null }) {
  // Current week offset (0 = current week, -1 = last week, +1 = next week)
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState('All Days');
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, completed
  const [assigneeFilter, setAssigneeFilter] = useState('all'); // for manager/admin: 'all', 'mine', or user._id
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTodoId, setExpandedTodoId] = useState(null);

  // Quick inline add state
  const [quickTitle, setQuickTitle] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);

  // Calculate selected week's Monday and Sunday
  const monday = useMemo(() => {
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);
    return getMondayDate(base);
  }, [weekOffset]);

  const sunday = useMemo(() => {
    const sun = new Date(monday);
    sun.setDate(sun.getDate() + 6);
    return sun;
  }, [monday]);

  const weekStartDateIso = useMemo(() => {
    return monday.toISOString().split('T')[0];
  }, [monday]);

  // Query parameters
  const queryParams = useMemo(() => {
    const params = {
      weekStartDate: weekStartDateIso,
    };
    if (isManagerOrAdmin) {
      if (assigneeFilter === 'mine') {
        params.mine = 'true';
      } else if (assigneeFilter !== 'all') {
        params.assignedTo = assigneeFilter;
      }
    }
    return params;
  }, [weekStartDateIso, isManagerOrAdmin, assigneeFilter]);

  // Queries & Mutations
  const { data: todosData, isLoading } = useWeeklyTodos(queryParams);
  const { data: teamUsers = [] } = useUsers({ enabled: isManagerOrAdmin });
  const createTodo = useCreateWeeklyTodo();
  const updateTodo = useUpdateWeeklyTodo();
  const toggleTodo = useToggleWeeklyTodo();
  const deleteTodo = useDeleteWeeklyTodo();

  const todos = todosData?.todos || [];
  const summary = todosData?.summary || { total: 0, completed: 0, pending: 0, completionRate: 0 };

  // Filtered todos based on active filters
  const filteredTodos = useMemo(() => {
    return todos.filter((t) => {
      // Day filter
      if (selectedDay !== 'All Days' && t.dayOfWeek !== selectedDay) {
        return false;
      }
      // Status filter
      if (statusFilter === 'pending' && t.isCompleted) return false;
      if (statusFilter === 'completed' && !t.isCompleted) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = t.title?.toLowerCase().includes(q);
        const descMatch = t.description?.toLowerCase().includes(q);
        const assigneeMatch = t.assignedTo?.name?.toLowerCase().includes(q);
        const notesMatch = t.notes?.toLowerCase().includes(q);
        if (!titleMatch && !descMatch && !assigneeMatch && !notesMatch) return false;
      }

      return true;
    });
  }, [todos, selectedDay, statusFilter, searchQuery]);

  // Day counts for badge tabs
  const dayCounts = useMemo(() => {
    const counts = {};
    DAYS.forEach((d) => (counts[d] = 0));
    counts['All Days'] = todos.length;
    todos.forEach((t) => {
      if (t.dayOfWeek && counts[t.dayOfWeek] !== undefined) {
        counts[t.dayOfWeek]++;
      }
    });
    return counts;
  }, [todos]);

  // Quick inline add handler
  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    const payload = {
      title: quickTitle.trim(),
      weekStartDate: weekStartDateIso,
      dayOfWeek: selectedDay !== 'All Days' ? selectedDay : 'Weekly Target',
      priority: 'medium',
      category: 'general',
      assignedTo: isManagerOrAdmin && assigneeFilter !== 'all' && assigneeFilter !== 'mine' ? assigneeFilter : user?._id,
    };

    await createTodo.mutateAsync(payload);
    setQuickTitle('');
  };

  // Modal submission handler
  const handleModalSubmit = async (formData) => {
    if (editingTodo) {
      await updateTodo.mutateAsync({ id: editingTodo._id, data: formData });
    } else {
      await createTodo.mutateAsync(formData);
    }
    setModalOpen(false);
    setEditingTodo(null);
  };

  const isCurrentWeek = weekOffset === 0;

  return (
    <div className="bg-card rounded-2xl border border-border p-5 sm:p-6 shadow-sm space-y-5">
      {/* ── 1. Header & Week Navigator ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              <CheckSquare size={12} />
              Weekly Execution Hub
            </span>
            <span className="text-xs text-muted-foreground">• Up to Week Planning</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-foreground flex items-center gap-2">
            <span>Weekly Todos & Deliverables</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            {isManagerOrAdmin
              ? 'Assign and track weekly milestones for employees and interns across the agency.'
              : 'Your assigned deliverables and personal milestones for the week.'}
          </p>
        </div>

        {/* Week Switcher Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-secondary/60 rounded-xl p-1 border border-border">
            <button
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="p-1.5 rounded-lg hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
              title="Previous Week"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 text-xs font-bold text-foreground min-w-[130px] text-center">
              {formatDateLabel(monday)} – {formatDateLabel(sunday)}
            </span>
            <button
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="p-1.5 rounded-lg hover:bg-card text-muted-foreground hover:text-foreground transition-colors"
              title="Next Week"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {!isCurrentWeek && (
            <button
              onClick={() => setWeekOffset(0)}
              className="px-2.5 py-1.5 rounded-xl border border-border bg-background hover:bg-secondary text-xs font-semibold text-foreground transition-all"
            >
              Current Week
            </button>
          )}

          <button
            onClick={() => {
              setEditingTodo(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 shadow-sm transition-all"
          >
            <Plus size={15} />
            <span>{isManagerOrAdmin ? 'Assign Todo' : 'Add Todo'}</span>
          </button>
        </div>
      </div>

      {/* ── 2. Weekly Progress Metric Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-secondary/30 rounded-2xl p-4 border border-border/70">
        <div className="sm:col-span-2 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-foreground flex items-center gap-1.5">
              <TrendingUp size={14} className="text-primary" />
              <span>Week Progress</span>
            </span>
            <span className="font-extrabold text-foreground">
              {summary.completed} of {summary.total} done ({summary.completionRate}%)
            </span>
          </div>
          {/* Progress Bar */}
          <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden p-0.5 border border-border/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-indigo-500 transition-all duration-500"
              style={{ width: `${summary.completionRate}%` }}
            />
          </div>
          <div className="text-[10px] text-muted-foreground">
            {summary.completionRate === 100 && summary.total > 0
              ? '🎉 All deliverables for this week are completed!'
              : `${summary.pending} pending item${summary.pending === 1 ? '' : 's'} remaining this week`}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-card border border-border/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Pending</span>
            <div className="text-lg font-black text-amber-500">{summary.pending}</div>
          </div>
          <Clock size={18} className="text-amber-500/50" />
        </div>

        <div className="p-2.5 rounded-xl bg-card border border-border/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Completed</span>
            <div className="text-lg font-black text-emerald-500">{summary.completed}</div>
          </div>
          <CheckCircle2 size={18} className="text-emerald-500/50" />
        </div>
      </div>

      {/* ── 3. Filters & Day Selection ── */}
      <div className="space-y-3">
        {/* Day Pills Carousel */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {DAYS.map((day) => {
            const isSelected = selectedDay === day;
            const count = dayCounts[day] || 0;
            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                    : 'bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/60'
                }`}
              >
                <span>{day}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-background text-muted-foreground'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Controls row: Search, Status pills, Assignee filter */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search todos, assignees..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground/60 focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Status pills */}
            <div className="flex items-center bg-secondary/50 rounded-xl p-0.5 border border-border/60 text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'all' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'pending' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'completed' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Done
              </button>
            </div>
          </div>

          {/* Manager / Admin Team Filter */}
          {isManagerOrAdmin && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground text-[11px] font-semibold">Assignee:</span>
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-border bg-background text-foreground text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-primary"
              >
                <option value="all">👥 All Team Members</option>
                <option value="mine">👤 My Own Todos</option>
                {teamUsers
                  .filter((u) => u.employmentStatus !== 'terminated')
                  .map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── 4. Quick Inline Add Bar ── */}
      <form onSubmit={handleQuickAdd} className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder={`+ Quick add weekly todo for ${selectedDay !== 'All Days' ? selectedDay : 'this week'} (press Enter)...`}
            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary/20 hover:bg-background focus:bg-background text-foreground text-xs placeholder:text-muted-foreground/70 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <button
          type="submit"
          disabled={!quickTitle.trim() || createTodo.isPending}
          className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-1.5 shrink-0"
        >
          <Plus size={14} />
          <span>Add</span>
        </button>
      </form>

      {/* ── 5. Todos List ── */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="py-10 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Loading weekly todos...</span>
          </div>
        ) : filteredTodos.length > 0 ? (
          <div className="divide-y divide-border/50 rounded-xl border border-border overflow-hidden bg-background">
            {filteredTodos.map((todo) => {
              const isCompleted = Boolean(todo.isCompleted);
              const isAssignedToMe = todo.assignedTo?._id === user?._id || todo.assignedTo === user?._id;
              const isAssignedByMe = todo.assignedBy?._id === user?._id || todo.assignedBy === user?._id;
              const isPersonal = todo.assignedTo?._id === todo.assignedBy?._id;
              const canEditFull = isManagerOrAdmin || isAssignedByMe;
              const isExpanded = expandedTodoId === todo._id;

              return (
                <div
                  key={todo._id}
                  className={`p-3.5 sm:p-4 transition-colors ${
                    isCompleted ? 'bg-secondary/15 hover:bg-secondary/30' : 'hover:bg-secondary/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: Checkbox + Title + Meta */}
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleTodo.mutate(todo._id)}
                        className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-transform hover:scale-110"
                        title={isCompleted ? 'Mark pending' : 'Mark completed'}
                      >
                        {isCompleted ? (
                          <CheckCircle2 size={18} className="text-emerald-500 fill-emerald-500/20" />
                        ) : (
                          <Square size={18} className="text-muted-foreground/80 hover:text-foreground" />
                        )}
                      </button>

                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            onClick={() => toggleTodo.mutate(todo._id)}
                            className={`text-xs font-bold cursor-pointer transition-colors ${
                              isCompleted
                                ? 'line-through text-muted-foreground font-medium'
                                : 'text-foreground hover:text-primary'
                            }`}
                          >
                            {todo.title}
                          </span>

                          {/* Priority badge */}
                          {todo.priority && (
                            <span
                              className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md border ${
                                PRIORITY_BADGES[todo.priority] || PRIORITY_BADGES.medium
                              }`}
                            >
                              {todo.priority}
                            </span>
                          )}

                          {/* Category badge */}
                          {todo.category && (
                            <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-2 py-0.2 rounded-md flex items-center gap-1">
                              <span>{CATEGORY_ICONS[todo.category] || '📋'}</span>
                              <span className="capitalize">{todo.category}</span>
                            </span>
                          )}
                        </div>

                        {/* Metadata Row: Day + Assignee Info */}
                        <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-muted-foreground pt-0.5">
                          {/* Day badge */}
                          <span className="inline-flex items-center gap-1 font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                            <Calendar size={11} />
                            <span>{todo.dayOfWeek || 'Weekly Target'}</span>
                          </span>

                          {/* Who it's assigned to / who assigned it */}
                          {isPersonal ? (
                            <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                              <Sparkles size={11} />
                              <span>Personal Todo ({todo.assignedTo?.name || 'Self'})</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-foreground/80">
                              <User size={11} />
                              <span>
                                For: <strong>{todo.assignedTo?.name || 'Team Member'}</strong>
                                {todo.assignedBy && (
                                  <span className="text-muted-foreground"> (by {todo.assignedBy.name})</span>
                                )}
                              </span>
                            </span>
                          )}

                          {todo.notes && (
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                              <MessageSquare size={11} />
                              <span>Has Notes</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {(todo.description || todo.notes) && (
                        <button
                          type="button"
                          onClick={() => setExpandedTodoId(isExpanded ? null : todo._id)}
                          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          title={isExpanded ? 'Collapse notes' : 'Expand notes'}
                        >
                          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </button>
                      )}

                      {canEditFull && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTodo(todo);
                            setModalOpen(true);
                          }}
                          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          title="Edit todo"
                        >
                          <Edit2 size={14} />
                        </button>
                      )}

                      {canEditFull && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Delete this weekly todo?')) {
                              deleteTodo.mutate(todo._id);
                            }
                          }}
                          className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Delete todo"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded description and notes */}
                  {isExpanded && (
                    <div className="mt-2.5 pt-2.5 border-t border-border/50 pl-7 space-y-2 text-xs">
                      {todo.description && (
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</span>
                          <p className="text-foreground/90 whitespace-pre-wrap mt-0.5">{todo.description}</p>
                        </div>
                      )}
                      {todo.notes && (
                        <div className="bg-secondary/40 p-2.5 rounded-xl border border-border/60">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <MessageSquare size={11} />
                            Execution Notes
                          </span>
                          <p className="text-foreground whitespace-pre-wrap mt-0.5">{todo.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-10 text-center bg-secondary/20 rounded-2xl border border-border/80 text-xs text-muted-foreground space-y-2">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <CheckSquare size={20} />
            </div>
            <p className="font-semibold text-foreground">No weekly todos found for this view.</p>
            <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
              {selectedDay !== 'All Days'
                ? `No todos scheduled for ${selectedDay}. Use the quick adder above to create one.`
                : 'All caught up! Plan your week ahead or assign milestones to your team.'}
            </p>
          </div>
        )}
      </div>

      {/* ── 6. Create / Edit Modal ── */}
      <WeeklyTodoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        todo={editingTodo}
        currentUser={user}
        isManagerOrAdmin={isManagerOrAdmin}
        activeWeekStart={weekStartDateIso}
        onSubmit={handleModalSubmit}
        isPending={createTodo.isPending || updateTodo.isPending}
      />
    </div>
  );
}

export default WeeklyTodosWidget;
