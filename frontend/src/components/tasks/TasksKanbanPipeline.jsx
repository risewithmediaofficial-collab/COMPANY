import React, { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
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
  Trash2,
  Clock,
  Timer,
  AlertTriangle,
  Calendar,
  ExternalLink,
  ClipboardList,
  Zap,
  Search,
  Users,
  Rocket,
  UploadCloud,
  CheckCircle2,
  Check,
  Smartphone,
  FileText,
  Maximize2,
  Minimize2,
} from '@/components/ui/muiIcons';
import { useUpdateTaskStatus } from '../../hooks/useTasks';
import { useAutoScrollOnDrag } from '../../hooks/useAutoScrollOnDrag';
import { getAssetUrl } from '../../utils/assetUrl';
import { formatTaskTypeLabel } from '../../utils/taskFields';
import { toast } from 'sonner';

export const KANBAN_COLUMNS = [
  {
    id: 'todo',
    title: 'To Do',
    Icon: ClipboardList,
    color: ' bg-neutral-500/5',
    badge: 'bg-secondary text-secondary-foreground ',
    description: 'Fresh tasks assigned to team',
    accentBorder: ' ',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    Icon: Zap,
    color: ' bg-neutral-500/5',
    badge: 'bg-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100 ',
    description: 'Work actively ongoing',
    accentBorder: ' ',
  },
  {
    id: 'review',
    title: 'Internal Approval',
    Icon: Search,
    color: ' bg-neutral-500/5',
    badge: 'bg-secondary text-foreground ',
    description: 'Internal manager / lead review',
    accentBorder: ' ',
  },
  {
    id: 'client_approval',
    title: 'Client Approval',
    Icon: Users,
    color: ' bg-neutral-500/5',
    badge: 'bg-secondary text-foreground ',
    description: 'Awaiting client feedback/signoff',
    accentBorder: ' ',
  },
  {
    id: 'smm_team',
    title: 'SMM Team',
    Icon: Rocket,
    color: ' bg-neutral-500/5',
    badge: 'bg-secondary text-foreground ',
    description: 'Ready for posting & scheduling',
    accentBorder: ' ',
  },
  {
    id: 'drive_uploaded',
    title: 'Drive Uploaded',
    Icon: UploadCloud,
    color: ' bg-neutral-500/5',
    badge: 'bg-secondary text-foreground ',
    description: 'Edited assets uploaded to Drive',
    accentBorder: ' ',
  },
  {
    id: 'completed',
    title: 'Completed',
    Icon: CheckCircle2,
    color: ' bg-neutral-500/5',
    badge: 'bg-primary text-primary-foreground',
    description: 'Done and published',
    accentBorder: ' ',
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

const renderTimerBadge = (task) => {
  const hasTimer = Boolean(
    (task.allocatedHours && task.allocatedHours > 0) ||
    (task.allocatedMinutes && task.allocatedMinutes > 0) ||
    task.timerExpiresAt
  );
  if (!hasTimer) return null;

  if (task.status === 'completed' || task.submittedAt) {
    return (
      <span
        title={task.submissionStatus === 'completed_with_delay' ? 'Submitted with delay' : 'Completed'}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums bg-primary text-primary-foreground"
      >
        <Check className="h-2.5 w-2.5 shrink-0" />
        <span>{task.actualTimeSpentMinutes ? `${Math.floor(task.actualTimeSpentMinutes / 60)}h ${task.actualTimeSpentMinutes % 60}m` : 'Done'}</span>
      </span>
    );
  }

  if (task.isOverdue) {
    return (
      <span
        title="Timer expired! Task is overdue"
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 "
      >
        <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
        <span>Overdue</span>
      </span>
    );
  }

  if (task.isAccepted && task.timerExpiresAt) {
    const remainingMs = new Date(task.timerExpiresAt).getTime() - Date.now();
    const remainingMins = Math.max(0, Math.floor(remainingMs / 60000));
    const h = Math.floor(remainingMins / 60);
    const m = remainingMins % 60;
    return (
      <span
        title={`Timer active: ${h}h ${m}m remaining`}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums bg-secondary text-foreground "
      >
        <Timer className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
        <span>{h > 0 ? `${h}h ${m}m` : `${m}m`} left</span>
      </span>
    );
  }

  return (
    <span
      title={`Allocated: ${task.allocatedHours || 0}h ${task.allocatedMinutes || 0}m (Awaiting acceptance)`}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium tabular-nums bg-muted text-muted-foreground "
    >
      <Clock className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
      <span>{task.allocatedHours || 0}h{task.allocatedMinutes ? ` ${task.allocatedMinutes}m` : ''}</span>
    </span>
  );
};

export const TasksKanbanPipeline = React.memo(({
  tasks = [],
  onSelectTask,
  onOpenCreateGeneral,
  canCreate = true,
  canDelete = false,
  onDeleteTask,
}) => {
  const updateStatusMutation = useUpdateTaskStatus();
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumnId, setDragOverColumnId] = useState(null);
  const [expandedTaskIds, setExpandedTaskIds] = useState({});
  const boardContainerRef = useRef(null);

  const toggleTaskExpand = (e, taskId) => {
    e.stopPropagation();
    setExpandedTaskIds((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

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
      <div className="flex items-center justify-between pb-2.5 px-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground text-xs tracking-tight">
            Workflow Board
          </span>
          <span className="hidden sm:inline text-[11px] text-muted-foreground">
            • Drag & drop cards across all 7 stages
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground mr-1 tabular-nums">
            7 Stages in Row
          </span>
          <button
            type="button"
            onClick={() => scrollBoard('left')}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-card text-muted-foreground transition-all hover:bg-secondary hover:text-foreground cursor-pointer"
            title="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scrollBoard('right')}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-card text-muted-foreground transition-all hover:bg-secondary hover:text-foreground cursor-pointer"
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
          const ColIcon = col.Icon;
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
              className="inline-flex items-center gap-1.5 shrink-0 rounded-lg bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground "
            >
              <ColIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span>{col.title}</span>
              <span className="rounded-full bg-secondary px-1.5 text-[10px] tabular-nums text-muted-foreground">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Single-Row Horizontal Kanban Track */}
      <div
        ref={boardContainerRef}
        className="w-full overflow-x-auto pb-4 pt-1 custom-scrollbar scroll-smooth snap-x snap-mandatory sm:snap-none responsive-table-container"
      >
        <div className="flex gap-3 sm:gap-4 items-stretch min-w-max pb-2">
          {KANBAN_COLUMNS.map((column, colIdx) => {
            const columnTasks = columnTasksMap[column.id] || [];
            const isDragOver = dragOverColumnId === column.id;
            const nextCol = KANBAN_COLUMNS[colIdx + 1];
            const ColumnIcon = column.Icon;

            return (
              <div
                key={column.id}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragEnter={(e) => handleDragEnter(e, column.id)}
                onDragLeave={(e) => handleDragLeave(e, column.id)}
                onDrop={(e) => handleDrop(e, column.id)}
                className={`flex flex-col w-[85vw] max-w-[320px] sm:w-[295px] sm:max-w-none shrink-0 snap-center sm:snap-align-none rounded-xl transition-all duration-200 select-none ${column.accentBorder} ${
                  isDragOver
                    ? ' bg-secondary ring-2 ring-neutral-500/30 shadow-lg'
                    : ' bg-muted/40'
                } p-3 h-[calc(100dvh-230px)] sm:h-[calc(100vh-275px)] min-h-[440px] max-h-[calc(100dvh-180px)] sm:max-h-[calc(100vh-220px)]`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2.5 shrink-0">
                  <div className="flex items-center gap-2">
                    <ColumnIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <h3 className="text-xs font-bold tracking-tight text-foreground">
                      {column.title}
                    </h3>
                  </div>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
                      columnTasks.length > 0
                        ? column.badge
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {columnTasks.length}
                  </span>
                </div>

                {/* Quick Add Button on To Do column - only if user can create tasks */}
                {column.id === 'todo' && onOpenCreateGeneral && canCreate && (
                  <button
                    onClick={onOpenCreateGeneral}
                    className="mt-2 shrink-0 flex w-full items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    <span>New Task</span>
                  </button>
                )}

                {/* Drop Cue when dragging over this column */}
                {isDragOver && (
                  <div className="mt-2 shrink-0 flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-secondary text-foreground font-bold text-xs">
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
                      className={`flex h-44 flex-col items-center justify-center rounded-xl text-center transition-all ${
                        isDragOver
                          ? ' bg-secondary text-foreground'
                          : ''
                      }`}
                    >
                      <ColumnIcon className="h-6 w-6 text-muted-foreground opacity-40" />
                      <span className="mt-1.5 text-[11px] font-medium text-muted-foreground">
                        No tasks
                      </span>
                      <span className="text-[10px] text-muted-foreground/70">
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
                          ? (assignee?.name || 'Unassigned')
                          : task.assignedPersonName || 'Unassigned';
                      const assigneeAvatar =
                        typeof assignee === 'object' && assignee?.avatar
                          ? getAssetUrl(assignee.avatar)
                          : null;
                      const initials = (assigneeName || 'Unassigned')
                        .split(' ')
                        .filter(Boolean)
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase() || 'U';

                      // Checklist status
                      const checklist = Array.isArray(task.checklist) ? task.checklist : [];
                      const completedChecklistCount = checklist.filter((i) => i.isCompleted).length;
                      const hasChecklist = checklist.length > 0;

                      // Notes count
                      const notesCount = task.taskNotes?.length || 0;

                      // Priority left borders (monochrome tonal hierarchy)
                      const priority = (task.priority || 'medium').toLowerCase();
                      const priorityBorder =
                        priority === 'urgent'
                          ? ' '
                          : priority === 'high'
                          ? ' '
                          : ' ';

                      const isDragging = draggedTaskId === task._id;
                      const isExpanded = Boolean(expandedTaskIds[task._id]);
                      const categoryLabel = formatTaskTypeLabel(task.taskType) || task.taskType || (task.taskCategory === 'content' ? 'Content' : 'Task');
                      const tasksCountLabel = hasChecklist
                        ? `${completedChecklistCount}/${checklist.length} tasks`
                        : `${checklist.length} tasks`;

                      return (
                        <div
                          key={task._id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task)}
                          onDragEnd={handleDragEnd}
                          onClick={() => onSelectTask && onSelectTask(task)}
                          className={`group relative flex flex-col justify-between rounded-xl bg-card p-3 transition-all duration-200 hover:-translate-y-0.5 ${priorityBorder} ${
                            isDragging
                              ? 'opacity-40 scale-95 ring-2 ring-neutral-500 shadow-xl cursor-grabbing'
                              : 'cursor-grab active:cursor-grabbing'
                          }`}
                        >
                          {/* Compact Initial Row 1: Drag Grip + Name + Enlarge Button */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-1.5 min-w-0 flex-1">
                              <span
                                className="text-muted-foreground hover:text-foreground shrink-0 cursor-grab active:cursor-grabbing pt-0.5"
                                title="Drag to move card to another stage"
                              >
                                <GripVertical className="h-3.5 w-3.5" />
                              </span>
                              <h4
                                title={task.title || task.taskTitle}
                                className="line-clamp-2 text-xs font-bold text-foreground leading-snug group-hover:underline"
                              >
                                {task.title || task.taskTitle}
                              </h4>
                            </div>

                            <button
                              type="button"
                              onClick={(e) => toggleTaskExpand(e, task._id)}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-secondary/80 hover:bg-secondary text-foreground text-[10px] font-semibold shrink-0 transition-colors cursor-pointer"
                              title={isExpanded ? 'Collapse card' : 'Enlarge card'}
                              aria-label={isExpanded ? 'Collapse card' : 'Enlarge card'}
                            >
                              {isExpanded ? <Minimize2 size={10} /> : <Maximize2 size={10} />}
                              <span>{isExpanded ? 'Less' : 'Enlarge'}</span>
                            </button>
                          </div>

                          {/* Compact Initial Row 2: Category + Tasks */}
                          <div className="mt-2 flex items-center justify-between gap-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold bg-secondary text-foreground max-w-[155px] truncate">
                              {task.taskCategory === 'content' ? (
                                <Video className="h-2.5 w-2.5 shrink-0" />
                              ) : (
                                <Code2 className="h-2.5 w-2.5 shrink-0" />
                              )}
                              <span className="truncate">{categoryLabel}</span>
                            </span>

                            <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold bg-secondary/70 text-foreground tabular-nums">
                              <ListChecks className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                              <span>{tasksCountLabel}</span>
                            </span>
                          </div>

                          {/* Remaining Details Revealed When Enlarged */}
                          {isExpanded && (
                            <div className="mt-2.5 pt-2 space-y-2">
                              {/* Meta Pills: Client, Publisher, Drive, Timer */}
                              {(task.clientName || task.publisherName || task.driveUploadLink || task.driveLink || task.rawFootageLink || task.allocatedHours > 0 || task.allocatedMinutes > 0 || task.timerExpiresAt) && (
                                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {task.publisherName && (
                                      <span
                                        title={`SMM Assigned: ${task.publisherName}`}
                                        className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-foreground"
                                      >
                                        <Smartphone className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                                        <span>{task.publisherName}</span>
                                      </span>
                                    )}

                                    {(task.driveUploadLink || task.driveLink || task.rawFootageLink) && (
                                      <a
                                        href={task.driveUploadLink || task.driveLink || task.rawFootageLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-foreground hover:bg-muted"
                                        title="Open Google Drive Files"
                                      >
                                        <UploadCloud className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
                                        <span>Drive</span>
                                      </a>
                                    )}

                                    {renderTimerBadge(task)}
                                  </div>

                                  {task.clientName && (
                                    <span
                                      title={task.clientName}
                                      className="truncate text-[10px] font-semibold text-muted-foreground max-w-[115px]"
                                    >
                                      {task.clientName}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Submission Delay Reason Preview */}
                              {task.completionReason && (
                                <div
                                  className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 truncate"
                                  title={`Delay/Completion Reason: ${task.completionReason}`}
                                >
                                  <FileText className="h-2.5 w-2.5 shrink-0" />
                                  <span className="truncate">Reason: {task.completionReason}</span>
                                </div>
                              )}

                              {/* Created & Due Date */}
                              {task.createdAt && (
                                <div
                                  title={`Created: ${new Date(task.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`}
                                  className="flex items-center gap-1.5 flex-wrap text-[10px] text-muted-foreground font-medium tabular-nums"
                                >
                                  <span className="inline-flex items-center gap-1">
                                    <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <span>Created {new Date(task.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                  </span>
                                  {task.dueDate && (
                                    <span className="inline-flex items-center gap-1">
                                      <span className="text-border">•</span>
                                      <Clock className="h-2.5 w-2.5 shrink-0" />
                                      <span>Due {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Checklist Progress Bar */}
                              {hasChecklist && (
                                <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-2 py-1">
                                  <div className="flex items-center gap-1.5 text-[10px] font-semibold tabular-nums text-foreground">
                                    <ListChecks className="h-3 w-3 shrink-0 text-muted-foreground" />
                                    <span>
                                      {completedChecklistCount}/{checklist.length} Steps
                                    </span>
                                  </div>

                                  <div className="h-1.5 w-12 overflow-hidden rounded-full bg-border">
                                    <div
                                      className="h-full bg-primary transition-all"
                                      style={{
                                        width: `${Math.round(
                                          (completedChecklistCount / checklist.length) * 100
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Assigned Employee & Footer Actions */}
                              <div className="pt-1 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0" title={`Assigned to: ${assigneeName}`}>
                                  {assigneeAvatar ? (
                                    <img
                                      src={assigneeAvatar}
                                      alt={assigneeName}
                                      className="h-5 w-5 rounded-full object-cover ring-1 ring-border shrink-0"
                                    />
                                  ) : (
                                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground shrink-0">
                                      {initials}
                                    </div>
                                  )}
                                  <span className="truncate text-[11px] font-semibold text-foreground">
                                    {assigneeName}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  {notesCount > 0 && (
                                    <span
                                      title={`${notesCount} notes`}
                                      className="flex items-center gap-0.5 text-[10px] tabular-nums text-muted-foreground"
                                    >
                                      <MessageSquare className="h-3 w-3 shrink-0" />
                                      <span>{notesCount}</span>
                                    </span>
                                  )}

                                  {canDelete && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeleteTask && onDeleteTask(task);
                                      }}
                                      title="Delete Task"
                                      className="flex h-6 w-6 sm:h-5 sm:w-5 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer"
                                    >
                                      <Trash2 className="h-3 w-3 shrink-0" />
                                    </button>
                                  )}

                                  <Link
                                    to={`/tasks/${task._id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    title="Open Full View"
                                    className="flex h-6 w-6 sm:h-5 sm:w-5 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer"
                                  >
                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                  </Link>

                                  {nextCol && (
                                    <button
                                      onClick={(e) => handleQuickAdvance(e, task, column.id)}
                                      title={`Move to ${nextCol.title}`}
                                      className="flex h-6 w-6 sm:h-5 sm:w-5 items-center justify-center rounded-md bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
                                    >
                                      <ArrowRight className="h-3 w-3 shrink-0" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
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
});

export default TasksKanbanPipeline;
