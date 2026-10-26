import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
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
    icon: '📋',
    activeBg: 'bg-slate-100 dark:bg-slate-800/90',
    activeBorder: 'border-slate-500 dark:border-slate-400',
    activeText: 'text-slate-900 dark:text-slate-100 font-bold',
    activeRing: 'ring-2 ring-slate-400/40',
    indicatorBg: 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900',
    badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
    accentDot: 'bg-slate-600',
  },
  {
    id: 'in_progress',
    label: 'In Development',
    icon: '💻',
    activeBg: 'bg-blue-50/90 dark:bg-blue-950/60',
    activeBorder: 'border-blue-500 dark:border-blue-400',
    activeText: 'text-blue-700 dark:text-blue-300 font-bold',
    activeRing: 'ring-2 ring-blue-500/40',
    indicatorBg: 'bg-blue-600 text-white',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    accentDot: 'bg-blue-600',
  },
  {
    id: 'review',
    label: 'Code Review',
    icon: '🔍',
    activeBg: 'bg-purple-50/90 dark:bg-purple-950/60',
    activeBorder: 'border-purple-500 dark:border-purple-400',
    activeText: 'text-purple-700 dark:text-purple-300 font-bold',
    activeRing: 'ring-2 ring-purple-500/40',
    indicatorBg: 'bg-purple-600 text-white',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    accentDot: 'bg-purple-600',
  },
  {
    id: 'client_approval',
    label: 'Client / UAT',
    icon: '🤝',
    activeBg: 'bg-amber-50/90 dark:bg-amber-950/60',
    activeBorder: 'border-amber-500 dark:border-amber-400',
    activeText: 'text-amber-800 dark:text-amber-300 font-bold',
    activeRing: 'ring-2 ring-amber-500/40',
    indicatorBg: 'bg-amber-600 text-white',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    accentDot: 'bg-amber-600',
  },
  {
    id: 'completed',
    label: 'Completed / Live',
    icon: '🚀',
    activeBg: 'bg-emerald-50/90 dark:bg-emerald-950/60',
    activeBorder: 'border-emerald-500 dark:border-emerald-400',
    activeText: 'text-emerald-700 dark:text-emerald-300 font-bold',
    activeRing: 'ring-2 ring-emerald-500/40',
    indicatorBg: 'bg-emerald-600 text-white',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    accentDot: 'bg-emerald-600',
  },
];

// Content Pipeline Stages for social / creative / marketing tasks
export const CONTENT_PIPELINE_STAGES = [
  {
    id: 'todo',
    label: 'To Do',
    icon: '📋',
    activeBg: 'bg-slate-100 dark:bg-slate-800/90',
    activeBorder: 'border-slate-500 dark:border-slate-400',
    activeText: 'text-slate-900 dark:text-slate-100 font-bold',
    activeRing: 'ring-2 ring-slate-400/40',
    indicatorBg: 'bg-slate-700 text-white dark:bg-slate-200 dark:text-slate-900',
    badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700',
    accentDot: 'bg-slate-600',
  },
  {
    id: 'in_progress',
    label: 'In Progress',
    icon: '⚡',
    activeBg: 'bg-blue-50/90 dark:bg-blue-950/60',
    activeBorder: 'border-blue-500 dark:border-blue-400',
    activeText: 'text-blue-700 dark:text-blue-300 font-bold',
    activeRing: 'ring-2 ring-blue-500/40',
    indicatorBg: 'bg-blue-600 text-white',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-800',
    accentDot: 'bg-blue-600',
  },
  {
    id: 'review',
    label: 'Internal Approval',
    icon: '🔍',
    activeBg: 'bg-purple-50/90 dark:bg-purple-950/60',
    activeBorder: 'border-purple-500 dark:border-purple-400',
    activeText: 'text-purple-700 dark:text-purple-300 font-bold',
    activeRing: 'ring-2 ring-purple-500/40',
    indicatorBg: 'bg-purple-600 text-white',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 border-purple-300 dark:border-purple-800',
    accentDot: 'bg-purple-600',
  },
  {
    id: 'client_approval',
    label: 'Client Approval',
    icon: '🤝',
    activeBg: 'bg-amber-50/90 dark:bg-amber-950/60',
    activeBorder: 'border-amber-500 dark:border-amber-400',
    activeText: 'text-amber-800 dark:text-amber-300 font-bold',
    activeRing: 'ring-2 ring-amber-500/40',
    indicatorBg: 'bg-amber-600 text-white',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300 dark:border-amber-800',
    accentDot: 'bg-amber-600',
  },
  {
    id: 'smm_team',
    label: 'SMM Team',
    icon: '🚀',
    activeBg: 'bg-pink-50/90 dark:bg-pink-950/60',
    activeBorder: 'border-pink-500 dark:border-pink-400',
    activeText: 'text-pink-700 dark:text-pink-300 font-bold',
    activeRing: 'ring-2 ring-pink-500/40',
    indicatorBg: 'bg-pink-600 text-white',
    badge: 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300 border-pink-300 dark:border-pink-800',
    accentDot: 'bg-pink-600',
  },
  {
    id: 'drive_uploaded',
    label: 'Drive Uploaded',
    icon: '☁️',
    activeBg: 'bg-cyan-50/90 dark:bg-cyan-950/60',
    activeBorder: 'border-cyan-500 dark:border-cyan-400',
    activeText: 'text-cyan-700 dark:text-cyan-300 font-bold',
    activeRing: 'ring-2 ring-cyan-500/40',
    indicatorBg: 'bg-cyan-600 text-white',
    badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800',
    accentDot: 'bg-cyan-600',
  },
  {
    id: 'completed',
    label: 'Completed',
    icon: '✅',
    activeBg: 'bg-emerald-50/90 dark:bg-emerald-950/60',
    activeBorder: 'border-emerald-500 dark:border-emerald-400',
    activeText: 'text-emerald-700 dark:text-emerald-300 font-bold',
    activeRing: 'ring-2 ring-emerald-500/40',
    indicatorBg: 'bg-emerald-600 text-white',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
    accentDot: 'bg-emerald-600',
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
      className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all active:scale-95 cursor-pointer select-none"
      title={`Copy ${label}`}
    >
      {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
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
    <div className="fixed inset-0 z-[999] flex justify-end bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative flex h-full w-full max-w-full sm:max-w-2xl flex-col bg-white shadow-2xl dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-6 sm:py-4 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <span
              className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wider shrink-0 ${
                isWebDev
                  ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
                  : 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300'
              }`}
            >
              {isWebDev ? '💻 Tech / Dev' : '🎬 Content'}
            </span>

            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
              {formatTaskTypeLabel(task.taskType)}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenTaskDetail && (
              <button
                type="button"
                onClick={() => onOpenTaskDetail(task._id)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-indigo-400 transition-all cursor-pointer"
                title="Open Full Notion Modal"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Full Details</span>
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm((prev) => !prev)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  showDeleteConfirm
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 ring-1 ring-rose-400'
                    : 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:bg-rose-950/40 dark:hover:text-rose-400'
                }`}
                title="Delete Task"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Delete Task</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 shrink-0 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Alert Banner */}
        {showDeleteConfirm && (
          <div className="border-b border-rose-200 bg-rose-50/95 dark:bg-rose-950/50 dark:border-rose-900/60 px-4 py-3 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200 shrink-0">
            <div className="text-xs text-rose-900 dark:text-rose-200">
              <span className="font-bold">Are you sure you want to delete this task?</span>
              <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                This action cannot be undone and will delete all associated subtasks.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-white dark:text-slate-200 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 cursor-pointer"
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
                className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold text-white hover:bg-rose-700 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3" />
                <span>{deleteTaskMutation.isPending ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 space-y-5 sm:space-y-6 custom-scrollbar">
          {/* 1. Title & Meta Overview */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
              {task.title || task.taskTitle}
            </h2>

            {/* Notion Metadata Tags Bar */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              {/* Client */}
              {(task.clientName || task.client?.name || task.client?.company) && (
                <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-semibold dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
                  <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                  <span>{task.clientName || task.client?.name || task.client?.company}</span>
                </div>
              )}

              {/* Project */}
              {task.project?.name && (
                <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-semibold dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
                  <FolderKanban className="h-3.5 w-3.5 text-sky-500" />
                  <span>{task.project.name}</span>
                </div>
              )}

              {/* Created Date */}
              {task.createdAt && (
                <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-medium dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
                  <Calendar className="h-3.5 w-3.5 text-emerald-500" />
                  <span>
                    Created: {new Date(task.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
              )}

              {/* Due Date & Time */}
              {task.dueDate && (
                <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 font-medium dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <span>
                    Due: {new Date(task.dueDate).toLocaleDateString()}
                    {task.dueTime ? ` at ${task.dueTime}` : ''}
                  </span>
                </div>
              )}

              {/* NF ID */}
              {task.nfId && (
                <div className="flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 font-mono font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
                  <Hash className="h-3 w-3 text-indigo-500" />
                  <span>{task.nfId}</span>
                </div>
              )}

              {/* Priority */}
              <span
                className={`rounded-lg px-2.5 py-1 font-semibold capitalize border ${
                  task.priority === 'urgent'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                    : task.priority === 'high'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
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
            <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/40 p-3.5 dark:border-indigo-900/60 dark:bg-indigo-950/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    Allocated Timer: {task.allocatedHours || 0}h {task.allocatedMinutes || 0}m
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {task.isOverdue ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse">
                      🚨 Overdue
                    </span>
                  ) : task.isAccepted ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                      ⚡ Running
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                      ⏳ Awaiting Acceptance
                    </span>
                  )}
                </div>
              </div>

              {task.actualTimeSpentMinutes && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Actual time spent: {Math.floor(task.actualTimeSpentMinutes / 60)}h {task.actualTimeSpentMinutes % 60}m
                </p>
              )}

              {task.completionReason && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2 text-xs border border-amber-200/60 dark:border-amber-900/40 text-amber-800 dark:text-amber-300">
                  <span className="font-bold">Completion / Delay Note: </span>
                  <span>"{task.completionReason}"</span>
                </div>
              )}
            </div>
          )}

          {/* 3. Assignee & Manager Details */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {assigneeAvatar ? (
                  <img
                    src={assigneeAvatar}
                    alt={assigneeName}
                    className="h-11 w-11 rounded-full object-cover ring-2 ring-indigo-500/20 shadow-sm"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-sm">
                    {assigneeName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Assigned Team Member
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {assigneeName}
                  </p>
                  {assigneeRole && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
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
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
                >
                  <span>Move to {nextStage.label}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Manager info if assigned */}
            {task.assignedManager && (
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-indigo-500" /> Manager:
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-100">
                  {typeof task.assignedManager === 'object' ? task.assignedManager.name : 'Assigned Manager'}
                </span>
              </div>
            )}
          </div>

          {/* 4. WEBSITE / DEV BOARD DETAILS (Shown only for Website / Tech tasks) */}
          {isWebDev && (
            <div className="space-y-3.5">
              {/* Dev Pipeline & Environment Card */}
              <div className="rounded-xl border border-sky-200/80 bg-sky-50/30 p-3.5 dark:border-sky-900/60 dark:bg-sky-950/20 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Development Board Pipeline
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                      {DEV_STAGE_LABELS[task.development?.stage] || task.development?.stage || 'In Development'}
                    </span>
                    {task.development?.environment && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 capitalize">
                        {task.development.environment}
                      </span>
                    )}
                  </div>
                </div>

                {/* Blocked Alert Banner if task is blocked */}
                {task.development?.isBlocked && (
                  <div className="rounded-lg border border-rose-300 bg-rose-50/90 p-3 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                      <span>Task is Currently Blocked</span>
                    </div>
                    <p className="text-[11px]">
                      <span className="font-semibold">Reason: </span>
                      {task.development?.blockedReason || 'No reason specified'}
                    </p>
                  </div>
                )}

                {/* Version Control: Branch, PR, Staging */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400 text-[11px] flex items-center gap-1">
                      <GitBranch className="h-3 w-3 text-indigo-500" /> Branch:
                    </span>
                    <span className="font-mono text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate max-w-[160px]">
                      {task.development?.branch || `feat/${(task.title || task.taskTitle || 'task').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)}`}
                    </span>
                  </div>

                  {task.development?.pullRequestUrl ? (
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400 text-[11px] flex items-center gap-1">
                        <GitPullRequest className="h-3 w-3 text-purple-500" /> Pull Request:
                      </span>
                      <a
                        href={task.development.pullRequestUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-sky-600 hover:underline flex items-center gap-1 text-[11px] truncate max-w-[150px]"
                      >
                        <span>{task.development.pullRequestNumber ? `PR #${task.development.pullRequestNumber}` : 'View PR'}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ) : task.repoLink || task.referenceLink ? (
                    <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400 text-[11px] flex items-center gap-1">
                        <ExternalLink className="h-3 w-3 text-sky-500" /> Tech / Repo:
                      </span>
                      <a
                        href={task.repoLink || task.referenceLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-sky-600 hover:underline flex items-center gap-1 text-[11px] truncate max-w-[160px]"
                      >
                        <span>Open Repo / Spec</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Website Specifications Card */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-950/40 space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-indigo-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Website & Technical Specs
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Website Type
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                      {task.websiteType || 'Custom Website Development'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Domain & Hosting
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                      {[task.domainDetails, task.hostingDetails].filter(Boolean).join(' • ') || 'Configured via client'}
                    </span>
                  </div>
                </div>

                {/* Admin Credentials with Show/Hide & Copy */}
                {task.adminCredentials && (
                  <div className="rounded-lg border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <KeyRound className="h-3.5 w-3.5 text-amber-500" /> Admin Credentials:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowCredentials(!showCredentials)}
                          className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          {showCredentials ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          <span>{showCredentials ? 'Hide' : 'Show'}</span>
                        </button>
                        <CopyButton text={task.adminCredentials} label="Credentials" />
                      </div>
                    </div>
                    <div className="text-xs font-mono bg-slate-50 dark:bg-slate-800 p-2 rounded-md border border-slate-200 dark:border-slate-700 break-all text-slate-800 dark:text-slate-200">
                      {showCredentials ? task.adminCredentials : '••••••••••••••••••••'}
                    </div>
                  </div>
                )}
              </div>

              {/* Code Review & QA Testing Details (if present) */}
              {(task.development?.reviewer || task.development?.tester || task.development?.reviewStatus !== 'none') && (
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-950/40 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Code Review & QA
                    </span>
                    {task.development?.reviewStatus && (
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        task.development.reviewStatus === 'approved'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : task.development.reviewStatus === 'changes_requested'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        Review: {task.development.reviewStatus}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {task.development?.reviewer && (
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">Reviewer</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {task.development.reviewer.name || 'Assigned Reviewer'}
                        </span>
                      </div>
                    )}
                    {task.development?.tester && (
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 block font-semibold">QA Tester</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
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
            <div className="rounded-xl border border-cyan-200/80 bg-cyan-50/30 p-3.5 dark:border-cyan-900/60 dark:bg-cyan-950/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">☁️</span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                      Google Drive Assets
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Edited assets ready for review & posting
                    </p>
                  </div>
                </div>

                {currentStatus !== 'drive_uploaded' && (
                  <button
                    onClick={() => handleStageChange('drive_uploaded')}
                    className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-500 transition-all shadow-xs cursor-pointer"
                  >
                    Move to Drive Uploaded
                  </button>
                )}
              </div>

              {(task.driveUploadLink || task.driveLink || task.rawFootageLink) ? (
                <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg bg-white p-2.5 border border-cyan-100 dark:bg-slate-900 dark:border-slate-800">
                  <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                    {task.driveUploadLink || task.driveLink || task.rawFootageLink}
                  </span>
                  <a
                    href={task.driveUploadLink || task.driveLink || task.rawFootageLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-cyan-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-cyan-500 shrink-0"
                  >
                    <span>Open Drive</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-slate-400 italic">
                  No Drive link attached yet. Upload edited files to Drive and attach the link.
                </p>
              )}
            </div>
          )}

          {/* 6. Dynamic Kanban Pipeline Stage Stepper */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {isWebDev ? 'Dev Workflow Pipeline' : 'Kanban Workflow Stage'}
              </label>
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${currentStageObj.badge}`}
              >
                <span>{currentStageObj.icon}</span>
                <span>Current: {currentStageObj.label}</span>
              </div>
            </div>

            <div className={`grid gap-2.5 ${isWebDev ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3'}`}>
              {pipelineStages.map((stage) => {
                const isActive = stage.id === currentStatus;

                return (
                  <button
                    key={stage.id}
                    type="button"
                    onClick={() => handleStageChange(stage.id)}
                    className={`group relative flex items-center justify-between rounded-xl border p-2.5 text-left text-xs transition-all cursor-pointer select-none active:scale-[0.98] ${
                      isActive
                        ? `${stage.activeBg} ${stage.activeBorder} ${stage.activeText} ${stage.activeRing} shadow-sm font-bold`
                        : 'border-slate-200/90 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isActive ? (
                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-black shadow-xs ${stage.indicatorBg}`}>
                          ✓
                        </span>
                      ) : (
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white group-hover:border-slate-400 dark:border-slate-700 dark:bg-slate-800" />
                      )}
                      <span className="text-sm shrink-0">{stage.icon}</span>
                      <span className="truncate">{stage.label}</span>
                    </div>

                    {isActive && (
                      <span className="shrink-0 flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider opacity-90">
                        <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${stage.accentDot}`} />
                        <span>Active</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 7. Deliverable Checklist Section */}
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-indigo-500" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Deliverable Checklist ({completedChecklistCount}/{checklist.length})
                </h3>
              </div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {progressPercent}% Done
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Checklist Items List */}
            <div className="space-y-2 mb-3">
              {checklist.length === 0 ? (
                <p className="py-2 text-center text-xs text-slate-400">
                  No checklist items yet. Add steps below to track completion.
                </p>
              ) : (
                checklist.map((item, idx) => (
                  <div
                    key={item._id || idx}
                    onClick={() => handleToggleChecklistItem(idx, item.isCompleted)}
                    className={`group flex items-center gap-3 rounded-lg border p-2.5 text-xs cursor-pointer transition-all ${
                      item.isCompleted
                        ? 'border-emerald-200 bg-emerald-50/40 text-slate-500 dark:border-emerald-950 dark:bg-emerald-950/20 dark:text-slate-400'
                        : 'border-slate-200/80 bg-white text-slate-800 hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        item.isCompleted
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-slate-300 bg-white group-hover:border-indigo-400 dark:border-slate-600 dark:bg-slate-800'
                      }`}
                    >
                      {item.isCompleted && <span className="text-[10px] font-bold">✓</span>}
                    </button>
                    <span
                      className={`flex-1 ${
                        item.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
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
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* 8. Brief & Scope / Requirements Card */}
          {(task.description || task.requirementDetails || task.techScope) && (
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-indigo-500" /> Brief & Requirements
                </span>
                <CopyButton
                  text={task.description || task.requirementDetails || task.techScope}
                  label="Brief"
                />
              </div>
              <div className="rounded-lg bg-white p-3 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 whitespace-pre-wrap leading-relaxed">
                {task.description || task.requirementDetails || task.techScope}
              </div>
            </div>
          )}

          {/* 9. Multi-Role Sub-Assignments Card (if any are assigned) */}
          {hasSubAssignments && (
            <div className="rounded-xl border border-purple-200/80 bg-purple-50/20 p-3.5 dark:border-purple-900/40 dark:bg-purple-950/10 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-purple-500" /> Multi-Role Sub-Assignments
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {(task.scriptWriterAssigned || task.scriptWriterName) && (
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">✍️ Scriptwriter</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                      {task.scriptWriterAssigned?.name || task.scriptWriterName}
                    </span>
                  </div>
                )}
                {(task.voiceArtistAssigned || task.voiceArtistName) && (
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">🎙️ Voice Artist</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                      {task.voiceArtistAssigned?.name || task.voiceArtistName}
                    </span>
                  </div>
                )}
                {(task.videographerAssigned || task.videographerName) && (
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">🎥 Videographer</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                      {task.videographerAssigned?.name || task.videographerName}
                    </span>
                  </div>
                )}
                {(task.editorAssigned || task.editorName) && (
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">✂️ Video Editor</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                      {task.editorAssigned?.name || task.editorName}
                    </span>
                  </div>
                )}
                {(task.designerAssigned || task.designerName) && (
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">🎨 Designer</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                      {task.designerAssigned?.name || task.designerName}
                    </span>
                  </div>
                )}
                {(task.publisherAssigned || task.publisherName) && (
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">📱 SMM Publisher</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
                      {task.publisherAssigned?.name || task.publisherName}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 10. Attachments & Completed Files */}
          {(task.attachments?.length > 0 || task.completedFiles?.length > 0) && (
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/40 space-y-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5 text-indigo-500" /> Files & Deliverables
              </span>
              <div className="space-y-1.5">
                {[...(task.attachments || []), ...(task.completedFiles || [])].map((file, i) => (
                  <div
                    key={file._id || i}
                    className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs"
                  >
                    <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                      {file.name || `Attachment #${i + 1}`}
                    </span>
                    <a
                      href={getAssetUrl(file.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-indigo-600 hover:underline flex items-center gap-1 shrink-0"
                    >
                      <span>Download</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 11. Task Notes & Revisions */}
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4 text-indigo-500" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Task Notes & Revisions ({task.taskNotes?.length || 0})
              </h3>
            </div>

            {/* List Notes */}
            <div className="space-y-2.5 mb-4 max-h-56 overflow-y-auto">
              {!task.taskNotes || task.taskNotes.length === 0 ? (
                <p className="py-2 text-center text-xs text-slate-400">
                  No notes added yet. Leave instructions, revision remarks, or feedback below.
                </p>
              ) : (
                task.taskNotes.map((note, idx) => (
                  <div
                    key={note._id || idx}
                    className="rounded-lg border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {note.authorName || 'Team Member'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {note.createdAt
                          ? new Date(note.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
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
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={addNoteMutation.isPending || !newNoteContent.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="h-3 w-3" />
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
