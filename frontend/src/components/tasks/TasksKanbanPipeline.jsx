import React, { useState, useMemo } from 'react';
import {
  Video,
  Code2,
  MessageSquare,
  ListChecks,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { useUpdateTaskStatus } from '../../hooks/useTasks';
import { getAssetUrl } from '../../utils/assetUrl';
import { toast } from 'sonner';

export const KANBAN_COLUMNS = [
  {
    id: 'todo',
    title: 'To Do',
    icon: '📋',
    color: 'border-t-slate-500 bg-slate-500/5',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    description: 'Fresh tasks assigned to team',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    icon: '⚡',
    color: 'border-t-blue-500 bg-blue-500/5',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    description: 'Work actively ongoing',
  },
  {
    id: 'review',
    title: 'Internal Approval',
    icon: '🔍',
    color: 'border-t-purple-500 bg-purple-500/5',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
    description: 'Internal manager / lead review',
  },
  {
    id: 'client_approval',
    title: 'Client Approval',
    icon: '🤝',
    color: 'border-t-amber-500 bg-amber-500/5',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    description: 'Awaiting client feedback/signoff',
  },
  {
    id: 'smm_team',
    title: 'SMM Team',
    icon: '🚀',
    color: 'border-t-pink-500 bg-pink-500/5',
    badge: 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300',
    description: 'Ready for posting & scheduling',
  },
  {
    id: 'drive_uploaded',
    title: 'Drive Uploaded',
    icon: '☁️',
    color: 'border-t-cyan-500 bg-cyan-500/5',
    badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300',
    description: 'Edited assets uploaded to Drive',
  },
  {
    id: 'completed',
    title: 'Completed',
    icon: '✅',
    color: 'border-t-emerald-500 bg-emerald-500/5',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    description: 'Done and published',
  },
];

// Helper to normalize task status into the 7 Kanban column keys
export const normalizeToKanbanColumn = (status) => {
  if (!status) return 'todo';
  const s = status.toLowerCase();

  if (s === 'todo' || s === 'task received') return 'todo';
  if (s === 'in_progress' || s === 'on_process' || s === 'work in progress') return 'in_progress';
  if (s === 'review' || s === 'review_required' || s === 'rework' || s === 'rework_completed') return 'review';
  if (s === 'client_approval' || s === 'waiting_for_client') return 'client_approval';
  if (s === 'smm_team') return 'smm_team';
  if (s === 'drive_uploaded' || s === 'drive uploaded' || s === 'drive') return 'drive_uploaded';
  if (s === 'completed' || s === 'done' || s === 'approved') return 'completed';

  return 'todo';
};

export const TasksKanbanPipeline = ({
  tasks = [],
  onSelectTask,
  onOpenCreateGeneral,
}) => {
  const updateStatusMutation = useUpdateTaskStatus();
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumnId, setDragOverColumnId] = useState(null);

  // Group tasks into the 6 columns
  const columnTasksMap = useMemo(() => {
    const map = {
      todo: [],
      in_progress: [],
      review: [],
      client_approval: [],
      smm_team: [],
      completed: [],
    };

    if (Array.isArray(tasks)) {
      tasks.forEach((task) => {
        const colKey = normalizeToKanbanColumn(task.status);
        if (map[colKey]) {
          map[colKey].push(task);
        } else {
          map.todo.push(task);
        }
      });
    }

    return map;
  }, [tasks]);

  // Drag and Drop Handlers
  const handleDragStart = (e, task) => {
    e.dataTransfer.setData('text/plain', task._id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(task._id);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverColumnId(null);
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumnId !== columnId) {
      setDragOverColumnId(columnId);
    }
  };

  const handleDragLeave = (e, columnId) => {
    if (dragOverColumnId === columnId) {
      setDragOverColumnId(null);
    }
  };

  const handleDrop = async (e, targetColumnId) => {
    e.preventDefault();
    setDragOverColumnId(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;

    if (!taskId) return;

    const task = tasks.find((t) => t._id === taskId);
    if (!task) return;

    const currentColumn = normalizeToKanbanColumn(task.status);
    if (currentColumn === targetColumnId) return;

    try {
      await updateStatusMutation.mutateAsync({
        id: taskId,
        status: targetColumnId,
      });
      const targetCol = KANBAN_COLUMNS.find((c) => c.id === targetColumnId);
      toast.success(`Task moved to ${targetCol?.title || targetColumnId}`);
    } catch (err) {
      toast.error('Failed to move task');
    } finally {
      setDraggedTaskId(null);
    }
  };

  // Quick Advance 1-Click Action
  const handleQuickAdvance = async (e, task, currentColumnId) => {
    e.stopPropagation();
    const currentIndex = KANBAN_COLUMNS.findIndex((c) => c.id === currentColumnId);
    const nextCol = KANBAN_COLUMNS[currentIndex + 1];
    if (!nextCol) return;

    try {
      await updateStatusMutation.mutateAsync({
        id: task._id,
        status: nextCol.id,
      });
      toast.success(`Advanced to ${nextCol.title}`);
    } catch (err) {
      toast.error('Failed to update stage');
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 min-h-[680px] pb-8">
      {KANBAN_COLUMNS.map((column, colIdx) => {
        const columnTasks = columnTasksMap[column.id] || [];
        const isDragOver = dragOverColumnId === column.id;
        const nextCol = KANBAN_COLUMNS[colIdx + 1];

        return (
          <div
            key={column.id}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={(e) => handleDragLeave(e, column.id)}
            onDrop={(e) => handleDrop(e, column.id)}
            className={`flex flex-col rounded-2xl border border-slate-200/90 bg-slate-50/60 p-3 transition-all duration-200 dark:border-slate-800/80 dark:bg-slate-900/60 ${
              isDragOver
                ? 'ring-2 ring-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20'
                : ''
            }`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
              <div className="flex items-center gap-2">
                <span className="text-base">{column.icon}</span>
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {column.title}
                </h3>
              </div>

              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  columnTasks.length > 0
                    ? column.badge
                    : 'bg-slate-200/60 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {columnTasks.length}
              </span>
            </div>

            {/* Quick Add Button on To Do column */}
            {column.id === 'todo' && onOpenCreateGeneral && (
              <button
                onClick={onOpenCreateGeneral}
                className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-indigo-400 hover:bg-white hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-indigo-500 dark:hover:bg-slate-800"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ New Task</span>
              </button>
            )}

            {/* Tasks Container */}
            <div className="mt-2.5 flex-1 space-y-2.5 overflow-y-auto min-h-[250px] pr-0.5">
              {columnTasks.length === 0 ? (
                <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200/80 text-center dark:border-slate-800/80">
                  <span className="text-lg opacity-40">{column.icon}</span>
                  <span className="mt-1 text-[11px] font-medium text-slate-400">
                    No tasks
                  </span>
                </div>
              ) : (
                columnTasks.map((task) => {
                  // Assignee info
                  const assignee =
                    Array.isArray(task.assignedTo) && task.assignedTo.length > 0
                      ? task.assignedTo[0]
                      : null;
                  const assigneeName =
                    typeof assignee === 'object'
                      ? assignee?.name
                      : task.assignedPersonName || 'Unassigned';
                  const assigneeAvatar =
                    typeof assignee === 'object' && assignee?.avatar
                      ? getAssetUrl(assignee.avatar)
                      : null;
                  const initials = assigneeName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  // Checklist status
                  const checklist = Array.isArray(task.checklist) ? task.checklist : [];
                  const completedChecklistCount = checklist.filter((i) => i.isCompleted).length;
                  const hasChecklist = checklist.length > 0;

                  // Notes count
                  const notesCount = task.taskNotes?.length || 0;

                  // Priority colors
                  const priority = (task.priority || 'medium').toLowerCase();
                  const priorityBorder =
                    priority === 'urgent'
                      ? 'border-l-4 border-l-rose-500'
                      : priority === 'high'
                      ? 'border-l-4 border-l-amber-500'
                      : 'border-l-4 border-l-indigo-500';

                  const isDragging = draggedTaskId === task._id;

                  return (
                    <div
                      key={task._id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, task)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onSelectTask && onSelectTask(task)}
                      className={`group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-xs cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-indigo-500 ${priorityBorder} ${
                        isDragging ? 'opacity-40 scale-95' : ''
                      }`}
                    >
                      {/* Top Row: Category Pill & Client */}
                      <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                              task.taskCategory === 'content'
                                ? 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300'
                                : 'bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
                            }`}
                          >
                            {task.taskCategory === 'content' ? (
                              <Video className="h-2.5 w-2.5" />
                            ) : (
                              <Code2 className="h-2.5 w-2.5" />
                            )}
                            <span>{task.taskType || 'Task'}</span>
                          </span>

                          {task.publisherName && (
                            <span
                              title={`SMM Assigned: ${task.publisherName}`}
                              className="inline-flex items-center gap-0.5 rounded-md bg-purple-50 px-1.5 py-0.5 text-[9px] font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                            >
                              📱 {task.publisherName}
                            </span>
                          )}

                          {(task.driveUploadLink || task.driveLink || task.rawFootageLink) && (
                            <a
                              href={task.driveUploadLink || task.driveLink || task.rawFootageLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-0.5 rounded-md bg-cyan-50 px-1.5 py-0.5 text-[9px] font-bold text-cyan-700 hover:bg-cyan-100 hover:text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300"
                              title="Open Google Drive Files"
                            >
                              ☁️ Drive
                            </a>
                          )}
                        </div>

                        {task.clientName && (
                          <span
                            title={task.clientName}
                            className="truncate text-[10px] font-semibold text-slate-500 dark:text-slate-400 max-w-[100px]"
                          >
                            {task.clientName}
                          </span>
                        )}
                      </div>

                      {/* Task Title */}
                      <h4
                        title={task.title || task.taskTitle}
                        className="line-clamp-2 text-xs font-bold text-slate-900 dark:text-white leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                      >
                        {task.title || task.taskTitle}
                      </h4>

                      {/* Checklist Progress Indicator */}
                      {hasChecklist && (
                        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-md bg-slate-50 px-2 py-1 dark:bg-slate-800/60">
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                            <ListChecks className="h-3 w-3 text-indigo-500" />
                            <span>
                              {completedChecklistCount}/{checklist.length} Steps
                            </span>
                          </div>

                          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                            <div
                              className="h-full bg-emerald-500 transition-all"
                              style={{
                                width: `${Math.round(
                                  (completedChecklistCount / checklist.length) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Assigned Employee & Footer */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 dark:border-slate-800/60">
                        {/* Assignee Avatar + Name */}
                        <div className="flex items-center gap-1.5 min-w-0" title={`Assigned to: ${assigneeName}`}>
                          {assigneeAvatar ? (
                            <img
                              src={assigneeAvatar}
                              alt={assigneeName}
                              className="h-5 w-5 rounded-full object-cover ring-1 ring-white shadow-xs dark:ring-slate-800 shrink-0"
                            />
                          ) : (
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[9px] font-bold text-white shrink-0">
                              {initials}
                            </div>
                          )}
                          <span className="truncate text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                            {assigneeName}
                          </span>
                        </div>

                        {/* Right: Notes count or Quick Advance */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {notesCount > 0 && (
                            <span
                              title={`${notesCount} notes`}
                              className="flex items-center gap-0.5 text-[10px] text-slate-400"
                            >
                              <MessageSquare className="h-3 w-3" />
                              <span>{notesCount}</span>
                            </span>
                          )}

                          {nextStage && (
                            <button
                              onClick={(e) => handleQuickAdvance(e, task, column.id)}
                              title={`Move to ${nextStage.title}`}
                              className="opacity-0 group-hover:opacity-100 flex h-5 w-5 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all dark:bg-indigo-950 dark:text-indigo-300"
                            >
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TasksKanbanPipeline;
