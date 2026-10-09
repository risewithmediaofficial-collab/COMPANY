import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  CheckCircle2,
  Clock,
  Plus,
  CheckSquare,
  AlertTriangle,
  ArrowRight,
  FileEdit,
  Share2,
  X,
  Calendar,
  RotateCcw,
  Sparkles,
  Globe,
  Palette,
  Film,
  Megaphone,
  Kanban,
  Video,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getPersonColor, extractTaskAssignees, PersonAssigneeBadge } from '../../utils/personColors';
import { AddTaskModal } from '../../components/modals/AddTaskModal';
import { TaskDetailModal } from '../../components/ui/TaskDetailModal';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ui/page';
import { WorkspacePage } from '../../components/ui/WorkspacePage';
import { DatabaseView } from '../../components/ui/DatabaseView';
import { SelectDropdown } from '../../components/ui/SelectDropdown';
import { isCategoryMatch } from '../../utils/categoryColors';
import { TeamQuickAssignRoster } from '../../components/tasks/TeamQuickAssignRoster';
import { KanbanCreateTaskModal } from '../../components/tasks/KanbanCreateTaskModal';
import { TaskWorkflowDrawer } from '../../components/tasks/TaskWorkflowDrawer';
import { TasksKanbanPipeline } from '../../components/tasks/TasksKanbanPipeline';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useClients } from '../../hooks/useClients';
import { useDeleteTask, useTasks, useUpdateTaskStatus } from '../../hooks/useTasks';
import { useUsers } from '../../hooks/useUsers';
import PortalTasks from '../portal/sections/PortalTasks';
import { useDateFilter } from '../../context/DateFilterContext';
import {
  TASK_STATUS_OPTIONS,
  TEAM_STATUS_OPTIONS,
  formatTaskTypeLabel,
  normalizeTaskStatusLabel,
} from '../../utils/taskFields';

export const TASK_CATEGORY_PILLS = [
  { key: 'all', label: 'All Deliverables', icon: CheckSquare },
  { key: 'web_development', label: 'Website / Dev', icon: Globe },
  { key: 'social_media', label: 'Social Media / SMM', icon: Share2 },
  { key: 'reel', label: 'Reels / Shorts', icon: Film },
  { key: 'video_content', label: 'Video Production', icon: Video },
  { key: 'branding', label: 'Branding & Design', icon: Palette },
  { key: 'poster', label: 'Graphic / Poster', icon: Palette },
  { key: 'paid_ads', label: 'Paid Ads', icon: Megaphone },
  { key: 'seo', label: 'SEO & Search', icon: Sparkles },
  { key: 'saas_product', label: 'SaaS / Software', icon: Sparkles },
  { key: 'content', label: 'Content / Script', icon: FileEdit },
];

export const TASK_SORT_OPTIONS = [
  { value: 'dueDate_asc', label: '📅 Due Date: Earliest First' },
  { value: 'dueDate_desc', label: '📅 Due Date: Latest First' },
  { value: 'priority_desc', label: '⚡ Priority: High to Low' },
  { value: 'priority_asc', label: '⚡ Priority: Low to High' },
  { value: 'client_asc', label: '🏢 Client: A to Z' },
  { value: 'client_desc', label: '🏢 Client: Z to A' },
  { value: 'category_asc', label: '📁 Category: A to Z' },
  { value: 'newest', label: '🕒 Recently Created' },
  { value: 'oldest', label: '🕒 Oldest Created' },
];

const priorityTone = {
  Low: 'neutral',
  Medium: 'info',
  High: 'warning',
  Urgent: 'danger',
};

const Tasks = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalInitialValues, setAddModalInitialValues] = useState({});
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState(null);
  const [currentView, setCurrentView] = useState('board'); // 'board' | 'table'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('dueDate_asc');
  const [filters, setFilters] = useState({
    search: '',
    client: '',
    assignedTo: '',
    status: '',
    taskType: '',
    priority: '',
    dueDate: '',
  });

  const { user } = useSelector((state) => state.auth);
  const isEmployee = user?.role === 'employee';
  const isClient = user?.role === 'client';
  const isManager = user?.role === 'manager';
  const { data: tasks = [], isLoading } = useTasks(filters);
  const { data: clients = [] } = useClients();
  const { data: users = [] } = useUsers();
  const deleteTaskMutation = useDeleteTask();
  const updateStatusMutation = useUpdateTaskStatus();

  // Kanban Flow State
  const [showKanbanCreateModal, setShowKanbanCreateModal] = useState(false);
  const [preSelectedEmployee, setPreSelectedEmployee] = useState(null);
  const [workflowTaskId, setWorkflowTaskId] = useState(null);
  const [showWorkflowDrawer, setShowWorkflowDrawer] = useState(false);

  const activeWorkflowTask = useMemo(() => {
    if (!workflowTaskId) return null;
    return tasks.find((t) => t._id === workflowTaskId) || null;
  }, [tasks, workflowTaskId]);

  const handleOpenWorkflowDrawer = (task) => {
    setWorkflowTaskId(task._id);
    setShowWorkflowDrawer(true);
  };

  const handleQuickAssignEmployee = (employee) => {
    setPreSelectedEmployee(employee);
    setShowKanbanCreateModal(true);
  };

  const handleOpenCreateGeneral = () => {
    setPreSelectedEmployee(null);
    setShowKanbanCreateModal(true);
  };

  const { startDate: globalStartDate, endDate: globalEndDate, isDateInRange, isFiltered: isGlobalDateFiltered, resetDateFilter } = useDateFilter();

  const normalizedTasks = useMemo(
    () =>
      tasks.map((task) => ({
        ...task,
        status: normalizeTaskStatusLabel(task.status),
      })),
    [tasks],
  );

  const isTaskOverdue = (task) => {
    if (!task.dueDate) return false;
    const due = new Date(task.dueDate);
    if (Number.isNaN(due.getTime())) return false;
    const isDone = ['Completed', 'Approved', 'done', 'completed'].includes(task.status);
    return due < new Date() && !isDone;
  };

  const dateFilteredTasks = useMemo(() => {
    if (isGlobalDateFiltered || globalStartDate || globalEndDate) {
      return normalizedTasks.filter((task) =>
        isDateInRange([
          task.dueDate,
          task.postingScheduleDate,
          task.startDate,
          task.createdAt,
        ])
      );
    }
    return normalizedTasks;
  }, [normalizedTasks, isGlobalDateFiltered, globalStartDate, globalEndDate, isDateInRange]);

  const taskMetrics = {
    total: dateFilteredTasks.length,
    inProgress: dateFilteredTasks.filter((task) => ['On Process', 'in_progress', 'on_process'].includes(task.status)).length,
    done: dateFilteredTasks.filter((task) => ['Completed', 'Approved', 'done', 'completed'].includes(task.status)).length,
    overdue: dateFilteredTasks.filter(isTaskOverdue).length,
    overTarget: dateFilteredTasks.filter((task) => task.isOverTarget).length,
  };

  const [quickFilter, setQuickFilter] = useState('all'); // 'all' | 'inProgress' | 'done' | 'overdue' | 'overTarget'

  const handleQuickFilterChange = (filterType) => {
    setQuickFilter((prev) => (prev === filterType ? 'all' : filterType));
  };

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: dateFilteredTasks.length };
    dateFilteredTasks.forEach((t) => {
      TASK_CATEGORY_PILLS.forEach((pill) => {
        if (pill.key !== 'all' && isCategoryMatch(t.taskType || t.taskCategory, pill.key, t.taskTitle || t.title)) {
          counts[pill.key] = (counts[pill.key] || 0) + 1;
        }
      });
    });
    return counts;
  }, [dateFilteredTasks]);

  const activeCategoryPills = useMemo(() => {
    return TASK_CATEGORY_PILLS.map((pill) => ({
      ...pill,
      count: pill.key === 'all' ? dateFilteredTasks.length : (categoryCounts[pill.key] || 0),
    }));
  }, [dateFilteredTasks, categoryCounts]);

  const clientOptions = useMemo(() => {
    return clients.map((c) => ({
      value: c._id,
      label: c.company ? `${c.name} (${c.company})` : c.name,
    }));
  }, [clients]);

  const userOptions = useMemo(() => {
    return users.map((u) => ({
      value: u.name,
      label: u.name,
    }));
  }, [users]);

  // Active filters counter
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (categoryFilter !== 'all') count++;
    if (filters.client) count++;
    if (filters.priority) count++;
    if (filters.status) count++;
    if (filters.assignedTo) count++;
    if (filters.search) count++;
    if (quickFilter !== 'all') count++;
    if (isGlobalDateFiltered || globalStartDate || globalEndDate) count++;
    return count;
  }, [categoryFilter, filters, quickFilter, isGlobalDateFiltered, globalStartDate, globalEndDate]);

  const clearAllFilters = () => {
    setCategoryFilter('all');
    setQuickFilter('all');
    setSortBy('dueDate_asc');
    resetDateFilter();
    setFilters({
      search: '',
      client: '',
      assignedTo: '',
      status: '',
      taskType: '',
      priority: '',
      dueDate: '',
    });
  };

  const displayedTasks = useMemo(() => {
    let result = [...dateFilteredTasks];

    // Category filter
    if (categoryFilter && categoryFilter !== 'all') {
      result = result.filter((task) =>
        isCategoryMatch(task.taskType || task.taskCategory, categoryFilter, task.taskTitle || task.title)
      );
    }

    // Client filter
    if (filters.client) {
      result = result.filter((task) => {
        const cId = task.client?._id || task.client;
        return String(cId) === String(filters.client);
      });
    }

    // Priority filter
    if (filters.priority) {
      result = result.filter((task) => (task.priority || 'Medium') === filters.priority);
    }

    // Assigned To filter
    if (filters.assignedTo) {
      result = result.filter((task) => {
        const assignees = extractTaskAssignees(task);
        return assignees.some((p) => p.name === filters.assignedTo || p._id === filters.assignedTo);
      });
    }

    // Status filter
    if (filters.status) {
      result = result.filter((task) => task.status === filters.status);
    }

    // Quick metric filters
    if (quickFilter === 'inProgress') {
      result = result.filter((task) => ['On Process', 'in_progress', 'on_process'].includes(task.status));
    } else if (quickFilter === 'done') {
      result = result.filter((task) => ['Completed', 'Approved', 'done', 'completed'].includes(task.status));
    } else if (quickFilter === 'overdue') {
      result = result.filter(isTaskOverdue);
    } else if (quickFilter === 'overTarget' || filters.overTarget) {
      result = result.filter((task) => task.isOverTarget);
    }

    // Search query
    if (filters.search?.trim()) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter((task) =>
        (task.taskTitle || task.title || '').toLowerCase().includes(q) ||
        (task.client?.name || task.client?.company || task.clientName || '').toLowerCase().includes(q) ||
        (task.description || '').toLowerCase().includes(q) ||
        (task.status || '').toLowerCase().includes(q)
      );
    }

    // Sorting
    const priorityWeights = { Critical: 4, Urgent: 4, High: 3, Medium: 2, Low: 1 };
    result.sort((a, b) => {
      if (sortBy === 'dueDate_asc') {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return dateA - dateB;
      }
      if (sortBy === 'dueDate_desc') {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : -Infinity;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : -Infinity;
        return dateB - dateA;
      }
      if (sortBy === 'priority_desc') {
        return (priorityWeights[b.priority] || 2) - (priorityWeights[a.priority] || 2);
      }
      if (sortBy === 'priority_asc') {
        return (priorityWeights[a.priority] || 2) - (priorityWeights[b.priority] || 2);
      }
      if (sortBy === 'client_asc') {
        const nameA = (a.client?.company || a.client?.name || a.clientName || '').toLowerCase();
        const nameB = (b.client?.company || b.client?.name || b.clientName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'client_desc') {
        const nameA = (a.client?.company || a.client?.name || a.clientName || '').toLowerCase();
        const nameB = (b.client?.company || b.client?.name || b.clientName || '').toLowerCase();
        return nameB.localeCompare(nameA);
      }
      if (sortBy === 'category_asc') {
        const catA = (a.taskCategory || a.taskType || '').toLowerCase();
        const catB = (b.taskCategory || b.taskType || '').toLowerCase();
        return catA.localeCompare(catB);
      }
      if (sortBy === 'oldest') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      }
      // default: newest
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return result;
  }, [dateFilteredTasks, categoryFilter, filters, quickFilter, sortBy]);

  const columns = [
    {
      key: 'title',
      label: 'Task Title',
      render: (row) => (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-foreground text-xs hover:text-primary transition-colors">
            <span>{row.taskTitle || row.title}</span>
            {row.isOverTarget && (
              <span className="rounded bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.5 text-[9px] font-extrabold uppercase text-rose-600 dark:text-rose-400 shrink-0">
                🔴 Over Task
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground truncate">
            {row.client?.name || row.client?.company || row.clientName || 'Internal Task'}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Type',
      render: (row) => (
        <span className="px-2 py-0.5 rounded-lg bg-secondary text-[11px] font-medium text-foreground">
          {formatTaskTypeLabel(row.taskType) || 'General'}
        </span>
      ),
    },
    {
      key: 'assignedTo',
      label: 'Production Assignees',
      render: (row) => {
        const assignees = extractTaskAssignees(row);
        return (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1">
              {assignees.length > 0 ? (
                assignees.map((person, idx) => (
                  <PersonAssigneeBadge key={idx} person={person} size="sm" />
                ))
              ) : (
                <span className="text-xs text-muted-foreground italic">Unassigned</span>
              )}
            </div>
            {(row.scriptWriterAssigned || row.voiceArtistAssigned || row.videographerAssigned || row.editorAssigned || row.publisherAssigned) && (
              <div className="flex flex-wrap gap-1 text-[10px]">
                {row.scriptWriterAssigned && (() => {
                  const name = row.scriptWriterAssigned.name || row.scriptWriterName || 'Writer';
                  const c = getPersonColor(name);
                  return (
                    <span className={`px-1.5 py-0.5 rounded-md border font-semibold flex items-center gap-1 ${c.bg} ${c.text} ${c.border}`}>
                      ✍️ {name}
                    </span>
                  );
                })()}
                {row.voiceArtistAssigned && (() => {
                  const name = row.voiceArtistAssigned.name || row.voiceArtistName || 'RJ / Voice';
                  const c = getPersonColor(name);
                  return (
                    <span className={`px-1.5 py-0.5 rounded-md border font-semibold flex items-center gap-1 ${c.bg} ${c.text} ${c.border}`}>
                      🎙️ {name}
                    </span>
                  );
                })()}
                {row.videographerAssigned && (() => {
                  const name = row.videographerAssigned.name || row.videographerName || 'Videographer';
                  const c = getPersonColor(name);
                  return (
                    <span className={`px-1.5 py-0.5 rounded-md border font-semibold flex items-center gap-1 ${c.bg} ${c.text} ${c.border}`}>
                      🎥 {name}
                    </span>
                  );
                })()}
                {row.editorAssigned && (() => {
                  const name = row.editorAssigned.name || row.editorName || 'Editor';
                  const c = getPersonColor(name);
                  return (
                    <span className={`px-1.5 py-0.5 rounded-md border font-semibold flex items-center gap-1 ${c.bg} ${c.text} ${c.border}`}>
                      ✂️ {name}
                    </span>
                  );
                })()}
                {row.publisherAssigned && (() => {
                  const name = row.publisherAssigned.name || row.publisherName || 'Publisher';
                  const c = getPersonColor(name);
                  return (
                    <span className={`px-1.5 py-0.5 rounded-md border font-semibold flex items-center gap-1 ${c.bg} ${c.text} ${c.border}`}>
                      📱 {name}
                    </span>
                  );
                })()}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <select
          value={row.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => updateStatusMutation.mutate({ id: row._id, status: e.target.value })}
          className="rounded-xl border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15 cursor-pointer"
        >
          {(isEmployee ? TEAM_STATUS_OPTIONS : TASK_STATUS_OPTIONS).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (row) => (
        <StatusBadge tone={priorityTone[row.priority] || 'neutral'}>
          {row.priority || 'Medium'}
        </StatusBadge>
      ),
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      render: (row) => {
        const overdue = isTaskOverdue(row);
        return (
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-medium ${overdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-muted-foreground'}`}>
              {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '—'}
            </span>
            {overdue && (
              <span className="px-1.5 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-[9px] font-extrabold text-rose-600 dark:text-rose-400 shrink-0">
                Overdue
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'createdAt',
      label: 'Created Date',
      render: (row) => (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground whitespace-nowrap">
          <Calendar size={11} className="text-muted-foreground/70" />
          <span>
            {row.createdAt
              ? new Date(row.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
              : '—'}
          </span>
        </div>
      ),
    },
  ];

  const handleDeleteTask = async () => {
    if (deleteTaskId) {
      await deleteTaskMutation.mutateAsync(deleteTaskId);
      setDeleteTaskId(null);
    }
  };

  const openTaskDetail = (taskId) => {
    setSelectedTaskId(taskId);
    setShowTaskDetail(true);
  };

  const handleRowClick = (task) => {
    handleOpenWorkflowDrawer(task);
  };

  useEffect(() => {
    const openTaskId = searchParams.get('open');
    if (!openTaskId) return;
    setWorkflowTaskId(openTaskId);
    setShowWorkflowDrawer(true);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('open');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  if (isClient) {
    return <PortalTasks />;
  }

  const canCreate = ['superAdmin', 'admin', 'manager'].includes(user?.role);

  return (
    <WorkspacePage
      title={isEmployee ? 'My Assigned Deliverables' : 'Tasks Database'}
      subtitle="Universal multi-person production pipeline, multi-role assignees, and stages."
      icon={CheckSquare}
      breadcrumbs={[{ name: 'Delivery', path: '/tasks' }, { name: 'Tasks Database' }]}
      actions={
        <div className="flex items-center gap-2">
          <Link
            to={isEmployee ? '/development/my-tasks' : '/development/board'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all shadow-xs"
          >
            <Kanban size={13} />
            <span>Dev Pipeline Board</span>
          </Link>
          {canCreate && (
            <Button
              size="sm"
              onClick={handleOpenCreateGeneral}
              className="bg-primary text-primary-foreground font-bold shadow-sm"
            >
              <Plus size={15} className="mr-1.5 stroke-[2.5]" />
              New Task
            </Button>
          )}
        </div>
      }
      properties={
        <div className="flex flex-wrap items-center gap-2">
          {/* Total Tasks */}
          <button
            type="button"
            onClick={() => handleQuickFilterChange('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none ${
              quickFilter === 'all'
                ? 'bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/25'
                : 'bg-card border-border/80 text-foreground hover:bg-secondary/80 hover:border-border'
            }`}
          >
            <CheckSquare size={13} className={quickFilter === 'all' ? 'text-primary-foreground' : 'text-primary'} />
            <span>Total Tasks: {taskMetrics.total}</span>
          </button>

          {/* In Process */}
          <button
            type="button"
            onClick={() => handleQuickFilterChange('inProgress')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none ${
              quickFilter === 'inProgress'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/25'
                : 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20'
            }`}
          >
            <Clock size={13} />
            <span>In Process: {taskMetrics.inProgress}</span>
          </button>

          {/* Completed */}
          <button
            type="button"
            onClick={() => handleQuickFilterChange('done')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none ${
              quickFilter === 'done'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/25'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            <CheckCircle2 size={13} />
            <span>Completed: {taskMetrics.done}</span>
          </button>

          {/* Overdue */}
          <button
            type="button"
            onClick={() => handleQuickFilterChange('overdue')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none ${
              quickFilter === 'overdue'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-500/25'
                : taskMetrics.overdue > 0
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                : 'bg-card border-border/80 text-muted-foreground hover:bg-secondary/80'
            }`}
          >
            <AlertTriangle size={13} className={taskMetrics.overdue > 0 || quickFilter === 'overdue' ? 'text-rose-500 dark:text-rose-400' : 'text-muted-foreground'} />
            <span>Overdue: {taskMetrics.overdue}</span>
          </button>

          {/* Over Target */}
          {taskMetrics.overTarget > 0 && (
            <button
              type="button"
              onClick={() => handleQuickFilterChange('overTarget')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer select-none ${
                quickFilter === 'overTarget'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-500/25'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
              }`}
            >
              <AlertTriangle size={13} />
              <span>Over Target: {taskMetrics.overTarget}</span>
            </button>
          )}

          {/* Clear Filter pill if filtered */}
          {quickFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setQuickFilter('all')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground bg-secondary/80 hover:bg-secondary border border-border transition-all cursor-pointer"
            >
              <X size={13} />
              <span>Clear Filter</span>
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Team Quick Assign Roster categorized by Media / Developer / SMM / Management */}
        <TeamQuickAssignRoster
          users={users}
          tasks={tasks}
          onQuickAssign={handleQuickAssignEmployee}
          onOpenCreateGeneral={handleOpenCreateGeneral}
        />

        {/* Database View Engine (Table + Kanban Board) */}
        <DatabaseView
          activeView={currentView}
          onViewChange={setCurrentView}
          searchQuery={filters.search}
          onSearchChange={(val) => setFilters((prev) => ({ ...prev, search: val }))}
          totalCount={displayedTasks.length}
          filters={
            <div className="flex items-center justify-between gap-3 w-full flex-wrap">
              {/* Filter Dropdowns Group */}
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                {/* Category Filter Dropdown */}
                <SelectDropdown
                  className="w-44 text-xs"
                  value={categoryFilter}
                  onChange={(val) => setCategoryFilter(val || 'all')}
                  options={TASK_CATEGORY_PILLS.map((p) => ({ value: p.key, label: p.label }))}
                  allOptionLabel="All Categories"
                />

                {/* Client Filter */}
                <SelectDropdown
                  className="w-48 text-xs"
                  value={filters.client}
                  onChange={(val) => setFilters((prev) => ({ ...prev, client: val }))}
                  options={clientOptions}
                  placeholder="Filter by Client"
                  allOptionLabel="All Clients"
                />

                {/* Status Filter */}
                <SelectDropdown
                  className="w-40 text-xs"
                  value={filters.status}
                  onChange={(val) => setFilters((prev) => ({ ...prev, status: val }))}
                  options={isEmployee ? TEAM_STATUS_OPTIONS : TASK_STATUS_OPTIONS}
                  allOptionLabel="All Statuses"
                />

                {/* Priority Filter */}
                <SelectDropdown
                  className="w-36 text-xs"
                  value={filters.priority}
                  onChange={(val) => setFilters((prev) => ({ ...prev, priority: val }))}
                  options={['Critical', 'High', 'Medium', 'Low']}
                  allOptionLabel="All Priorities"
                />

                {/* Assignee Filter */}
                {!isEmployee && (
                  <SelectDropdown
                    className="w-44 text-xs"
                    value={filters.assignedTo}
                    onChange={(val) => setFilters((prev) => ({ ...prev, assignedTo: val }))}
                    options={userOptions}
                    placeholder="Filter by Assignee"
                    allOptionLabel="All Assignees"
                  />
                )}

                {/* Sorting Filter Dropdown */}
                <SelectDropdown
                  className="w-52 text-xs font-semibold"
                  value={sortBy}
                  onChange={(val) => setSortBy(val || 'dueDate_asc')}
                  options={TASK_SORT_OPTIONS}
                />
              </div>

              {/* Reset Button */}
              {activeFiltersCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearAllFilters}
                  className="h-8 px-2.5 text-xs text-rose-600 hover:text-rose-700 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 flex items-center gap-1 rounded-xl transition-all font-bold cursor-pointer"
                  title="Clear all active filters"
                >
                  <RotateCcw size={12} />
                  <span>Reset ({activeFiltersCount})</span>
                </Button>
              )}
            </div>
          }
        >
        {/* Table View (Desktop DataTable + Responsive Mobile Card List) */}
        {currentView === 'table' && (
          <div>
            {/* Desktop / Tablet Table */}
            <div className="hidden md:block">
              <DataTable
                data={displayedTasks}
                columns={columns}
                loading={isLoading}
                onRowClick={handleRowClick}
                onEdit={
                  canCreate
                    ? (task) => {
                        setSelectedTaskId(task._id);
                        setShowAddModal(true);
                      }
                    : undefined
                }
                onDelete={canCreate ? (id) => setDeleteTaskId(id) : undefined}
                emptyTitle="No tasks found"
                emptyDescription="Create a task to assign scripting, filming, editing, or publishing deliverables."
              />
            </div>

            {/* Mobile Touch-Friendly Card List */}
            <div className="md:hidden space-y-3">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-28 rounded-2xl bg-card border border-border animate-pulse p-4" />
                  ))}
                </div>
              ) : displayedTasks.length === 0 ? (
                <div className="p-8 text-center bg-card rounded-2xl border border-border text-xs text-muted-foreground">
                  No tasks found. Click "New Task" to create one.
                </div>
              ) : (
                displayedTasks.map((task) => (
                  <div
                    key={task._id}
                    onClick={() => handleRowClick(task)}
                    className="p-4 rounded-2xl border border-border bg-card shadow-xs hover:border-primary/50 transition-all space-y-3 cursor-pointer active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-foreground text-sm leading-snug">
                          {task.taskTitle || task.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {task.client?.company || task.client?.name || task.clientName || 'Internal Task'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusBadge tone={priorityTone[task.priority] || 'neutral'}>
                          {task.priority || 'Medium'}
                        </StatusBadge>
                        {canCreate && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTaskId(task._id);
                              setShowAddModal(true);
                            }}
                            className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                            title="Edit Task"
                          >
                            <Edit2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Assignees & Sub-roles */}
                    {(() => {
                      const assignees = extractTaskAssignees(task);
                      return (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {assignees.length > 0 ? (
                              assignees.map((person, pIdx) => (
                                <PersonAssigneeBadge key={pIdx} person={person} size="sm" />
                              ))
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-secondary text-muted-foreground border border-border/80">
                                <User size={10} /> Unassigned
                              </span>
                            )}
                          </div>

                          {(task.scriptWriterAssigned || task.voiceArtistAssigned || task.videographerAssigned || task.editorAssigned || task.publisherAssigned) && (
                            <div className="flex flex-wrap gap-1 text-[10px]">
                              {task.scriptWriterAssigned && (() => {
                                const name = task.scriptWriterAssigned.name || task.scriptWriterName || 'Writer';
                                const c = getPersonColor(name);
                                return (
                                  <span className={`px-2 py-0.5 rounded-md border font-semibold flex items-center gap-1 ${c.bg} ${c.text} ${c.border}`}>
                                    ✍️ {name}
                                  </span>
                                );
                              })()}
                              {task.voiceArtistAssigned && (() => {
                                const name = task.voiceArtistAssigned.name || task.voiceArtistName || 'RJ / Voice';
                                const c = getPersonColor(name);
                                return (
                                  <span className={`px-2 py-0.5 rounded-md border font-semibold flex items-center gap-1 ${c.bg} ${c.text} ${c.border}`}>
                                    🎙️ {name}
                                  </span>
                                );
                              })()}
                              {task.videographerAssigned && (() => {
                                const name = task.videographerAssigned.name || task.videographerName || 'Videographer';
                                const c = getPersonColor(name);
                                return (
                                  <span className={`px-2 py-0.5 rounded-md border font-semibold flex items-center gap-1 ${c.bg} ${c.text} ${c.border}`}>
                                    🎥 {name}
                                  </span>
                                );
                              })()}
                              {task.editorAssigned && (() => {
                                const name = task.editorAssigned.name || task.editorName || 'Editor';
                                const c = getPersonColor(name);
                                return (
                                  <span className={`px-2 py-0.5 rounded-md border font-semibold flex items-center gap-1 ${c.bg} ${c.text} ${c.border}`}>
                                    ✂️ {name}
                                  </span>
                                );
                              })()}
                              {task.publisherAssigned && (() => {
                                const name = task.publisherAssigned.name || task.publisherName || 'Publisher';
                                const c = getPersonColor(name);
                                return (
                                  <span className={`px-2 py-0.5 rounded-md border font-semibold flex items-center gap-1 ${c.bg} ${c.text} ${c.border}`}>
                                    📱 {name}
                                  </span>
                                );
                              })()}
                            </div>
                          )}

                          {/* Development Pipeline Workflow in List/Table view */}
                          {(task.department === 'Development' || task.development?.isDevTask || isWebsiteTaskType(task.taskType)) && (
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px] pt-1">
                              <span className={`px-2 py-0.5 rounded-md border font-bold flex items-center gap-1 shadow-2xs ${
                                task.development?.isBlocked
                                  ? 'bg-rose-500/15 text-rose-600 border-rose-500/30'
                                  : DEV_STAGE_TONES[task.development?.stage] || DEV_STAGE_TONES.in_development
                              }`}>
                                <Code2 size={11} />
                                <span>Dev: {task.development?.isBlocked ? 'Blocked' : (DEV_STAGE_SHORT_LABELS[task.development?.stage] || 'In Dev')}</span>
                              </span>
                              {task.development?.reviewer && (
                                <span className="px-2 py-0.5 rounded-md border font-semibold bg-purple-500/10 text-purple-600 border-purple-500/20">
                                  🔍 Review: {task.development.reviewer.name || 'Reviewer'}
                                </span>
                              )}
                              {task.development?.tester && (
                                <span className="px-2 py-0.5 rounded-md border font-semibold bg-cyan-500/10 text-cyan-600 border-cyan-500/20">
                                  🛡️ QA: {task.development.tester.name || 'Tester'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Status Select & Due Date */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-border/60 gap-2">
                      <div onClick={(e) => e.stopPropagation()}>
                        <select
                          value={task.status}
                          onChange={(e) => updateStatusMutation.mutate({ id: task._id, status: e.target.value })}
                          className="rounded-xl border border-border bg-background px-2.5 py-1 text-xs font-bold text-foreground outline-none transition-all focus:border-primary"
                        >
                          {(isEmployee ? TEAM_STATUS_OPTIONS : TASK_STATUS_OPTIONS).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {task.createdAt && (
                          <div className="text-[11px] flex items-center gap-1 text-muted-foreground">
                            <Calendar size={11} className="text-primary/70 shrink-0" />
                            <span>Created {new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                          </div>
                        )}
                        {(() => {
                          const overdue = isTaskOverdue(task);
                          return (
                            <div className={`text-[11px] flex items-center gap-1 font-medium ${overdue ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-muted-foreground'}`}>
                              {overdue ? <AlertTriangle size={12} className="text-rose-500 shrink-0" /> : <Clock size={12} className="text-primary shrink-0" />}
                              <span>{task.dueDate ? `${overdue ? 'Overdue: ' : 'Due '}${new Date(task.dueDate).toLocaleDateString()}` : 'No deadline'}</span>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Board View (Modern 7-Stage Kanban Workflow Pipeline) */}
        {(currentView === 'board' || currentView === 'kanban') && (
          <div className="space-y-3.5 w-full">
            <TasksKanbanPipeline
              tasks={displayedTasks}
              onSelectTask={handleOpenWorkflowDrawer}
              onOpenCreateGeneral={handleOpenCreateGeneral}
            />
          </div>
        )}
      </DatabaseView>
      </div>

      <AddTaskModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        initialValues={addModalInitialValues}
      />

      <TaskDetailModal
        open={showTaskDetail}
        onOpenChange={setShowTaskDetail}
        taskId={selectedTaskId}
      />

      {/* New Fast Dynamic Kanban Task Creator */}
      <KanbanCreateTaskModal
        isOpen={showKanbanCreateModal}
        onClose={() => {
          setShowKanbanCreateModal(false);
          setPreSelectedEmployee(null);
        }}
        initialUser={preSelectedEmployee}
      />

      {/* Interactive Workflow Drawer with live checklists and task notes */}
      <TaskWorkflowDrawer
        task={activeWorkflowTask}
        isOpen={showWorkflowDrawer && !!activeWorkflowTask}
        onClose={() => {
          setShowWorkflowDrawer(false);
          setWorkflowTaskId(null);
        }}
      />

      <AlertDialog open={!!deleteTaskId} onOpenChange={(open) => !open && setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspacePage>
  );
};

export default Tasks;
