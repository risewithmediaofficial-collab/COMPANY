import { useEffect, useMemo, useState } from 'react';
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
  const [currentView, setCurrentView] = useState('table'); // 'table' | 'board'
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
      <DateRangePicker title="Filter Tasks by Date Window" />

      {/* Database View Engine (Table + Kanban Board) */}
      <DatabaseView
        activeView={currentView}
        onViewChange={setCurrentView}
        searchQuery={filters.search}
        onSearchChange={(val) => setFilters((prev) => ({ ...prev, search: val }))}
        totalCount={normalizedTasks.length}
      >
        {/* Table View */}
        {currentView === 'table' && (
          <DataTable
            data={normalizedTasks}
            columns={columns}
            loading={isLoading}
            onRowClick={handleRowClick}
            onDelete={canCreate ? (id) => setDeleteTaskId(id) : undefined}
            emptyTitle="No tasks found"
            emptyDescription="Create a task to assign scripting, filming, editing, or publishing deliverables."
          />
        )}

        {/* Board View (Kanban by Task Status) */}
        {currentView === 'board' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            {KANBAN_STATUSES.map((status) => {
              const statusTasks = normalizedTasks.filter((t) => (t.status || 'To Do') === status);
              return (
                <div key={status} className="bg-secondary/20 rounded-2xl border border-border/80 p-3 space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">{status}</span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-secondary text-muted-foreground">
                      {statusTasks.length}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {statusTasks.map((task) => (
                      <div
                        key={task._id}
                        onClick={() => handleRowClick(task)}
                        className="p-3.5 bg-card rounded-xl border border-border hover:border-primary/40 transition-all cursor-pointer space-y-2 group shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                            {task.taskTitle || task.title}
                          </h4>
                          <span className={`px-2 py-0.2 rounded-md text-[9px] font-bold uppercase ${
                            task.priority === 'Urgent' || task.priority === 'High'
                              ? 'bg-rose-500/10 text-rose-600'
                              : 'bg-secondary text-muted-foreground'
                          }`}>
                            {task.priority || 'Med'}
                          </span>
                        </div>

                        <p className="text-[11px] text-muted-foreground truncate">
                          {task.client?.name || task.clientName || 'Internal'}
                        </p>

                        {/* Pipeline sub-assignees badges */}
                        {(task.scriptWriterAssigned || task.videographerAssigned || task.editorAssigned || task.publisherAssigned) && (
                          <div className="flex flex-wrap gap-1 text-[9px] pt-1">
                            {task.scriptWriterAssigned && (
                              <span className="px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 font-bold">✍️ Script</span>
                            )}
                            {task.videographerAssigned && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 font-bold">🎥 Shoot</span>
                            )}
                            {task.editorAssigned && (
                              <span className="px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 font-bold">✂️ Edit</span>
                            )}
                            {task.publisherAssigned && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 font-bold">📱 Post</span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
                          <span>
                            {task.dueDate ? `Due ${new Date(task.dueDate).toLocaleDateString()}` : 'No date'}
                          </span>
                          <span className="group-hover:text-primary flex items-center gap-0.5">
                            Open <ArrowRight size={10} />
                          </span>
                        </div>
                      </div>
                    ))}

                    {statusTasks.length === 0 && (
                      <div className="p-4 text-center text-[11px] text-muted-foreground border border-dashed border-border/60 rounded-xl">
                        No {status} tasks
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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
