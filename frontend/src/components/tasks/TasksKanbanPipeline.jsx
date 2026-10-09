import React, { useState, useMemo, useRef } from 'react';
import {
  Video,
  Code2,
  MessageSquare,
  ListChecks,
  Plus,
  ArrowRight,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  ArrowDown,
} from 'lucide-react';
import { useUpdateTaskStatus } from '../../hooks/useTasks';
import { useAutoScrollOnDrag } from '../../hooks/useAutoScrollOnDrag';
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
    accentBorder: 'border-t-4 border-t-slate-500',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    icon: '⚡',
    color: 'border-t-blue-500 bg-blue-500/5',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    description: 'Work actively ongoing',
    accentBorder: 'border-t-4 border-t-blue-500',
  },
  {
    id: 'review',
    title: 'Internal Approval',
    icon: '🔍',
    color: 'border-t-purple-500 bg-purple-500/5',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
    description: 'Internal manager / lead review',
    accentBorder: 'border-t-4 border-t-purple-500',
  },
  {
    id: 'client_approval',
    title: 'Client Approval',
    icon: '🤝',
    color: 'border-t-amber-500 bg-amber-500/5',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    description: 'Awaiting client feedback/signoff',
    accentBorder: 'border-t-4 border-t-amber-500',
  },
  {
    id: 'smm_team',
    title: 'SMM Team',
    icon: '🚀',
    color: 'border-t-pink-500 bg-pink-500/5',
    badge: 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300',
    description: 'Ready for posting & scheduling',
    accentBorder: 'border-t-4 border-t-pink-500',
  },
  {
    id: 'drive_uploaded',
    title: 'Drive Uploaded',
    icon: '☁️',
    color: 'border-t-cyan-500 bg-cyan-500/5',
    badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300',
    description: 'Edited assets uploaded to Drive',
    accentBorder: 'border-t-4 border-t-cyan-500',
  },
  {
    id: 'completed',
    title: 'Completed',
    icon: '✅',
    color: 'border-t-emerald-500 bg-emerald-500/5',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    description: 'Done and published',
    accentBorder: 'border-t-4 border-t-emerald-500',
  },
];

// Helper to normalize task status into the 7 Kanban column keys
export const normalizeToKanbanColumn = (status) => {
  if (!status) return 'todo';
  const s = String(status).toLowerCase().replace(/[-_]+/g, ' ').trim();

  // Completed / Done / Approved
  if (['completed', 'complete', 'done', 'approved'].includes(s)) {
    return 'completed';
  }

  // Drive Uploaded
  if (['drive uploaded', 'drive', 'uploaded', 'files uploaded', 'drive upload'].includes(s)) {
    return 'drive_uploaded';
  }

  // SMM Team / Publishing
  if (['smm team', 'smm', 'social media', 'posting', 'scheduled'].includes(s)) {
    return 'smm_team';
  }

  // Client Approval
  if (['client approval', 'waiting for client', 'client review', 'waiting client'].includes(s)) {
    return 'client_approval';
  }

  // Internal Approval / Review / Rework
  if ([
    'review',
    'internal approval',
    'review required',
    'in review',
    'rework',
    'rework completed',
    'manager review',
  ].includes(s)) {
    return 'review';
  }

  // In Progress / On Process / Ongoing
  if ([
    'in progress',
    'on process',
    'work in progress',
    'ongoing',
    'in development',
    'developing',
    'filming',
    'editing',
    'scripting',
  ].includes(s)) {
    return 'in_progress';
  }

  // To Do / Task Received / Backlog / Default
  return 'todo';
};

export const TasksKanbanPipeline = ({
  tasks = [],
  onSelectTask,
  onOpenCreateGeneral,
  canCreate = true,
}) => {
  const updateStatusMutation = useUpdateTaskStatus();
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumnId, setDragOverColumnId] = useState(null);
  const boardContainerRef = useRef(null);

  // Smooth side auto-scroll while dragging cards near horizontal edges
  useAutoScrollOnDrag(boardContainerRef, Boolean(draggedTaskId), {
    edgeThreshold: 100,
    maxSpeed: 20,
  });

  // Group tasks into all 7 columns
  const columnTasksMap = useMemo(() => {
    const map = {
      todo: [],
      in_progress: [],
      review: [],
      client_approval: [],
      smm_team: [],
      drive_uploaded: [],
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

  // Horizontal pan navigation buttons
  const scrollBoard = (direction) => {
    if (!boardContainerRef.current) return;
    const scrollAmount = 320;
    boardContainerRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  // Drag and Drop Handlers
  const handleDragStart = (e, task) => {
    e.stopPropagation();
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
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumnId !== columnId) {
      setDragOverColumnId(columnId);
    }
  };

  const handleDragEnter = (e, columnId) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragOverColumnId !== columnId) {
      setDragOverColumnId(columnId);
    }
  };

  const handleDragLeave = (e, columnId) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      if (dragOverColumnId === columnId) {
        setDragOverColumnId(null);
      }
    }
  };

  const handleDrop = async (e, targetColumnId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverColumnId(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;

    if (!taskId) return;

    const task = tasks.find((t) => t._id === taskId);
    if (!task) return;

    const currentColumn = normalizeToKanbanColumn(task.status);
    if (currentColumn === targetColumnId) {
      setDraggedTaskId(null);
      return;
    }

    const targetCol = KANBAN_COLUMNS.find((c) => c.id === targetColumnId);

    try {
      await updateStatusMutation.mutateAsync({
        id: taskId,
        status: targetColumnId,
      });
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
    <div className="relative w-full">
      {/* Board Controls: 1-Row Indicator & Scroll Controls */}
      <div className="flex items-center justify-between pb-2.5 px-1 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">
            Workflow Board
          </span>
          <span className="hidden sm:inline text-[11px] text-slate-400 dark:text-slate-500">
            • Drag & drop cards across all 7 stages
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mr-1">
            7 Stages in Row
          </span>
          <button
            type="button"
            onClick={() => scrollBoard('left')}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-all hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBoard('right')}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-all hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            title="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mobile Stage Quick Navigator */}
      <div className="flex sm:hidden items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {KANBAN_COLUMNS.map((col, idx) => {
          const count = (columnTasksMap[col.id] || []).length;
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => {
                if (boardContainerRef.current) {
                  const targetX = idx * 290;
                  boardContainerRef.current.scrollTo({ left: targetX, behavior: 'smooth' });
                }
              }}
              className="inline-flex items-center gap-1 shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
            >
              <span>{col.icon}</span>
              <span>{col.title}</span>
              <span className="rounded-full bg-slate-100 px-1.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Single-Row Horizontal Kanban Track */}
      <div
        ref={boardContainerRef}
        className="w-full overflow-x-auto pb-4 pt-1 custom-scrollbar scroll-smooth snap-x snap-mandatory sm:snap-none"
      >
        <div className="flex gap-3 sm:gap-4 items-stretch min-w-max pb-2">
          {KANBAN_COLUMNS.map((column, colIdx) => {
            const columnTasks = columnTasksMap[column.id] || [];
            const isDragOver = dragOverColumnId === column.id;
            const nextCol = KANBAN_COLUMNS[colIdx + 1];

            return (
              <div
                key={column.id}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragEnter={(e) => handleDragEnter(e, column.id)}
                onDragLeave={(e) => handleDragLeave(e, column.id)}
                onDrop={(e) => handleDrop(e, column.id)}
                className={`flex flex-col w-[85vw] max-w-[320px] sm:w-[295px] sm:max-w-none shrink-0 snap-center sm:snap-align-none rounded-2xl border transition-all duration-200 select-none ${column.accentBorder} ${
                  isDragOver
                    ? 'border-indigo-500 bg-indigo-50/70 dark:border-indigo-500 dark:bg-indigo-950/40 ring-2 ring-indigo-500/40 shadow-lg'
                    : 'border-slate-200/90 bg-slate-50/60 dark:border-slate-800/80 dark:bg-slate-900/60'
                } p-3 h-[calc(100dvh-230px)] sm:h-[calc(100vh-275px)] min-h-[440px] max-h-[calc(100dvh-180px)] sm:max-h-[calc(100vh-220px)]`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/60 dark:border-slate-800/60 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base select-none">{column.icon}</span>
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

                {/* Quick Add Button on To Do column - only if user can create tasks */}
                {column.id === 'todo' && onOpenCreateGeneral && canCreate && (
                  <button
                    onClick={onOpenCreateGeneral}
                    className="mt-2 shrink-0 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-indigo-400 hover:bg-white hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-indigo-500 dark:hover:bg-slate-800"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>New Task</span>
                  </button>
                )}

                {/* Drop Cue when dragging over this column */}
                {isDragOver && (
                  <div className="mt-2 shrink-0 flex items-center justify-center gap-1.5 p-2.5 rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-100/60 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/70 dark:text-indigo-300 font-bold text-xs animate-pulse">
                    <ArrowDown className="h-4 w-4 shrink-0" />
                    <span>Drop in {column.title}</span>
                  </div>
                )}

                {/* Tasks Container with INLINE SCROLL */}
                <div className="mt-2.5 flex-1 min-h-0 space-y-2.5 overflow-y-auto pr-1.5 custom-scrollbar">
                  {columnTasks.length === 0 ? (
                    <div
                      onDragOver={(e) => handleDragOver(e, column.id)}
                      onDrop={(e) => handleDrop(e, column.id)}
                      className={`flex h-44 flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-all ${
                        isDragOver
                          ? 'border-indigo-400 bg-indigo-100/40 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/40 dark:text-indigo-300'
                          : 'border-slate-200/80 dark:border-slate-800/80'
                      }`}
                    >
                      <span className="text-xl opacity-40">{column.icon}</span>
                      <span className="mt-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        No tasks
                      </span>
                      <span className="text-[10px] text-slate-400/80 dark:text-slate-600">
                        Drag card here to move
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
                          className={`group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-indigo-500 ${priorityBorder} ${
                            isDragging
                              ? 'opacity-40 scale-95 ring-2 ring-indigo-500 shadow-xl cursor-grabbing'
                              : 'cursor-grab active:cursor-grabbing'
                          }`}
                        >
                          {/* Top Row: Drag Grabber + Category Pill + Client */}
                          <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Visual Drag Grip Handle */}
                              <span
                                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 shrink-0 cursor-grab active:cursor-grabbing p-0.5"
                                title="Drag to move card to another stage"
                              >
                                <GripVertical className="h-3.5 w-3.5" />
                              </span>

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
                                className="truncate text-[10px] font-semibold text-slate-500 dark:text-slate-400 max-w-[95px]"
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

                              {nextCol && (
                                <button
                                  onClick={(e) => handleQuickAdvance(e, task, column.id)}
                                  title={`Move to ${nextCol.title}`}
                                  className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 flex h-6 w-6 sm:h-5 sm:w-5 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all dark:bg-indigo-950 dark:text-indigo-300"
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
      </div>
    </div>
  );
};

export default TasksKanbanPipeline;
