import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import {
  X,
  CheckCircle2,
  Circle,
  Plus,
  Send,
  Building2,
  FolderKanban,
  Calendar,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  ListChecks,
  Trash2,
  Code2,
  GitBranch,
  GitPullRequest,
  Bug,
  AlertTriangle,
  Clock,
  Timer,
  Eye,
  EyeOff,
  Copy,
  Check,
  Globe,
  Server,
  KeyRound,
  ShieldCheck,
  FileText,
  Flame,
  Sparkles,
  Film,
  Scissors,
  Camera,
  Palette,
  Share2,
  Hash,
  User,
  Users,
  Maximize2,
  Download,
  AlertCircle,
  Briefcase,
  Video,
  MapPin,
  ClipboardList,
  Zap,
  Search,
  Rocket,
  UploadCloud,
  Laptop,
  Hourglass,
  Smartphone,
  Mic,
  PenTool,
} from '@/components/ui/muiIcons';
import { useSelector } from 'react-redux';
import {
  useUpdateTaskStatus,
  useUpdateTaskChecklist,
  useAddTaskNote,
  useDeleteTask,
} from '../../hooks/useTasks';
import { normalizeToKanbanColumn } from './TasksKanbanPipeline';
import { getAssetUrl } from '../../utils/assetUrl';
import { isWebsiteTaskType, formatTaskTypeLabel } from '../../utils/taskFields';
import { toast } from 'sonner';

// Helper to detect if a task belongs to website or tech / dev workflow
export const isWebsiteOrDevTask = (task) => {
  if (!task) return false;
  const type = String(task.taskType || '').toLowerCase();
  const cat = String(task.taskCategory || '').toLowerCase();
  const dept = String(task.department || '').toLowerCase();
  return (
    cat === 'tech' ||
    cat === 'development' ||
    dept === 'development' ||
    Boolean(task.development?.isDevTask) ||
    isWebsiteTaskType(task.taskType) ||
    [
      'website_development',
      'website_update',
      'landing_page',
      'bug_fix',
      'seo_work',
      'custom_task',
      'client_support',
      'web_dev',
      'website',
    ].includes(type) ||
    type.includes('website') ||
    type.includes('web') ||
    type.includes('dev') ||
    type.includes('bug')
  );
};

// Dev Board Stages for website / development tasks (NO SMM Team, NO Drive Uploaded)
export const DEV_PIPELINE_STAGES = [
  {
    id: 'todo',
    label: 'To Do',
    Icon: ClipboardList,
    activeBg: 'bg-secondary',
    activeBorder: 'border-foreground/50',
    activeText: 'text-foreground font-bold',
    activeRing: 'ring-1 ring-foreground/20',
    indicatorBg: 'bg-primary text-primary-foreground',
    badge: 'bg-secondary text-foreground border-border',
    accentDot: 'bg-foreground',
  },
  {
    id: 'in_progress',
    label: 'In Development',
    Icon: Laptop,
    activeBg: 'bg-secondary',
    activeBorder: 'border-foreground/50',
    activeText: 'text-foreground font-bold',
    activeRing: 'ring-1 ring-foreground/20',
    indicatorBg: 'bg-primary text-primary-foreground',
    badge: 'bg-secondary text-foreground border-border',
    accentDot: 'bg-foreground',
  },
  {
    id: 'review',
    label: 'Code Review',
    Icon: Search,
    activeBg: 'bg-secondary',
    activeBorder: 'border-foreground/50',
    activeText: 'text-foreground font-bold',
    activeRing: 'ring-1 ring-foreground/20',
    indicatorBg: 'bg-primary text-primary-foreground',
    badge: 'bg-secondary text-foreground border-border',
    accentDot: 'bg-foreground',
  },
  {
    id: 'client_approval',
    label: 'Client / UAT',
    Icon: Users,
    activeBg: 'bg-secondary',
    activeBorder: 'border-foreground/50',
    activeText: 'text-foreground font-bold',
    activeRing: 'ring-1 ring-foreground/20',
    indicatorBg: 'bg-primary text-primary-foreground',
    badge: 'bg-secondary text-foreground border-border',
    accentDot: 'bg-foreground',
  },
  {
    id: 'completed',
    label: 'Completed / Live',
    Icon: Rocket,
    activeBg: 'bg-secondary',
    activeBorder: 'border-foreground/50',
    activeText: 'text-foreground font-bold',
    activeRing: 'ring-1 ring-foreground/20',
    indicatorBg: 'bg-primary text-primary-foreground',
    badge: 'bg-primary text-primary-foreground border-transparent',
    accentDot: 'bg-foreground',
  },
];

// Content Pipeline Stages for social / creative / marketing tasks
export const CONTENT_PIPELINE_STAGES = [
  {
    id: 'todo',
    label: 'To Do',
    Icon: ClipboardList,
    activeBg: 'bg-secondary',
    activeBorder: 'border-foreground/50',
    activeText: 'text-foreground font-bold',
    activeRing: 'ring-1 ring-foreground/20',
    indicatorBg: 'bg-primary text-primary-foreground',
    badge: 'bg-secondary text-foreground border-border',
    accentDot: 'bg-foreground',
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    Icon: Zap,
    activeBg: 'bg-secondary',
    activeBorder: 'border-foreground/50',
    activeText: 'text-foreground font-bold',
    activeRing: 'ring-1 ring-foreground/20',
    indicatorBg: 'bg-primary text-primary-foreground',
    badge: 'bg-secondary text-foreground border-border',
    accentDot: 'bg-foreground',
  },
  {
    id: 'review',
    label: 'Internal Approval',
    Icon: Search,
    activeBg: 'bg-secondary',
    activeBorder: 'border-foreground/50',
    activeText: 'text-foreground font-bold',
    activeRing: 'ring-1 ring-foreground/20',
    indicatorBg: 'bg-primary text-primary-foreground',
    badge: 'bg-secondary text-foreground border-border',
    accentDot: 'bg-foreground',
  },
  {
    id: 'client_approval',
    label: 'Client Approval',
    Icon: Users,
    activeBg: 'bg-secondary',
    activeBorder: 'border-foreground/50',
    activeText: 'text-foreground font-bold',
    activeRing: 'ring-1 ring-foreground/20',
    indicatorBg: 'bg-primary text-primary-foreground',
    badge: 'bg-secondary text-foreground border-border',
    accentDot: 'bg-foreground',
  },
  {
    id: 'smm_team',
    label: 'SMM Team',
    Icon: Rocket,
    activeBg: 'bg-secondary',
    activeBorder: 'border-foreground/50',
    activeText: 'text-foreground font-bold',
    activeRing: 'ring-1 ring-foreground/20',
    indicatorBg: 'bg-primary text-primary-foreground',
    badge: 'bg-secondary text-foreground border-border',
    accentDot: 'bg-foreground',
  },
  {
    id: 'drive_uploaded',
    label: 'Drive Uploaded',
    Icon: UploadCloud,
    activeBg: 'bg-secondary',
    activeBorder: 'border-foreground/50',
    activeText: 'text-foreground font-bold',
    activeRing: 'ring-1 ring-foreground/20',
    indicatorBg: 'bg-primary text-primary-foreground',
    badge: 'bg-secondary text-foreground border-border',
    accentDot: 'bg-foreground',
  },
  {
    id: 'completed',
    label: 'Completed',
    Icon: CheckCircle2,
    activeBg: 'bg-secondary',
    activeBorder: 'border-foreground/50',
    activeText: 'text-foreground font-bold',
    activeRing: 'ring-1 ring-foreground/20',
    indicatorBg: 'bg-primary text-primary-foreground',
    badge: 'bg-primary text-primary-foreground border-transparent',
    accentDot: 'bg-foreground',
  },
];

// Dev stage labels corresponding to dev board
const DEV_STAGE_LABELS = {
  backlog: 'Backlog',
  analysis: 'Analysis / Specs',
  ready_for_dev: 'Ready for Dev',
  in_development: 'In Development',
  code_review: 'Code Review',
  qa_testing: 'QA / Testing',
  client_uat: 'Client / UAT',
  approved: 'Approved',
  deployment: 'Deployment',
  live: 'Live in Production',
  closed: 'Closed',
  blocked: 'Blocked',
};

const CopyButton = ({ text, label = 'Copy' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-secondary hover:bg-muted text-foreground border border-border transition-all active:scale-95 cursor-pointer select-none"
      title={`Copy ${label}`}
    >
      {copied ? <Check size={11} className="text-foreground shrink-0" /> : <Copy size={11} className="shrink-0 text-muted-foreground" />}
      <span>{copied ? 'Copied' : label}</span>
    </button>
  );
};

export const TaskWorkflowDrawer = ({ task, isOpen, onClose, onOpenTaskDetail }) => {
  const { user } = useSelector((state) => state.auth);
  const canDelete = ['superAdmin', 'admin', 'manager', 'organizationOwner'].includes(user?.role);
  const updateStatusMutation = useUpdateTaskStatus();
  const updateChecklistMutation = useUpdateTaskChecklist();
  const addNoteMutation = useAddTaskNote();
  const deleteTaskMutation = useDeleteTask();

  const [optimisticStatus, setOptimisticStatus] = useState(null);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  // Sync / reset optimistic status when task._id changes
  useEffect(() => {
    setOptimisticStatus(null);
    setShowDeleteConfirm(false);
    setShowCredentials(false);
  }, [task?._id]);

  if (!isOpen || !task) return null;

  const isWebDev = isWebsiteOrDevTask(task);
  const pipelineStages = isWebDev ? DEV_PIPELINE_STAGES : CONTENT_PIPELINE_STAGES;

  // Normalized status
  const rawStatus = optimisticStatus || task.status;
  const currentStatus = normalizeToKanbanColumn(rawStatus);

  const currentStageObj =
    pipelineStages.find((st) => st.id === currentStatus) || pipelineStages[0];
  const currentStageIndex = pipelineStages.findIndex((st) => st.id === currentStatus);
  const nextStage = pipelineStages[currentStageIndex + 1];

  // Checklist statistics
  const checklist = Array.isArray(task.checklist) ? task.checklist : [];
  const completedChecklistCount = checklist.filter((item) => item.isCompleted).length;
  const progressPercent =
    checklist.length > 0 ? Math.round((completedChecklistCount / checklist.length) * 100) : 0;

  // Assignee info
  const assignee = Array.isArray(task.assignedTo) && task.assignedTo.length > 0 ? task.assignedTo[0] : null;
  const assigneeName =
    typeof assignee === 'object' ? assignee?.name : task.assignedPersonName || 'Unassigned';
  const assigneeAvatar = typeof assignee === 'object' && assignee?.avatar ? getAssetUrl(assignee.avatar) : null;
  const assigneeRole = typeof assignee === 'object' ? assignee?.position || assignee?.role : '';

  // Has multi-role sub assignments
  const hasSubAssignments = Boolean(
    task.scriptWriterAssigned ||
    task.scriptWriterName ||
    task.voiceArtistAssigned ||
    task.voiceArtistName ||
    task.videographerAssigned ||
    task.videographerName ||
    task.editorAssigned ||
    task.editorName ||
    task.designerAssigned ||
    task.designerName ||
    task.publisherAssigned ||
    task.publisherName
  );

  // Stage Switch Handler
  const handleStageChange = async (targetStageId) => {
    setOptimisticStatus(targetStageId);
    try {
      await updateStatusMutation.mutateAsync({ id: task._id, status: targetStageId });
      toast.success(
        `Moved to ${pipelineStages.find((s) => s.id === targetStageId)?.label || targetStageId}`
      );
    } catch (err) {
      setOptimisticStatus(null);
      toast.error('Failed to change task status');
    }
  };

  // Checklist Toggle Handler
  const handleToggleChecklistItem = async (index, currentChecked) => {
    try {
      await updateChecklistMutation.mutateAsync({
        id: task._id,
        itemIndex: index,
        isCompleted: !currentChecked,
      });
    } catch (err) {
      toast.error('Failed to update checklist item');
    }
  };

  // Add Checklist Item Handler
  const handleAddChecklistItem = async () => {
    if (!newChecklistTitle.trim()) return;
    try {
      await updateChecklistMutation.mutateAsync({
        id: task._id,
        title: newChecklistTitle.trim(),
      });
      setNewChecklistTitle('');
      toast.success('Checklist item added');
    } catch (err) {
      toast.error('Failed to add checklist item');
    }
  };

  // Add Note Handler
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;
    try {
      await addNoteMutation.mutateAsync({
        id: task._id,
        content: newNoteContent.trim(),
      });
      setNewNoteContent('');
      toast.success('Note posted');
    } catch (err) {
      toast.error('Failed to post note');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[999] flex justify-end bg-black/60 animate-in fade-in duration-200">
      <div
        className="relative flex h-full w-full max-w-full sm:max-w-2xl flex-col bg-card text-foreground shadow-2xl border-l border-border animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3.5 sm:px-6 sm:py-4 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wider shrink-0 bg-secondary text-foreground border border-border">
              {isWebDev ? <Laptop className="h-3.5 w-3.5 shrink-0" /> : <Film className="h-3.5 w-3.5 shrink-0" />}
              <span>{isWebDev ? 'Tech / Dev' : 'Content'}</span>
            </span>

            <span className="text-xs font-medium text-muted-foreground truncate">
              {formatTaskTypeLabel(task.taskType)}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/tasks/${task._id}`}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all cursor-pointer shadow-2xs"
              title="Open dedicated full page view"
            >
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">Full Page</span>
            </Link>

            {onOpenTaskDetail && (
              <button
                type="button"
                onClick={() => onOpenTaskDetail(task._id)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-foreground bg-secondary hover:bg-muted border border-border transition-all cursor-pointer"
                title="Open Full Notion Modal"
              >
                <Maximize2 className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Full Details</span>
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm((prev) => !prev)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  showDeleteConfirm
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
                title="Delete Task"
              >
                <Trash2 className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Delete Task</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground shrink-0 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Alert Banner */}
        {showDeleteConfirm && (
          <div className="border-b border-border bg-muted px-4 py-3 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200 shrink-0">
            <div className="text-xs text-foreground">
              <span className="font-bold">Are you sure you want to delete this task?</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                This action cannot be undone and will delete all associated subtasks.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg px-3 py-1 text-xs font-semibold text-foreground bg-card hover:bg-secondary border border-border cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteTaskMutation.isPending}
                onClick={async () => {
                  try {
                    await deleteTaskMutation.mutateAsync(task._id);
                    toast.success('Task deleted successfully');
                    setShowDeleteConfirm(false);
                    onClose();
                  } catch (err) {
                    toast.error(err?.response?.data?.message || 'Failed to delete task');
                  }
                }}
                className="rounded-lg bg-primary text-primary-foreground px-3 py-1 text-xs font-bold hover:opacity-90 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3 shrink-0" />
                <span>{deleteTaskMutation.isPending ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-5 sm:space-y-6 custom-scrollbar">
          {/* 1. Title & Meta Overview */}
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground leading-snug">
              {task.title || task.taskTitle}
            </h2>

            {/* Notion Metadata Tags Bar */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-foreground">
              {/* Client */}
              {(task.clientName || task.client?.name || task.client?.company) && (
                <div className="flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 font-semibold border border-border">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span>{task.clientName || task.client?.name || task.client?.company}</span>
                </div>
              )}

              {/* Project */}
              {task.project?.name && (
                <div className="flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 font-semibold border border-border">
                  <FolderKanban className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span>{task.project.name}</span>
                </div>
              )}

              {/* Created Date */}
              {task.createdAt && (
                <div className="flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 font-medium tabular-nums border border-border">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span>
                    Created: {new Date(task.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              )}

              {/* Due Date & Time */}
              {task.dueDate && (
                <div className="flex items-center gap-1.5 rounded-lg bg-secondary px-2.5 py-1 font-medium tabular-nums border border-border">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span>
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                    {task.dueTime ? ` at ${task.dueTime}` : ''}
                  </span>
                </div>
              )}

              {/* NF ID */}
              {task.nfId && (
                <div className="flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 font-mono font-bold tabular-nums text-foreground border border-border">
                  <Hash className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span>{task.nfId}</span>
                </div>
              )}

              {/* Priority */}
              <span
                className={`rounded-lg px-2.5 py-1 font-semibold capitalize border ${
                  task.priority === 'urgent'
                    ? 'bg-primary text-primary-foreground border-transparent'
                    : task.priority === 'high'
                    ? 'bg-neutral-800 text-white dark:bg-neutral-200 dark:text-neutral-900 border-transparent'
                    : 'bg-secondary text-foreground border-border'
                }`}
              >
                {task.priority || 'medium'} priority
              </span>
            </div>
          </div>

          {/* 2. Timer Allocation & Acceptance Status */}
          {((Number(task.allocatedHours) || 0) > 0 ||
            (Number(task.allocatedMinutes) || 0) > 0 ||
            task.timerExpiresAt ||
            task.completionReason) && (
            <div className="rounded-xl border border-border bg-muted/40 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="font-bold tabular-nums text-foreground">
                    Allocated Timer: {task.allocatedHours || 0}h {task.allocatedMinutes || 0}m
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {task.isOverdue ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      <span>Overdue</span>
                    </span>
                  ) : task.isAccepted ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-foreground border border-border">
                      <Zap className="h-3 w-3 shrink-0 text-muted-foreground" />
                      <span>Running</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                      <Hourglass className="h-3 w-3 shrink-0" />
                      <span>Awaiting Acceptance</span>
                    </span>
                  )}
                </div>
              </div>

              {task.actualTimeSpentMinutes && (
                <p className="text-[11px] tabular-nums text-muted-foreground">
                  Actual time spent: {Math.floor(task.actualTimeSpentMinutes / 60)}h {task.actualTimeSpentMinutes % 60}m
                </p>
              )}

              {task.completionReason && (
                <div className="rounded-lg bg-card p-2 text-xs border border-border text-foreground">
                  <span className="font-bold">Completion / Delay Note: </span>
                  <span>"{task.completionReason}"</span>
                </div>
              )}
            </div>
          )}

          {/* 3. Assignee & Manager Details */}
          <div className="rounded-xl border border-border bg-muted/40 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                {assigneeAvatar ? (
                  <img
                    src={assigneeAvatar}
                    alt={assigneeName}
                    className="h-11 w-11 rounded-full object-cover ring-1 ring-border shadow-sm shrink-0"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-sm shrink-0">
                    {assigneeName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted-foreground">
                    Assigned Team Member
                  </p>
                  <p className="text-sm font-bold text-foreground truncate">
                    {assigneeName}
                  </p>
                  {assigneeRole && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {assigneeRole}
                    </p>
                  )}
                </div>
              </div>

              {/* Next Stage Action Button */}
              {nextStage && (
                <button
                  onClick={() => handleStageChange(nextStage.id)}
                  disabled={updateStatusMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition-all active:scale-95 disabled:opacity-60 cursor-pointer shrink-0"
                >
                  <span>Move to {nextStage.label}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                </button>
              )}
            </div>

            {/* Manager info if assigned */}
            {task.assignedManager && (
              <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 shrink-0" /> Manager:
                </span>
                <span className="font-bold text-foreground">
                  {typeof task.assignedManager === 'object' ? task.assignedManager.name : 'Assigned Manager'}
                </span>
              </div>
            )}
          </div>

          {/* 4. WEBSITE / DEV BOARD DETAILS (Shown only for Website / Tech tasks) */}
          {isWebDev && (
            <div className="space-y-3.5">
              {/* Dev Pipeline & Environment Card */}
              <div className="rounded-xl border border-border bg-muted/40 p-3.5 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Development Board Pipeline
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-secondary text-foreground border border-border">
                      {DEV_STAGE_LABELS[task.development?.stage] || task.development?.stage || 'In Development'}
                    </span>
                    {task.development?.environment && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-muted text-muted-foreground border border-border capitalize">
                        {task.development.environment}
                      </span>
                    )}
                  </div>
                </div>

                {/* Blocked Alert Banner if task is blocked */}
                {task.development?.isBlocked && (
                  <div className="rounded-lg border border-border bg-secondary p-3 text-xs text-foreground space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>Task is Currently Blocked</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">Reason: </span>
                      {task.development?.blockedReason || 'No reason specified'}
                    </p>
                  </div>
                )}

                {/* Version Control: Branch, PR, Staging */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-card border border-border flex items-center justify-between gap-2">
                    <span className="text-muted-foreground text-[11px] flex items-center gap-1 shrink-0">
                      <GitBranch className="h-3 w-3 shrink-0" /> Branch:
                    </span>
                    <span className="font-mono text-[11px] font-bold text-foreground truncate max-w-[160px]">
                      {task.development?.branch || `feat/${(task.title || task.taskTitle || 'task').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)}`}
                    </span>
                  </div>

                  {task.development?.pullRequestUrl ? (
                    <div className="p-2.5 rounded-lg bg-card border border-border flex items-center justify-between gap-2">
                      <span className="text-muted-foreground text-[11px] flex items-center gap-1 shrink-0">
                        <GitPullRequest className="h-3 w-3 shrink-0" /> Pull Request:
                      </span>
                      <a
                        href={task.development.pullRequestUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-foreground hover:underline flex items-center gap-1 text-[11px] truncate max-w-[150px]"
                      >
                        <span className="tabular-nums">{task.development.pullRequestNumber ? `PR #${task.development.pullRequestNumber}` : 'View PR'}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>
                  ) : task.repoLink || task.referenceLink ? (
                    <div className="p-2.5 rounded-lg bg-card border border-border flex items-center justify-between gap-2">
                      <span className="text-muted-foreground text-[11px] flex items-center gap-1 shrink-0">
                        <ExternalLink className="h-3 w-3 shrink-0" /> Tech / Repo:
                      </span>
                      <a
                        href={task.repoLink || task.referenceLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-foreground hover:underline flex items-center gap-1 text-[11px] truncate max-w-[160px]"
                      >
                        <span>Open Repo / Spec</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Website Specifications Card */}
              <div className="rounded-xl border border-border bg-muted/40 p-3.5 space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Website & Technical Specs
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-card border border-border">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Website Type
                    </span>
                    <span className="font-semibold text-foreground mt-0.5 block">
                      {task.websiteType || 'Custom Website Development'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-card border border-border">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                      Domain & Hosting
                    </span>
                    <span className="font-semibold text-foreground mt-0.5 block truncate">
                      {[task.domainDetails, task.hostingDetails].filter(Boolean).join(' • ') || 'Configured via client'}
                    </span>
                  </div>
                </div>

                {/* Admin Credentials with Show/Hide & Copy */}
                {task.adminCredentials && (
                  <div className="rounded-lg border border-border bg-card p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <KeyRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> Admin Credentials:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowCredentials(!showCredentials)}
                          className="text-[11px] font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                        >
                          {showCredentials ? <EyeOff className="h-3 w-3 shrink-0" /> : <Eye className="h-3 w-3 shrink-0" />}
                          <span>{showCredentials ? 'Hide' : 'Show'}</span>
                        </button>
                        <CopyButton text={task.adminCredentials} label="Credentials" />
                      </div>
                    </div>
                    <div className="text-xs font-mono bg-muted p-2 rounded-md border border-border break-all text-foreground">
                      {showCredentials ? task.adminCredentials : '••••••••••••••••••••'}
                    </div>
                  </div>
                )}
              </div>

              {/* Code Review & QA Testing Details (if present) */}
              {(task.development?.reviewer || task.development?.tester || task.development?.reviewStatus !== 'none') && (
                <div className="rounded-xl border border-border bg-muted/40 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> Code Review & QA
                    </span>
                    {task.development?.reviewStatus && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        task.development.reviewStatus === 'approved'
                          ? 'bg-primary text-primary-foreground border-transparent'
                          : 'bg-secondary text-foreground border-border'
                      }`}>
                        Review: {task.development.reviewStatus}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {task.development?.reviewer && (
                      <div className="p-2 rounded-lg bg-card border border-border">
                        <span className="text-[10px] text-muted-foreground block font-semibold">Reviewer</span>
                        <span className="font-bold text-foreground">
                          {task.development.reviewer.name || 'Assigned Reviewer'}
                        </span>
                      </div>
                    )}
                    {task.development?.tester && (
                      <div className="p-2 rounded-lg bg-card border border-border">
                        <span className="text-[10px] text-muted-foreground block font-semibold">QA Tester</span>
                        <span className="font-bold text-foreground">
                          {task.development.tester.name || 'Assigned Tester'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 5. DRIVE ASSETS CARD (Shown ONLY for content / video tasks when applicable, NEVER for website tasks) */}
          {!isWebDev && (task.driveUploadLink || task.driveLink || task.rawFootageLink || task.taskCategory === 'content') && (
            <div className="rounded-xl border border-border bg-muted/40 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary border border-border text-muted-foreground shrink-0">
                    <UploadCloud className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">
                      Google Drive Assets
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                      Edited assets ready for review & posting
                    </p>
                  </div>
                </div>

                {currentStatus !== 'drive_uploaded' && (
                  <button
                    onClick={() => handleStageChange('drive_uploaded')}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 transition-all shadow-xs cursor-pointer shrink-0"
                  >
                    Move to Drive Uploaded
                  </button>
                )}
              </div>

              {(task.driveUploadLink || task.driveLink || task.rawFootageLink) ? (
                <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg bg-card p-2.5 border border-border">
                  <span className="truncate text-xs font-medium text-foreground">
                    {task.driveUploadLink || task.driveLink || task.rawFootageLink}
                  </span>
                  <a
                    href={task.driveUploadLink || task.driveLink || task.rawFootageLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground hover:opacity-90 shrink-0"
                  >
                    <span>Open Drive</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-muted-foreground italic">
                  No Drive link attached yet. Upload edited files to Drive and attach the link.
                </p>
              )}
            </div>
          )}

          {/* 6. Dynamic Kanban Pipeline Stage Stepper */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-foreground">
                {isWebDev ? 'Dev Workflow Pipeline' : 'Kanban Workflow Stage'}
              </label>
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${currentStageObj.badge}`}
              >
                <currentStageObj.Icon className="h-3.5 w-3.5 shrink-0" />
                <span>Current: {currentStageObj.label}</span>
              </div>
            </div>

            <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3">
              {pipelineStages.map((stage) => {
                const isActive = stage.id === currentStatus;
                const StageIcon = stage.Icon;

                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => handleStageChange(stage.id)}
                    className={`group relative flex items-center justify-between rounded-xl border p-2.5 text-left text-xs transition-all cursor-pointer select-none active:scale-[0.98] ${
                      isActive
                        ? `${stage.activeBg} ${stage.activeBorder} ${stage.activeText} ${stage.activeRing} shadow-sm font-bold`
                        : 'border-border bg-card text-muted-foreground hover:border-foreground/30 hover:bg-muted/50 hover:text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isActive ? (
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full shadow-xs ${stage.indicatorBg}`}>
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      ) : (
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border bg-card group-hover:border-foreground/40" />
                      )}
                      <StageIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{stage.label}</span>
                    </div>

                    {isActive && (
                      <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider opacity-90">
                        <span className={`h-1.5 w-1.5 rounded-full ${stage.accentDot}`} />
                        <span>Active</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 7. Deliverable Checklist Section */}
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 shrink-0 text-muted-foreground" />
                <h3 className="text-xs font-bold tabular-nums text-foreground">
                  Deliverable Checklist ({completedChecklistCount}/{checklist.length})
                </h3>
              </div>
              <span className="text-xs font-bold tabular-nums text-foreground">
                {progressPercent}% Done
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Checklist Items List */}
            <div className="space-y-2 mb-3">
              {checklist.length === 0 ? (
                <p className="py-2 text-center text-xs text-muted-foreground">
                  No checklist items yet. Add steps below to track completion.
                </p>
              ) : (
                checklist.map((item, idx) => (
                  <div
                    key={item._id || idx}
                    onClick={() => handleToggleChecklistItem(idx, item.isCompleted)}
                    className={`group flex items-center gap-3 rounded-lg border p-2.5 text-xs cursor-pointer transition-all ${
                      item.isCompleted
                        ? 'border-border bg-muted/60 text-muted-foreground'
                        : 'border-border bg-card text-foreground hover:border-foreground/40'
                    }`}
                  >
                    <button
                      type="button"
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        item.isCompleted
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card group-hover:border-foreground/50'
                      }`}
                    >
                      {item.isCompleted && <Check className="h-2.5 w-2.5 shrink-0" />}
                    </button>
                    <span
                      className={`flex-1 ${
                        item.isCompleted ? 'line-through text-muted-foreground' : ''
                      }`}
                    >
                      {item.title}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Inline Add Checklist Item Input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add next step in checklist (Press Enter)..."
                value={newChecklistTitle}
                onChange={(e) => setNewChecklistTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
                className="flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:border-foreground focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* 8. Brief & Scope / Requirements Card */}
          {(task.description || task.requirementDetails || task.techScope) && (
            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> Brief & Requirements
                </span>
                <CopyButton
                  text={task.description || task.requirementDetails || task.techScope}
                  label="Brief"
                />
              </div>
              <div className="rounded-lg bg-card p-3 text-xs text-foreground border border-border whitespace-pre-wrap leading-relaxed">
                {task.description || task.requirementDetails || task.techScope}
              </div>
            </div>
          )}

          {/* Content & Video Production Specifications Card (Video Type, Reference Link, Format, Shoot, Script, SMM) */}
          {(task.videoType ||
            task.videoFormat ||
            task.videoDuration ||
            task.editingReferenceVideo ||
            task.referenceVideoLink ||
            task.finalVideoDriveLink ||
            task.voiceOverAudioLink ||
            task.musicReferenceLink ||
            task.brandAssetsDriveLink ||
            task.captionOnScreenText ||
            task.onScreenText ||
            task.shootTime ||
            task.shootLocation ||
            task.shootLocationLink ||
            task.requiredShots ||
            task.presenterPerson ||
            (Array.isArray(task.equipmentRequired) && task.equipmentRequired.length > 0) ||
            task.specialInstructions ||
            task.cta ||
            task.coverImageDriveLink ||
            task.publishedPostUrl ||
            (Array.isArray(task.targetSocialPlatforms) && task.targetSocialPlatforms.length > 0) ||
            task.language ||
            task.hookOpeningLine ||
            task.fullScript ||
            task.sceneBySceneInstructions ||
            task.googleDocsLink ||
            task.scriptLink) && (
            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Film className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> Content & Video Production Specifications
                </span>
                {task.videoType && (
                  <span className="px-2 py-0.5 rounded-md bg-primary text-[10px] font-bold text-primary-foreground shadow-2xs shrink-0">
                    {task.videoType}
                  </span>
                )}
              </div>

              {/* Grid of Key Specs: Type, Format, Duration, CTA, Language */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {task.videoType && (
                  <div className="p-2 rounded-lg bg-card border border-border">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Video Type</span>
                    <span className="font-bold text-foreground mt-0.5 block truncate">{task.videoType}</span>
                  </div>
                )}
                {task.videoFormat && (
                  <div className="p-2 rounded-lg bg-card border border-border">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Video Format</span>
                    <span className="font-bold tabular-nums text-foreground mt-0.5 block truncate">{task.videoFormat}</span>
                  </div>
                )}
                {task.videoDuration && (
                  <div className="p-2 rounded-lg bg-card border border-border">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Duration</span>
                    <span className="font-bold tabular-nums text-foreground mt-0.5 block truncate">{task.videoDuration}</span>
                  </div>
                )}
                {task.cta && (
                  <div className="p-2 rounded-lg bg-card border border-border">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Call to Action</span>
                    <span className="font-bold text-foreground mt-0.5 block truncate">{task.cta}</span>
                  </div>
                )}
                {task.language && (
                  <div className="p-2 rounded-lg bg-card border border-border">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Language</span>
                    <span className="font-bold text-foreground mt-0.5 block truncate">{task.language}</span>
                  </div>
                )}
                {task.presenterPerson && (
                  <div className="p-2 rounded-lg bg-card border border-border">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Presenter / Person</span>
                    <span className="font-bold text-foreground mt-0.5 block truncate">{task.presenterPerson}</span>
                  </div>
                )}
                {task.shootTime && (
                  <div className="p-2 rounded-lg bg-card border border-border">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Shoot Time</span>
                    <span className="font-bold tabular-nums text-foreground mt-0.5 block truncate">{task.shootTime}</span>
                  </div>
                )}
                {task.shootLocation && (
                  <div className="p-2 rounded-lg bg-card border border-border">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Shoot Location</span>
                    <span className="font-bold text-foreground mt-0.5 block truncate">{task.shootLocation}</span>
                  </div>
                )}
              </div>

              {/* Reference Videos & Asset Links */}
              <div className="space-y-1.5 pt-1">
                {(task.editingReferenceVideo || task.referenceVideoLink) && (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card border border-border text-xs">
                    <span className="font-semibold text-foreground truncate flex items-center gap-1.5">
                      <Film className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">Reference Video: {task.editingReferenceVideo || task.referenceVideoLink}</span>
                    </span>
                    <a
                      href={task.editingReferenceVideo || task.referenceVideoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-secondary text-foreground font-bold hover:bg-muted border border-border shrink-0"
                    >
                      <span>Watch</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                )}

                {task.finalVideoDriveLink && (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card border border-border text-xs">
                    <span className="font-semibold text-foreground truncate flex items-center gap-1.5">
                      <Video className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">Final Video Drive: {task.finalVideoDriveLink}</span>
                    </span>
                    <a
                      href={task.finalVideoDriveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-secondary text-foreground font-bold hover:bg-muted border border-border shrink-0"
                    >
                      <span>Open</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                )}

                {task.voiceOverAudioLink && (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card border border-border text-xs">
                    <span className="font-semibold text-foreground truncate flex items-center gap-1.5">
                      <Mic className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">Voice-Over Audio Link: {task.voiceOverAudioLink}</span>
                    </span>
                    <a
                      href={task.voiceOverAudioLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-secondary text-foreground font-bold hover:bg-muted border border-border shrink-0"
                    >
                      <span>Listen</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                )}

                {task.musicReferenceLink && (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card border border-border text-xs">
                    <span className="font-semibold text-foreground truncate flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">Music Reference Link: {task.musicReferenceLink}</span>
                    </span>
                    <a
                      href={task.musicReferenceLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-secondary text-foreground font-bold hover:bg-muted border border-border shrink-0"
                    >
                      <span>Open</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                )}

                {task.brandAssetsDriveLink && (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card border border-border text-xs">
                    <span className="font-semibold text-foreground truncate flex items-center gap-1.5">
                      <FolderKanban className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">Brand Assets Drive: {task.brandAssetsDriveLink}</span>
                    </span>
                    <a
                      href={task.brandAssetsDriveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-secondary text-foreground font-bold hover:bg-muted border border-border shrink-0"
                    >
                      <span>Open Drive</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                )}

                {task.shootLocationLink && (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card border border-border text-xs">
                    <span className="font-semibold text-foreground truncate flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">Google Maps Location: {task.shootLocationLink}</span>
                    </span>
                    <a
                      href={task.shootLocationLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-secondary text-foreground font-bold hover:bg-muted border border-border shrink-0"
                    >
                      <span>Open Maps</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                )}

                {(task.googleDocsLink || task.scriptLink) && (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card border border-border text-xs">
                    <span className="font-semibold text-foreground truncate flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">Google Docs Script: {task.googleDocsLink || task.scriptLink}</span>
                    </span>
                    <a
                      href={task.googleDocsLink || task.scriptLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-secondary text-foreground font-bold hover:bg-muted border border-border shrink-0"
                    >
                      <span>Open Docs</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                )}

                {task.coverImageDriveLink && (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card border border-border text-xs">
                    <span className="font-semibold text-foreground truncate flex items-center gap-1.5">
                      <Palette className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">Cover Image / Thumbnail: {task.coverImageDriveLink}</span>
                    </span>
                    <a
                      href={task.coverImageDriveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-secondary text-foreground font-bold hover:bg-muted border border-border shrink-0"
                    >
                      <span>Open</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                )}

                {task.publishedPostUrl && (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card border border-border text-xs">
                    <span className="font-semibold text-foreground truncate flex items-center gap-1.5">
                      <Share2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">Published Post URL: {task.publishedPostUrl}</span>
                    </span>
                    <a
                      href={task.publishedPostUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-primary text-primary-foreground font-bold hover:opacity-90 shrink-0"
                    >
                      <span>View Live Post</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                )}
              </div>

              {/* Equipment Required Pills */}
              {Array.isArray(task.equipmentRequired) && task.equipmentRequired.length > 0 && (
                <div className="p-2.5 rounded-lg bg-card border border-border space-y-1.5 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Equipment Required
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {task.equipmentRequired.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-secondary text-foreground font-bold text-[11px] border border-border"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Target Platforms */}
              {Array.isArray(task.targetSocialPlatforms) && task.targetSocialPlatforms.length > 0 && (
                <div className="p-2.5 rounded-lg bg-card border border-border space-y-1.5 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Target Platforms
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {task.targetSocialPlatforms.map((plat, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-secondary text-foreground font-bold text-[11px] border border-border"
                      >
                        {plat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Hook / Opening Line */}
              {task.hookOpeningLine && (
                <div className="p-2.5 rounded-lg bg-card border border-border text-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Zap className="h-3 w-3 shrink-0" /> Hook / Opening Line
                  </span>
                  <p className="font-semibold text-foreground italic">
                    "{task.hookOpeningLine}"
                  </p>
                </div>
              )}

              {/* Full Script */}
              {(task.fullScript || task.scriptText) && (
                <div className="p-2.5 rounded-lg bg-card border border-border text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <FileText className="h-3 w-3 shrink-0" /> Full Script
                    </span>
                    <CopyButton text={task.fullScript || task.scriptText} label="Copy Script" />
                  </div>
                  <div className="max-h-40 overflow-y-auto whitespace-pre-wrap font-mono text-[11px] text-foreground bg-muted p-2 rounded border border-border custom-scrollbar">
                    {task.fullScript || task.scriptText}
                  </div>
                </div>
              )}

              {/* On-Screen Text / Captions */}
              {(task.captionOnScreenText || task.onScreenText) && (
                <div className="p-2.5 rounded-lg bg-card border border-border text-xs space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <MessageSquare className="h-3 w-3 shrink-0" /> On-Screen Text & Captions
                  </span>
                  <p className="text-foreground whitespace-pre-wrap font-medium">
                    {task.captionOnScreenText || task.onScreenText}
                  </p>
                </div>
              )}

              {/* Required Shots */}
              {(task.requiredShots || task.videographerContentNeeded) && (
                <div className="p-2.5 rounded-lg bg-card border border-border text-xs space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Video className="h-3 w-3 shrink-0" /> Required Shots & Footage List
                  </span>
                  <p className="text-foreground whitespace-pre-wrap font-medium">
                    {task.requiredShots || task.videographerContentNeeded}
                  </p>
                </div>
              )}

              {/* Special Instructions */}
              {task.specialInstructions && (
                <div className="p-2.5 rounded-lg bg-card border border-border text-xs space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <ClipboardList className="h-3 w-3 shrink-0" /> Special Shoot / Editing Instructions
                  </span>
                  <p className="text-foreground whitespace-pre-wrap font-medium">
                    {task.specialInstructions}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 9. Multi-Role Sub-Assignments Card (if any are assigned) */}
          {hasSubAssignments && (
            <div className="rounded-xl border border-border bg-muted/40 p-3.5 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> Multi-Role Sub-Assignments
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {(task.scriptWriterAssigned || task.scriptWriterName) && (
                  <div className="p-2.5 rounded-lg bg-card border border-border">
                    <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 uppercase">
                      <PenTool className="h-3 w-3 shrink-0" /> Scriptwriter
                    </span>
                    <span className="font-bold text-foreground truncate block mt-0.5">
                      {task.scriptWriterAssigned?.name || task.scriptWriterName}
                    </span>
                  </div>
                )}
                {(task.voiceArtistAssigned || task.voiceArtistName) && (
                  <div className="p-2.5 rounded-lg bg-card border border-border">
                    <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 uppercase">
                      <Mic className="h-3 w-3 shrink-0" /> Voice Artist
                    </span>
                    <span className="font-bold text-foreground truncate block mt-0.5">
                      {task.voiceArtistAssigned?.name || task.voiceArtistName}
                    </span>
                  </div>
                )}
                {(task.videographerAssigned || task.videographerName) && (
                  <div className="p-2.5 rounded-lg bg-card border border-border">
                    <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 uppercase">
                      <Video className="h-3 w-3 shrink-0" /> Videographer
                    </span>
                    <span className="font-bold text-foreground truncate block mt-0.5">
                      {task.videographerAssigned?.name || task.videographerName}
                    </span>
                  </div>
                )}
                {(task.editorAssigned || task.editorName) && (
                  <div className="p-2.5 rounded-lg bg-card border border-border">
                    <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 uppercase">
                      <Scissors className="h-3 w-3 shrink-0" /> Video Editor
                    </span>
                    <span className="font-bold text-foreground truncate block mt-0.5">
                      {task.editorAssigned?.name || task.editorName}
                    </span>
                  </div>
                )}
                {(task.designerAssigned || task.designerName) && (
                  <div className="p-2.5 rounded-lg bg-card border border-border">
                    <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 uppercase">
                      <Palette className="h-3 w-3 shrink-0" /> Designer
                    </span>
                    <span className="font-bold text-foreground truncate block mt-0.5">
                      {task.designerAssigned?.name || task.designerName}
                    </span>
                  </div>
                )}
                {(task.publisherAssigned || task.publisherName) && (
                  <div className="p-2.5 rounded-lg bg-card border border-border">
                    <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 uppercase">
                      <Smartphone className="h-3 w-3 shrink-0" /> SMM Publisher
                    </span>
                    <span className="font-bold text-foreground truncate block mt-0.5">
                      {task.publisherAssigned?.name || task.publisherName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 10. Attachments & Completed Files */}
          {(task.attachments?.length > 0 || task.completedFiles?.length > 0) && (
            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> Files & Deliverables
              </span>
              <div className="space-y-1.5">
                {[...(task.attachments || []), ...(task.completedFiles || [])].map((file, i) => (
                  <div
                    key={file._id || i}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card border border-border text-xs"
                  >
                    <span className="truncate font-medium text-foreground">
                      {file.name || `Attachment #${i + 1}`}
                    </span>
                    <a
                      href={getAssetUrl(file.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-foreground hover:underline flex items-center gap-1 shrink-0"
                    >
                      <span>Download</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 11. Task Notes & Revisions */}
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
              <h3 className="text-xs font-bold tabular-nums text-foreground">
                Task Notes & Revisions ({task.taskNotes?.length || 0})
              </h3>
            </div>

            {/* List Notes */}
            <div className="space-y-2.5 mb-4 max-h-56 overflow-y-auto">
              {!task.taskNotes || task.taskNotes.length === 0 ? (
                <p className="py-2 text-center text-xs text-muted-foreground">
                  No notes added yet. Leave instructions, revision remarks, or feedback below.
                </p>
              ) : (
                task.taskNotes.map((note, idx) => (
                  <div
                    key={note._id || idx}
                    className="rounded-lg border border-border bg-card p-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-foreground">
                        {note.authorName || 'Team Member'}
                      </span>
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        {note.createdAt
                          ? new Date(note.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Add Note Form */}
            <form onSubmit={handleAddNote} className="space-y-2">
              <textarea
                rows={2}
                placeholder="Write revision note, client instruction, or manager review..."
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={addNoteMutation.isPending || !newNoteContent.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-xs hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="h-3 w-3 shrink-0" />
                  <span>Post Note</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default TaskWorkflowDrawer;
