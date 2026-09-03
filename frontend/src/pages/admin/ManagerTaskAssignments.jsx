import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  CheckCircle2, Clock, ListChecks, Plus, TimerReset,
  FileText, Calendar, AlertTriangle, ChevronRight, RefreshCw,
} from 'lucide-react';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/button';
import { MetricCard, MetricGrid, PageHeader, PageToolbar, SearchField, StatusBadge } from '../../components/ui/page';
import { useDateFilter } from '../../context/DateFilterContext';
import { DateRangePicker } from '../../components/ui/DateRangePicker';
import { AddProjectNoteModal } from '../../components/modals/AddProjectNoteModal';
import { useClients } from '../../hooks/useClients';
import { useDeleteTask, useTasks, useUpdateTaskStatus } from '../../hooks/useTasks';
import { useUsers } from '../../hooks/useUsers';
import { CONTENT_TASK_TYPE_OPTIONS, NON_CONTENT_TASK_TYPE_OPTIONS, PRIORITY_OPTIONS, TASK_STATUS_OPTIONS, normalizeTaskStatusLabel } from '../../utils/taskFields';
import api from '../../api';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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

const priorityBadge = {
  low: 'bg-slate-500/10 text-slate-600',
  medium: 'bg-blue-500/10 text-blue-600',
  high: 'bg-amber-500/10 text-amber-600',
  urgent: 'bg-red-500/10 text-red-600',
};

const ALL_TASK_TYPES = [...CONTENT_TASK_TYPE_OPTIONS, ...NON_CONTENT_TASK_TYPE_OPTIONS];

// ── Project Briefs Panel ─────────────────────────────────────────────────────
const ProjectBriefCard = ({ note, onAssignTask, navigate }) => {
  const isOverdue = note.deadline && new Date(note.deadline) < new Date();
  const daysLeft = note.deadline
    ? Math.ceil((new Date(note.deadline) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <FileText size={17} />
          </div>
          <div>
            <h4 className="font-semibold text-foreground leading-tight">{note.title}</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Posted by {note.submittedBy?.name || 'Admin'} ·{' '}
              {new Date(note.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase capitalize ${priorityBadge[note.priority] || 'bg-secondary text-foreground'}`}>
          {note.priority}
        </span>
      </div>

      {note.description && (
        <p className="mb-3 text-sm text-muted-foreground leading-relaxed line-clamp-3 bg-secondary/30 rounded-xl px-3 py-2">
          {note.description}
        </p>
      )}

      <div className="flex flex-wrap gap-3 mb-4">
        {note.startDate && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar size={12} className="text-emerald-500" />
            <span>Start: <strong className="text-foreground">{new Date(note.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</strong></span>
          </div>
        )}
        {note.deadline && (
          <div className={`flex items-center gap-1.5 text-xs ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
            <AlertTriangle size={12} className={isOverdue ? 'text-destructive' : 'text-amber-500'} />
            <span>
              Deadline: <strong className={isOverdue ? 'text-destructive' : 'text-foreground'}>
                {new Date(note.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </strong>
              {daysLeft !== null && (
                <span className={`ml-1 ${isOverdue ? 'text-destructive' : daysLeft <= 3 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  ({isOverdue ? 'Overdue' : `${daysLeft}d left`})
                </span>
              )}
            </span>
          </div>
        )}
        <div className={`flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 ${
          note.status === 'assigned' ? 'bg-emerald-500/10 text-emerald-600' :
          note.status === 'dismissed' ? 'bg-secondary text-muted-foreground' :
          'bg-amber-500/10 text-amber-600'
        }`}>
          {note.status === 'assigned' ? '✓ Assigned' : note.status === 'dismissed' ? 'Dismissed' : '⏳ Pending'}
        </div>
      </div>

      <Button
        size="sm"
        variant="outline"
        className="w-full gap-2"
        onClick={() => onAssignTask(note)}
      >
        <Plus size={14} />
        Assign Task from This Brief
        <ChevronRight size={14} className="ml-auto" />
      </Button>
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────
const ManagerTaskAssignments = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSelector((state) => state.auth);
  const isSuperAdmin = user?.role === 'superAdmin' || user?.role === 'admin';

  const [filters, setFilters] = useState({
    search: '',
    client: '',
    assignedTo: '',
    status: '',
    taskType: '',
    priority: '',
    dueDate: '',
  });
  const [showNoteModal, setShowNoteModal] = useState(false);

  const { data: tasks = [], isLoading } = useTasks(filters);
  const { data: clients = [] } = useClients();
  const { data: users = [] } = useUsers({ enabled: true });
  const deleteTaskMutation = useDeleteTask();
  const updateStatusMutation = useUpdateTaskStatus();

  // Fetch project briefs (task notes from admin)
  const { data: notesData, refetch: refetchNotes } = useQuery({
    queryKey: ['task-notes'],
    queryFn: async () => {
      const res = await api.get('/task-notes');
      return res.data.notes || [];
    },
    enabled: true,
  });
  const projectBriefs = notesData || [];

  const assignableUsers = useMemo(
    () => users.filter((person) => ['superAdmin', 'admin', 'manager', 'employee'].includes(person.role)),
    [users],
  );

  const { isDateInRange } = useDateFilter();

  const normalizedTasks = useMemo(
    () => tasks
      .filter((task) => isDateInRange(task.startDate || task.dueDate || task.createdAt))
      .map((task) => ({ ...task, status: normalizeTaskStatusLabel(task.status) })),
    [tasks, isDateInRange],
  );

  const isTaskOverdue = (task) => {
    if (!task.dueDate) return false;
    const due = new Date(task.dueDate);
    if (Number.isNaN(due.getTime())) return false;
    return due < new Date() && !['Completed', 'Approved', 'done', 'completed'].includes(task.status);
  };

  const taskMetrics = {
    total: normalizedTasks.length,
    inProgress: normalizedTasks.filter((task) => ['On Process', 'in_progress', 'on_process'].includes(task.status)).length,
    done: normalizedTasks.filter((task) => ['Completed', 'Approved', 'done', 'completed'].includes(task.status)).length,
    overdue: normalizedTasks.filter(isTaskOverdue).length,
  };

  const [quickFilter, setQuickFilter] = useState('all'); // 'all' | 'inProgress' | 'done' | 'overdue'

  const handleQuickFilterChange = (filterType) => {
    setQuickFilter((prev) => (prev === filterType ? 'all' : filterType));
  };

  const displayedTasks = useMemo(() => {
    let result = normalizedTasks;
    if (quickFilter === 'inProgress') {
      result = result.filter((task) => ['On Process', 'in_progress', 'on_process'].includes(task.status));
    } else if (quickFilter === 'done') {
      result = result.filter((task) => ['Completed', 'Approved', 'done', 'completed'].includes(task.status));
    } else if (quickFilter === 'overdue') {
      result = result.filter(isTaskOverdue);
    }
    return result;
  }, [normalizedTasks, quickFilter]);

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
      key: 'assignedTo',
      label: 'Assigned Person',
      render: (row) => (
        <div className="text-sm text-foreground">
          {Array.isArray(row.assignedTo) && row.assignedTo.length
            ? row.assignedTo.map((assignee) => assignee.name).join(', ')
            : row.assignedPersonName || 'Unassigned'}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <select
          value={row.status}
          onChange={(event) => updateStatusMutation.mutate({ id: row._id, status: event.target.value })}
          onClick={(e) => e.stopPropagation()}
          className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15"
        >
          {TASK_STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
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
      render: (row) => {
        if (!row.dueDate) return <span className="text-muted-foreground text-xs">Not set</span>;
        const isOverdue = new Date(row.dueDate) < new Date() && !['Completed', 'Approved'].includes(row.status);
        return (
          <span className={`text-xs font-medium ${isOverdue ? 'text-destructive' : ''}`}>
            {new Date(row.dueDate).toLocaleDateString()}
          </span>
        );
      },
    },
  ];

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const handleDeleteTask = async (taskId) => {
    await deleteTaskMutation.mutateAsync(taskId);
  };

  const handleAssignTaskFromBrief = (note) => {
    navigate(`/tasks/new?briefTitle=${encodeURIComponent(note.title)}&briefId=${note._id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manager Board"
        description="View project briefs from admin, manage and track tasks across clients and projects."
        actions={(
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => { refetchNotes(); queryClient.invalidateQueries(['tasks']); }}>
              <RefreshCw size={14} className="mr-1.5" />
              Refresh
            </Button>
            {isSuperAdmin && (
              <Button onClick={() => setShowNoteModal(true)}>
                <Plus size={16} className="mr-2" />
                Add Note
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/tasks/new')}>
              <Plus size={16} className="mr-2" />
              Create Task
            </Button>
          </div>
        )}
      >
        <MetricGrid>
          <div onClick={() => handleQuickFilterChange('all')} className="cursor-pointer transition-transform active:scale-[0.98]">
            <MetricCard label="Total Tasks" value={taskMetrics.total} helper="Click to view all" icon={ListChecks} tone={quickFilter === 'all' ? 'info' : 'neutral'} />
          </div>
          <div onClick={() => handleQuickFilterChange('inProgress')} className="cursor-pointer transition-transform active:scale-[0.98]">
            <MetricCard label="In Progress" value={taskMetrics.inProgress} helper="Click to filter" icon={Clock} tone={quickFilter === 'inProgress' ? 'warning' : 'neutral'} />
          </div>
          <div onClick={() => handleQuickFilterChange('done')} className="cursor-pointer transition-transform active:scale-[0.98]">
            <MetricCard label="Completed" value={taskMetrics.done} helper="Click to filter" icon={CheckCircle2} tone={quickFilter === 'done' ? 'success' : 'neutral'} />
          </div>
          <div onClick={() => handleQuickFilterChange('overdue')} className="cursor-pointer transition-transform active:scale-[0.98]">
            <MetricCard label="Overdue" value={taskMetrics.overdue} helper="Click to view overdue" icon={TimerReset} tone={quickFilter === 'overdue' || taskMetrics.overdue > 0 ? 'danger' : 'neutral'} />
          </div>
        </MetricGrid>
      </PageHeader>

      {/* ── Project Briefs Panel ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight">Project Briefs</h2>
            <p className="text-sm text-muted-foreground">
              {isSuperAdmin
                ? 'Notes you posted for the manager. Click "Assign Task" to create tasks from a brief.'
                : 'Project instructions from admin. Review each brief and assign tasks accordingly.'}
            </p>
          </div>
          <span className="text-xs font-semibold text-muted-foreground bg-card border border-border rounded-full px-3 py-1">
            {projectBriefs.length} brief{projectBriefs.length !== 1 ? 's' : ''}
          </span>
        </div>

        {projectBriefs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projectBriefs.map((note) => (
              <ProjectBriefCard
                key={note._id}
                note={note}
                onAssignTask={handleAssignTaskFromBrief}
                navigate={navigate}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <FileText size={32} className="mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="font-semibold text-foreground">No project briefs yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {isSuperAdmin
                ? 'Click "Add Note" to post a project brief for the manager.'
                : 'Admin hasn\'t posted any project briefs yet.'}
            </p>
            {isSuperAdmin && (
              <Button className="mt-4" onClick={() => setShowNoteModal(true)}>
                <Plus size={16} className="mr-2" />
                Add First Brief
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── Tasks Table ── */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">All Tasks</h2>
          <p className="text-sm text-muted-foreground">Filter and manage tasks across all clients and projects.</p>
        </div>

        <PageToolbar>
          <SearchField
            value={filters.search}
            onChange={(event) => updateFilter('search', event.target.value)}
            placeholder="Search tasks, clients..."
          />
          <div className="grid w-full gap-2 md:grid-cols-3 xl:grid-cols-6">
            <select
              value={filters.client}
              onChange={(event) => updateFilter('client', event.target.value)}
              className="rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15"
            >
              <option value="">All clients</option>
              {clients.map((client) => (
                <option key={client._id} value={client._id}>{client.name}</option>
              ))}
            </select>
            <select
              value={filters.assignedTo}
              onChange={(event) => updateFilter('assignedTo', event.target.value)}
              className="rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15"
            >
              <option value="">All assignees</option>
              {assignableUsers.map((person) => (
                <option key={person._id} value={person._id}>{person.name}</option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(event) => updateFilter('status', event.target.value)}
              className="rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15"
            >
              <option value="">All statuses</option>
              {TASK_STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <select
              value={filters.taskType}
              onChange={(event) => updateFilter('taskType', event.target.value)}
              className="rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15"
            >
              <option value="">All task types</option>
              {ALL_TASK_TYPES.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <select
              value={filters.priority}
              onChange={(event) => updateFilter('priority', event.target.value)}
              className="rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15"
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
              className="rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </div>
        </PageToolbar>

        <DataTable
          data={displayedTasks}
          columns={columns}
          loading={isLoading}
          onRowClick={(task) => navigate(`/tasks/${task._id}`)}
          onDelete={(id) => handleDeleteTask(id)}
          emptyTitle="No tasks found"
          emptyDescription="Create tasks or update filters to find tasks."
        />
      </div>

      {/* Add Project Note Modal */}
      <AddProjectNoteModal
        open={showNoteModal}
        onOpenChange={setShowNoteModal}
        onSuccess={() => refetchNotes()}
      />
    </div>
  );
};

export default ManagerTaskAssignments;
