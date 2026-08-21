import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  CheckCircle2,
  Clock,
  ListChecks,
  Plus,
  TimerReset,
  CheckSquare,
  AlertTriangle,
  ArrowRight,
  Filter,
  Users,
  Video,
  Scissors,
  FileEdit,
  Share2,
} from 'lucide-react';
import { CollapsibleFilterBar } from '../../components/ui/CollapsibleFilterBar';
import { AddTaskModal } from '../../components/modals/AddTaskModal';
import { TaskDetailModal } from '../../components/ui/TaskDetailModal';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ui/page';
import { WorkspacePage } from '../../components/ui/WorkspacePage';
import { DatabaseView } from '../../components/ui/DatabaseView';
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
import { DateRangePicker } from '../../components/ui/DateRangePicker';
import {
  CONTENT_TASK_TYPE_OPTIONS,
  NON_CONTENT_TASK_TYPE_OPTIONS,
  PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  TEAM_STATUS_OPTIONS,
  formatTaskTypeLabel,
  normalizeTaskStatusLabel,
} from '../../utils/taskFields';

const statusTone = {
  'To Do': 'neutral',
  'On Process': 'info',
  'Waiting for Client': 'warning',
  Completed: 'success',
  Rework: 'danger',
  Approved: 'success',
  'Rework Completed': 'info',
  'Review Required': 'warning',
};

const priorityTone = {
  Low: 'neutral',
  Medium: 'info',
  High: 'warning',
  Urgent: 'danger',
};

const KANBAN_STATUSES = ['To Do', 'On Process', 'Waiting for Client', 'Review Required', 'Completed'];

const Tasks = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState(null);
  const [currentView, setCurrentView] = useState('board'); // 'board' | 'table'
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [dragOverColKey, setDragOverColKey] = useState(null);
  const [dragOverTaskIndex, setDragOverTaskIndex] = useState(null);
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
  const { data: users = [] } = useUsers({ enabled: !isEmployee });
  const deleteTaskMutation = useDeleteTask();
  const updateStatusMutation = useUpdateTaskStatus();

  const { isDateInRange } = useDateFilter();

  const normalizedTasks = useMemo(
    () =>
      tasks
        .filter((task) => isDateInRange(task.startDate || task.dueDate || task.createdAt))
        .map((task) => ({
          ...task,
          status: normalizeTaskStatusLabel(task.status),
        })),
    [tasks, isDateInRange],
  );

  const taskMetrics = {
    total: normalizedTasks.length,
    inProgress: normalizedTasks.filter((task) => task.status === 'On Process').length,
    done: normalizedTasks.filter((task) => ['Completed', 'Approved'].includes(task.status)).length,
    overdue: normalizedTasks.filter(
      (task) =>
        task.dueDate &&
        new Date(task.dueDate) < new Date() &&
        !['Completed', 'Approved'].includes(task.status),
    ).length,
  };

  const columns = [
    {
      key: 'title',
      label: 'Task Title',
      render: (row) => (
        <div className="min-w-0">
          <div className="font-bold text-foreground text-xs hover:text-primary transition-colors">
            {row.taskTitle || row.title}
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
      render: (row) => (
        <div className="space-y-1">
          <div className="text-xs font-semibold text-foreground">
            {Array.isArray(row.assignedTo) && row.assignedTo.length
              ? row.assignedTo.map((a) => a.name).join(', ')
              : row.assignedPersonName || 'Unassigned'}
          </div>
          {(row.scriptWriterAssigned || row.videographerAssigned || row.editorAssigned || row.publisherAssigned) && (
            <div className="flex flex-wrap gap-1 text-[10px]">
              {row.scriptWriterAssigned && (
                <span className="px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 font-semibold">
                  ✍️ {row.scriptWriterAssigned.name || row.scriptWriterName}
                </span>
              )}
              {row.videographerAssigned && (
                <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 font-semibold">
                  🎥 {row.videographerAssigned.name || row.videographerName}
                </span>
              )}
              {row.editorAssigned && (
                <span className="px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 font-semibold">
                  ✂️ {row.editorAssigned.name || row.editorName}
                </span>
              )}
              {row.publisherAssigned && (
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 font-semibold">
                  📱 {row.publisherAssigned.name || row.publisherName}
                </span>
              )}
            </div>
          )}
        </div>
      ),
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
      render: (row) => (
        <span className="text-[11px] text-muted-foreground">
          {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '—'}
        </span>
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
    if (isEmployee) {
      openTaskDetail(task._id);
      return;
    }
    navigate(`/tasks/${task._id}`);
  };

  useEffect(() => {
    const openTaskId = searchParams.get('open');
    if (!openTaskId) return;
    openTaskDetail(openTaskId);
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
        canCreate && (
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="bg-primary text-primary-foreground font-bold shadow-sm"
          >
            <Plus size={15} className="mr-1.5 stroke-[2.5]" />
            New Task
          </Button>
        )
      }
      properties={
        <>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-card rounded-lg border border-border/80 text-foreground font-semibold">
            <CheckSquare size={13} className="text-primary" />
            <span>Total Tasks: {taskMetrics.total}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-600 rounded-lg font-semibold">
            <Clock size={13} />
            <span>In Process: {taskMetrics.inProgress}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg font-semibold">
            <CheckCircle2 size={13} />
            <span>Completed: {taskMetrics.done}</span>
          </div>
          {taskMetrics.overdue > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-lg font-semibold">
              <AlertTriangle size={13} />
              <span>Overdue: {taskMetrics.overdue}</span>
            </div>
          )}
        </>
      }
    >
      {/* Database View Engine (Table + Kanban Board) */}
      <DatabaseView
        activeView={currentView}
        onViewChange={setCurrentView}
        searchQuery={filters.search}
        onSearchChange={(val) => setFilters((prev) => ({ ...prev, search: val }))}
        totalCount={normalizedTasks.length}
      >
        {/* Table View (Desktop DataTable + Responsive Mobile Card List) */}
        {currentView === 'table' && (
          <div>
            {/* Desktop / Tablet Table */}
            <div className="hidden md:block">
              <DataTable
                data={normalizedTasks}
                columns={columns}
                loading={isLoading}
                onRowClick={handleRowClick}
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
              ) : normalizedTasks.length === 0 ? (
                <div className="p-8 text-center bg-card rounded-2xl border border-border text-xs text-muted-foreground">
                  No tasks found. Click "New Task" to create one.
                </div>
              ) : (
                normalizedTasks.map((task) => (
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
                      <StatusBadge tone={priorityTone[task.priority] || 'neutral'}>
                        {task.priority || 'Medium'}
                      </StatusBadge>
                    </div>

                    {/* Assignees & Sub-roles */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-foreground/90">
                      <span className="font-semibold text-muted-foreground">Assignee:</span>
                      <span>
                        {Array.isArray(task.assignedTo) && task.assignedTo.length
                          ? task.assignedTo.map((a) => a.name).join(', ')
                          : task.assignedPersonName || 'Unassigned'}
                      </span>
                    </div>

                    {(task.scriptWriterAssigned || task.videographerAssigned || task.editorAssigned || task.publisherAssigned) && (
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        {task.scriptWriterAssigned && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                            ✍️ {task.scriptWriterAssigned.name || task.scriptWriterName}
                          </span>
                        )}
                        {task.videographerAssigned && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                            🎥 {task.videographerAssigned.name || task.videographerName}
                          </span>
                        )}
                        {task.editorAssigned && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold">
                            ✂️ {task.editorAssigned.name || task.editorName}
                          </span>
                        )}
                        {task.publisherAssigned && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                            📱 {task.publisherAssigned.name || task.publisherName}
                          </span>
                        )}
                      </div>
                    )}

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

                      <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                        <Clock size={12} className="text-primary" />
                        <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No deadline'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Board View (Responsive Kanban by Task Status with Snap Scroll) */}
        {(currentView === 'board' || currentView === 'kanban') && (
          <div className="w-full overflow-x-auto pb-4 custom-scrollbar snap-x snap-mandatory">
            <div className="grid w-max min-w-full auto-cols-[minmax(275px,85vw)] sm:auto-cols-[minmax(280px,320px)] grid-flow-col gap-3.5 sm:gap-4">
              {[
                { key: 'To Do', label: 'To Do', badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400', surface: 'border-border bg-card/60' },
                { key: 'On Process', label: 'In Process', badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', surface: 'border-blue-500/20 bg-blue-500/5' },
                { key: 'Waiting for Client', label: 'Waiting for Client', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', surface: 'border-amber-500/20 bg-amber-500/5' },
                { key: 'Review Required', label: 'Review Required', badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', surface: 'border-purple-500/20 bg-purple-500/5' },
                { key: 'Completed', label: 'Completed', badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', surface: 'border-emerald-500/20 bg-emerald-500/5' },
              ].map((column) => {
                const columnTasks = normalizedTasks.filter((t) => {
                  const s = t.status || 'To Do';
                  if (column.key === 'Completed') return ['Completed', 'Approved', 'done', 'completed'].includes(s);
                  if (column.key === 'On Process') return ['On Process', 'in_progress', 'on_process'].includes(s);
                  if (column.key === 'Waiting for Client') return ['Waiting for Client', 'waiting_for_client'].includes(s);
                  if (column.key === 'Review Required') return ['Review Required', 'review_required', 'Rework', 'Rework Completed', 'rework'].includes(s);
                  if (column.key === 'To Do') return ['To Do', 'todo', ''].includes(s) || (!['On Process', 'Waiting for Client', 'Review Required', 'Completed', 'Approved', 'Rework'].includes(s));
                  return s === column.key;
                });

                const isColActive = dragOverColKey === column.key;

                return (
                  <div
                    key={column.key}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverColKey !== column.key) setDragOverColKey(column.key);
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        if (dragOverColKey === column.key) setDragOverColKey(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const taskId = e.dataTransfer.getData('taskId');
                      if (taskId) {
                        updateStatusMutation.mutate({ id: taskId, status: column.key });
                      }
                      setDraggingTaskId(null);
                      setDragOverColKey(null);
                      setDragOverTaskIndex(null);
                    }}
                    className={`flex flex-col min-h-[440px] max-h-[calc(100vh-280px)] rounded-2xl border ${column.surface} p-3 space-y-3 transition-all snap-center sm:snap-align-none ${
                      isColActive ? 'ring-2 ring-primary/40 border-primary bg-primary/5 shadow-md' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between px-1.5 py-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground uppercase tracking-wider">{column.label}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${column.badge}`}>
                          {columnTasks.length}
                        </span>
                      </div>
                      {canCreate && (
                        <button
                          onClick={() => setShowAddModal(true)}
                          className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                          title={`Add task to ${column.label}`}
                        >
                          <Plus size={14} />
                        </button>
                      )}
                    </div>

                    <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[calc(100vh-340px)] pr-0.5 custom-scrollbar">
                      {columnTasks.map((task, idx) => {
                        const isBeingDragged = draggingTaskId === task._id;
                        const showDropIndicatorBefore = isColActive && dragOverTaskIndex === idx && !isBeingDragged;

                        return (
                          <React.Fragment key={task._id}>
                            {showDropIndicatorBefore && (
                              <div className="h-1.5 rounded-full bg-primary/70 animate-pulse my-1 shadow-xs" />
                            )}
                            <div
                              draggable
                              onDragStart={(e) => {
                                setDraggingTaskId(task._id);
                                e.dataTransfer.setData('taskId', task._id);
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              onDragEnd={() => {
                                setDraggingTaskId(null);
                                setDragOverColKey(null);
                                setDragOverTaskIndex(null);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.dataTransfer.dropEffect = 'move';
                                setDragOverColKey(column.key);
                                const rect = e.currentTarget.getBoundingClientRect();
                                const midY = rect.top + rect.height / 2;
                                setDragOverTaskIndex(e.clientY < midY ? idx : idx + 1);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const taskId = e.dataTransfer.getData('taskId');
                                if (taskId) {
                                  updateStatusMutation.mutate({ id: taskId, status: column.key });
                                }
                                setDraggingTaskId(null);
                                setDragOverColKey(null);
                                setDragOverTaskIndex(null);
                              }}
                              onClick={() => handleRowClick(task)}
                              className={`p-3.5 bg-card rounded-xl border border-border hover:border-primary/50 transition-all cursor-grab active:cursor-grabbing space-y-2.5 group shadow-xs hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] ${
                                isBeingDragged ? 'opacity-30 scale-95 border-dashed border-primary ring-1 ring-primary/40' : ''
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                  {task.taskTitle || task.title}
                                </h4>
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase shrink-0 ${
                                  task.priority === 'Urgent' || task.priority === 'High'
                                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                    : 'bg-secondary text-muted-foreground'
                                }`}>
                                  {task.priority || 'Medium'}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span className="truncate max-w-[150px] font-medium text-foreground/80">
                                  {task.client?.company || task.client?.name || task.clientName || 'RiseWithMedia'}
                                </span>
                                {task.taskType && (
                                  <span className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-semibold text-muted-foreground">
                                    {formatTaskTypeLabel(task.taskType)}
                                  </span>
                                )}
                              </div>

                              {/* Pipeline production sub-assignees badges */}
                              {(task.scriptWriterAssigned || task.videographerAssigned || task.editorAssigned || task.publisherAssigned) && (
                                <div className="flex flex-wrap gap-1 text-[9px] pt-1">
                                  {task.scriptWriterAssigned && (
                                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                                      ✍️ Script
                                    </span>
                                  )}
                                  {task.videographerAssigned && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                                      🎥 Shoot
                                    </span>
                                  )}
                                  {task.editorAssigned && (
                                    <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1">
                                      ✂️ Edit
                                    </span>
                                  )}
                                  {task.publisherAssigned && (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                      📱 Post
                                    </span>
                                  )}
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
                                <span>
                                  {task.dueDate ? `Due ${new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'No deadline'}
                                </span>
                                <span className="group-hover:text-primary font-semibold flex items-center gap-0.5">
                                  Open <ArrowRight size={10} />
                                </span>
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}

                      {/* Drop indicator at the bottom of the column */}
                      {isColActive && dragOverTaskIndex >= columnTasks.length && (
                        <div className="h-1.5 rounded-full bg-primary/70 animate-pulse my-1 shadow-xs" />
                      )}

                      {columnTasks.length === 0 && (
                        <div className={`py-12 text-center text-xs border border-dashed rounded-xl transition-all ${
                          isColActive ? 'border-primary bg-primary/10 text-primary font-semibold' : 'text-muted-foreground/60 border-border/70'
                        }`}>
                          {isColActive ? `Drop here to move to ${column.label}` : `No ${column.label} tasks`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DatabaseView>

      <AddTaskModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
      />

      <TaskDetailModal
        open={showTaskDetail}
        onOpenChange={setShowTaskDetail}
        taskId={selectedTaskId}
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
