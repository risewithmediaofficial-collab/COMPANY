import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { CheckCircle2, Clock, ListChecks, Plus, TimerReset } from 'lucide-react';
import { CollapsibleFilterBar } from '../../components/ui/CollapsibleFilterBar';
import { AddTaskModal } from '../../components/modals/AddTaskModal';
import { TaskDetailModal } from '../../components/ui/TaskDetailModal';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/button';
import { MetricCard, MetricGrid, PageHeader, PageToolbar, SearchField, StatusBadge } from '../../components/ui/page';
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
import {
  CONTENT_TASK_TYPE_OPTIONS,
  NON_CONTENT_TASK_TYPE_OPTIONS,
  PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
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

const ALL_TASK_TYPES = [...CONTENT_TASK_TYPE_OPTIONS, ...NON_CONTENT_TASK_TYPE_OPTIONS];

const Tasks = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState(null);
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

  const assignableUsers = useMemo(
    () => users.filter((person) => ['superAdmin', 'manager', 'employee'].includes(person.role)),
    [users],
  );

  const isAssigned = (task) => {
    if (!task || !user) return false;
    const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo];
    return assignees.some((assignee) => {
      const id = typeof assignee === 'object' ? assignee._id : assignee;
      return id?.toString() === user._id?.toString();
    });
  };

  const normalizedTasks = useMemo(
    () => tasks.map((task) => ({
      ...task,
      status: normalizeTaskStatusLabel(task.status),
    })),
    [tasks],
  );

  const taskMetrics = {
    total: normalizedTasks.length,
    inProgress: normalizedTasks.filter((task) => task.status === 'On Process').length,
    done: normalizedTasks.filter((task) => ['Completed', 'Approved'].includes(task.status)).length,
    overdue: normalizedTasks.filter(
      (task) => task.dueDate && new Date(task.dueDate) < new Date() && !['Completed', 'Approved'].includes(task.status),
    ).length,
  };

  const columns = [
    {
      key: 'title',
      label: 'Task',
      render: (row) => (
        <div className="min-w-0">
          <div className="font-semibold text-foreground">{row.taskTitle || row.title}</div>
          <div className="mt-1 text-xs text-muted-foreground">{row.client?.name || row.client?.company || row.clientName || 'No client linked'}</div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (row) => (
        <StatusBadge tone={row.taskCategory === 'non_content' ? 'warning' : 'info'}>
          {row.taskCategory === 'non_content' ? 'Non-Content' : 'Content'}
        </StatusBadge>
      ),
    },
    {
      key: 'taskType',
      label: 'Task Type',
      render: (row) => formatTaskTypeLabel(row.taskType),
    },
    {
      key: 'assignedTo',
      label: 'Pipeline & Assignees',
      render: (row) => (
        <div className="space-y-1">
          <div className="text-sm font-bold text-foreground">
            {Array.isArray(row.assignedTo) && row.assignedTo.length
              ? row.assignedTo.map((assignee) => assignee.name).join(', ')
              : row.assignedPersonName || 'Unassigned'}
          </div>
          {(row.scriptWriterAssigned || row.videographerAssigned || row.editorAssigned || row.publisherAssigned) && (
            <div className="flex flex-wrap gap-1 text-[10px]">
              {row.scriptWriterAssigned && (
                <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 font-semibold">
                  ✍️ {row.scriptWriterAssigned.name || row.scriptWriterName}
                </span>
              )}
              {row.videographerAssigned && (
                <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-semibold">
                  🎥 {row.videographerAssigned.name || row.videographerName}
                </span>
              )}
              {row.editorAssigned && (
                <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 font-semibold">
                  ✂️ {row.editorAssigned.name || row.editorName}
                </span>
              )}
              {row.publisherAssigned && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-semibold">
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
        isEmployee ? (
          <StatusBadge tone={statusTone[row.status] || 'neutral'}>{row.status}</StatusBadge>
        ) : (
          <select
            value={row.status}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => updateStatusMutation.mutate({ id: row._id, status: event.target.value })}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15"
          >
            {TASK_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        )
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (row) => <StatusBadge tone={priorityTone[row.priority] || 'neutral'}>{row.priority}</StatusBadge>,
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      render: (row) => row.dueDate ? new Date(row.dueDate).toLocaleDateString() : 'Not set',
    },
  ];

  const handleDeleteTask = async () => {
    if (deleteTaskId) {
      await deleteTaskMutation.mutateAsync(deleteTaskId);
      setDeleteTaskId(null);
    }
  };

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEmployee ? 'Assigned Work' : isManager ? 'Manager Tasks' : 'Advanced Task Management'}
        description={isEmployee
          ? 'See only the tasks assigned to you, update delivery status, upload completed files, and keep clients informed.'
          : isManager
            ? 'View and manage the tasks under your team’s responsibility. Create, assign, and track task progress across clients and projects.'
            : 'Manage content and non-content tasks with structured requirements, clear ownership, and client approval flow.'}
        actions={!isEmployee ? (
          <Button
            onClick={() => navigate('/tasks/new')}
          >
            <Plus size={16} className="mr-2" />
            Add Task
          </Button>
        ) : null}
      >
        <MetricGrid>
          <MetricCard label="Assigned" value={taskMetrics.total} helper="Tasks in the current filtered view" icon={ListChecks} tone="info" />
          <MetricCard label="On Process" value={taskMetrics.inProgress} helper="Work that is actively moving" icon={Clock} tone="warning" />
          <MetricCard label="Completed" value={taskMetrics.done} helper="Completed or approved tasks" icon={CheckCircle2} tone="success" />
          <MetricCard label="Overdue" value={taskMetrics.overdue} helper="Needs attention right away" icon={TimerReset} tone={taskMetrics.overdue > 0 ? 'danger' : 'neutral'} />
        </MetricGrid>
      </PageHeader>

      {isManager && (
        <div className="rounded-3xl border border-border bg-secondary/70 p-4 text-sm text-foreground">
          <p className="font-semibold">Manager task inbox</p>
          <p className="mt-1 text-sm text-muted-foreground">This page shows tasks within your management scope. Use filters to narrow by client, assignee, or status.</p>
        </div>
      )}

      <CollapsibleFilterBar
        search={filters.search}
        onSearchChange={(val) => updateFilter('search', val)}
        searchPlaceholder="Search tasks, clients, requirements, or assignees..."
        activeFilterCount={Object.entries(filters).filter(([key, val]) => key !== 'search' && Boolean(val)).length}
        onResetFilters={() => setFilters({ search: '', client: '', assignedTo: '', status: '', taskType: '', priority: '', dueDate: '' })}
      >
        <div className="grid w-full gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {!isEmployee && (
            <select
              value={filters.client}
              onChange={(event) => updateFilter('client', event.target.value)}
              className="app-select"
            >
              <option value="">All clients</option>
              {clients.map((client) => (
                <option key={client._id} value={client._id}>{client.name}</option>
              ))}
            </select>
          )}
          {!isEmployee && (
            <select
              value={filters.assignedTo}
              onChange={(event) => updateFilter('assignedTo', event.target.value)}
              className="app-select"
            >
              <option value="">All assignees</option>
              {assignableUsers.map((person) => (
                <option key={person._id} value={person._id}>{person.name}</option>
              ))}
            </select>
          )}
          <select
            value={filters.status}
            onChange={(event) => updateFilter('status', event.target.value)}
            className="app-select"
          >
            <option value="">All statuses</option>
            {TASK_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <select
            value={filters.taskType}
            onChange={(event) => updateFilter('taskType', event.target.value)}
            className="app-select"
          >
            <option value="">All task types</option>
            {ALL_TASK_TYPES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={filters.priority}
            onChange={(event) => updateFilter('priority', event.target.value)}
            className="app-select"
          >
            <option value="">All priorities</option>
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <input
            type="date"
            value={filters.dueDate}
            onChange={(event) => updateFilter('dueDate', event.target.value)}
            className="app-input"
          />
        </div>
      </CollapsibleFilterBar>

      <DataTable
        data={normalizedTasks}
        columns={columns}
        loading={isLoading}
        onRowClick={handleRowClick}
        onEdit={(task) => {
          setSelectedTask(task);
          setShowAddModal(true);
        }}
        onDelete={isEmployee ? null : (id) => setDeleteTaskId(id)}
        canEditRow={(row) => !isEmployee || isAssigned(row)}
        emptyTitle="No tasks match this view"
        emptyDescription="Adjust filters or create a new task to keep delivery moving."
      />

      <TaskDetailModal
        taskId={selectedTaskId}
        open={showTaskDetail}
        onOpenChange={setShowTaskDetail}
      />

      <AddTaskModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        task={selectedTask}
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
    </div>
  );
};

export default Tasks;
