import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProgressUpdateForm } from './ProgressUpdateForm';
import { useAddCompletedFiles, useTask, useUpdateTaskStatus, useDeleteTask } from '../../hooks/useTasks';
import { AddTaskModal } from '../modals/AddTaskModal';
import { KanbanCreateTaskModal } from '../tasks/KanbanCreateTaskModal';
import { TaskCountdownTimer } from '../tasks/TaskCountdownTimer';
import { TaskSubmitModal } from '../tasks/TaskSubmitModal';
import {
  CheckSquare,
  Edit,
  Plus,
  Copy,
  Check,
  Calendar,
  Clock,
  User,
  Users,
  Building2,
  Briefcase,
  FileText,
  Video,
  Film,
  Sparkles,
  ExternalLink,
  Download,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Layers,
  UploadCloud,
  Tag,
  Hash,
  MessageSquare,
  Globe,
  FolderArchive,
  ArrowUpRight,
  Flame,
  ShieldCheck,
  ChevronDown,
  Code2,
  GitBranch,
  GitPullRequest,
  Bug,
  AlertTriangle,
  Trash2,
  Scissors,
  Camera,
  Palette,
  Share2,
  MapPin,
  Mic,
  ClipboardList,
  Target,
  Laptop,
  Link2,
} from '@/components/ui/muiIcons';
import {
  formatTaskTypeLabel,
  isWebsiteTaskType,
  normalizeTaskStatusLabel,
  TASK_STATUS_OPTIONS,
  TEAM_STATUS_OPTIONS,
  uploadFiles,
} from '../../utils/taskFields';
import { getAssetUrl } from '../../utils/assetUrl';
import { toast } from 'sonner';

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

const STATUS_TONES = {
  'To Do': 'bg-secondary/70 text-muted-foreground ',
  'On Process': 'bg-secondary text-foreground ',
  'Waiting for Client': 'bg-secondary/90 text-foreground ',
  Completed: 'bg-primary text-primary-foreground ',
  Rework: 'bg-foreground/10 text-foreground ',
  Approved: 'bg-primary text-primary-foreground ',
  'Rework Completed': 'bg-secondary text-foreground ',
  'Review Required': 'bg-secondary text-foreground ',
};

const PRIORITY_TONES = {
  Low: 'bg-secondary/60 text-muted-foreground ',
  Medium: 'bg-secondary text-foreground ',
  High: 'bg-foreground/10 text-foreground font-semibold',
  Urgent: 'bg-primary text-primary-foreground font-bold',
};

const getCategoryIcon = (category, type) => {
  const cat = (category || '').toLowerCase();
  const t = (type || '').toLowerCase();
  if (t.includes('reel') || t.includes('video') || t.includes('youtube')) return <Film className="text-foreground" size={18} />;
  if (t.includes('poster') || t.includes('design') || t.includes('carousel')) return <Sparkles className="text-foreground" size={18} />;
  if (t.includes('website') || t.includes('landing')) return <Globe className="text-foreground" size={18} />;
  if (cat.includes('content')) return <FileText className="text-foreground" size={18} />;
  return <Layers className="text-foreground" size={18} />;
};

const NotionPropertyRow = ({ icon: Icon, label, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 py-2 px-2.5 rounded-xl hover:bg-secondary/40 transition-colors">
    <div className="flex items-center gap-2 w-auto sm:w-36 md:w-40 shrink-0 text-xs font-semibold text-muted-foreground select-none">
      <Icon size={13} className="shrink-0 text-muted-foreground" />
      <span className="truncate">{label}</span>
    </div>
    <div className="flex-1 min-w-0 text-xs sm:text-sm font-medium text-foreground">
      {children}
    </div>
  </div>
);

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
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all active:scale-95 cursor-pointer select-none"
      title={`Copy ${label}`}
    >
      {copied ? <Check size={12} className="text-foreground" /> : <Copy size={12} />}
      <span>{copied ? 'Copied' : label}</span>
    </button>
  );
};

export const TaskDetailModal = ({ taskId, open, onOpenChange }) => {
  const { data: task, isLoading, refetch } = useTask(taskId);
  const { user } = useSelector((state) => state.auth);
  const updateStatus = useUpdateTaskStatus();
  const addCompletedFiles = useAddCompletedFiles();

  const [activeTab, setActiveTab] = useState('brief');
  const [completedFiles, setCompletedFiles] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showAssignAnotherModal, setShowAssignAnotherModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);

  const isEmployee = user?.role === 'employee';
  const isClient = user?.role === 'client';
  const canEdit = ['superAdmin', 'admin', 'manager', 'organizationOwner'].includes(user?.role);
  const canDelete = ['superAdmin', 'admin', 'manager', 'organizationOwner'].includes(user?.role);
  const deleteTaskMutation = useDeleteTask();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const allowedStatusOptions = isEmployee ? TEAM_STATUS_OPTIONS : TASK_STATUS_OPTIONS;

  const assigneesList = useMemo(() => {
    if (!task?.assignedTo) return [];
    return Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo];
  }, [task?.assignedTo]);

  const handleUploadCompletedFiles = async () => {
    if (!completedFiles.length) return;
    try {
      const uploaded = await uploadFiles(completedFiles);
      await addCompletedFiles.mutateAsync({ id: taskId, completedFiles: uploaded });
      setCompletedFiles([]);
      toast.success('Completed deliverables uploaded successfully!');
      refetch();
    } catch {
      toast.error('Failed to upload completed files');
    }
  };

  if (!open) return null;

  const normalizedStatus = normalizeTaskStatusLabel(task?.status);
  const hasPipeline = Boolean(
    task?.scriptWriterAssigned ||
    task?.voiceArtistAssigned ||
    task?.videographerAssigned ||
    task?.editorAssigned ||
    task?.publisherAssigned ||
    task?.designerAssigned ||
    task?.voiceScriptText ||
    task?.videographerContentNeeded ||
    task?.shootDate ||
    task?.editDueDate ||
    task?.designDueDate ||
    (task?.postingPlatforms && task.postingPlatforms.length > 0)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" noPadding className="flex flex-col min-h-0 p-0 overflow-hidden bg-card ">
        {/* ── Sticky Pinned Header ── */}
        <DialogHeader className="px-4 sm:px-6 py-3.5 sm:py-4 bg-card shrink-0 pr-14 sm:pr-24 select-none mb-0 pb-3.5 sm:pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary shrink-0">
                {task ? getCategoryIcon(task.taskCategory, task.taskType) : <CheckSquare size={17} />}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm sm:text-lg font-bold text-foreground truncate">
                  {isLoading ? 'Loading task...' : task?.taskTitle || task?.title || 'Task Details'}
                </DialogTitle>
                <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                  {task?.client?.name && (
                    <span className="font-semibold text-foreground truncate max-w-[160px]">{task.client.name}</span>
                  )}
                  {task?.project?.name && (
                    <>
                      <span>•</span>
                      <span className="truncate max-w-[140px] sm:max-w-none">{task.project.name}</span>
                    </>
                  )}
                  {task?.createdAt && (
                    <>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-foreground bg-secondary px-2 py-0.5 rounded-md tabular-nums">
                        <Calendar size={11} className="text-muted-foreground shrink-0" />
                        <span>Created {new Date(task.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </span>
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {task?._id && (
                <Link
                  to={`/tasks/${task._id}`}
                  className="h-7 sm:h-8 px-2 sm:px-2.5 rounded-xl bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground text-xs font-bold inline-flex items-center gap-1.5 transition-all "
                  title="Open dedicated full page view"
                >
                  <ExternalLink size={12} />
                  <span>Full View</span>
                </Link>
              )}
              {task?.isOverTarget && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-2 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase">
                  <AlertCircle size={11} />
                  <span>Over Task</span>
                </span>
              )}
              {task?.priority && (
                <span className={`px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-semibold ${PRIORITY_TONES[task.priority] || PRIORITY_TONES.Medium}`}>
                  {task.priority}
                </span>
              )}
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="h-7 sm:h-8 px-2 sm:px-2.5 rounded-xl text-xs font-bold hover:bg-secondary inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit size={12} />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              )}
              {canDelete && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm((prev) => !prev)}
                  className={`h-7 sm:h-8 px-2 sm:px-2.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                    showDeleteConfirm
                      ? 'bg-primary text-primary-foreground '
                      : ' text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                  title="Delete Task"
                >
                  <Trash2 size={12} />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Delete Confirmation Alert Banner */}
        {showDeleteConfirm && (
          <div className="bg-secondary px-4 py-3 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200 shrink-0 select-none">
            <div className="text-xs text-foreground">
              <span className="font-bold">Are you sure you want to delete this task?</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">This action cannot be undone and will delete all associated subtasks.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg px-3 py-1 text-xs font-semibold text-foreground bg-background hover:bg-card cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteTaskMutation.isLoading}
                onClick={async () => {
                  try {
                    await deleteTaskMutation.mutateAsync(taskId);
                    toast.success('Task deleted successfully');
                    setShowDeleteConfirm(false);
                    onOpenChange(false);
                  } catch (err) {
                    toast.error(err?.response?.data?.message || 'Failed to delete task');
                  }
                }}
                className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={12} />
                <span>{deleteTaskMutation.isLoading ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ── Scrollable Body ── */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 pb-12 custom-scrollbar space-y-4 sm:space-y-5 overflow-x-hidden">
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-32 rounded-3xl bg-secondary " />
              <div className="h-64 rounded-3xl bg-secondary " />
            </div>
          ) : task ? (
            <>
              {task?.isOverTarget && (
                <div className="flex items-center gap-2 rounded-2xl bg-secondary p-3 text-xs font-bold text-foreground">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>Over Target Task — This deliverable exceeded the configured monthly quota.</span>
                </div>
              )}

              {/* ── Task Countdown Timer & Acceptance Banner ── */}
              <TaskCountdownTimer
                task={task}
                onOpenSubmitModal={() => setShowSubmitModal(true)}
              />

              {/* ── Notion Property Matrix Card ── */}
              <div className="rounded-2xl bg-background p-3 sm:p-4 space-y-1">
                {!isClient && (
                  <NotionPropertyRow icon={ShieldCheck} label="Status">
                    <div className="relative inline-flex items-center">
                      <select
                        value={normalizedStatus}
                        onChange={(e) => updateStatus.mutate({ id: task._id, status: e.target.value })}
                        className={`appearance-none cursor-pointer pl-3 pr-8 py-1 rounded-lg text-xs font-bold transition-all outline-none focus:ring-2 focus:ring-primary/20 ${
                          STATUS_TONES[normalizedStatus] || STATUS_TONES['To Do']
                        }`}
                        title="Change Task Status"
                      >
                        {allowedStatusOptions.map((opt) => (
                          <option key={opt} value={opt} className="bg-card text-foreground font-semibold py-1">
                            {opt}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={13} className="absolute right-2.5 pointer-events-none opacity-60 shrink-0" />
                    </div>
                  </NotionPropertyRow>
                )}

                <NotionPropertyRow icon={Users} label="Assignees">
                  {assigneesList.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {assigneesList.map((assignee, idx) => {
                        const name = typeof assignee === 'object' ? assignee.name : assignee;
                        const avatar = typeof assignee === 'object' ? assignee.avatar : null;
                        return (
                          <span key={idx} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-card text-xs font-semibold">
                            {avatar ? (
                              <img src={getAssetUrl(avatar)} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                            ) : (
                              <User size={11} className="text-muted-foreground" />
                            )}
                            <span>{name || 'Team Member'}</span>
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic text-xs">Unassigned</span>
                  )}
                </NotionPropertyRow>

                {task.assignedManager && (
                  <NotionPropertyRow icon={User} label="Manager">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-card text-xs font-semibold">
                      {task.assignedManager.avatar ? (
                        <img src={getAssetUrl(task.assignedManager.avatar)} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                      ) : (
                        <User size={11} className="text-muted-foreground" />
                      )}
                      <span>{task.assignedManager.name || 'Manager'}</span>
                    </span>
                  </NotionPropertyRow>
                )}

                {task.nfId && (
                  <NotionPropertyRow icon={Hash} label="NF ID">
                    <span className="font-mono font-bold text-xs text-foreground tabular-nums">{task.nfId}</span>
                  </NotionPropertyRow>
                )}

                <NotionPropertyRow icon={Tag} label="Task Type">
                  <span className="font-semibold text-foreground text-xs">{formatTaskTypeLabel(task.taskType)}</span>
                </NotionPropertyRow>

                {/* Created Date */}
                <NotionPropertyRow icon={Calendar} label="Created Date">
                  <span className="text-foreground font-semibold text-xs tabular-nums">
                    {task.createdAt ? new Date(task.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                  </span>
                </NotionPropertyRow>

                <NotionPropertyRow icon={Clock} label="Due Date">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-foreground font-semibold text-xs tabular-nums">
                      {task.dueDate ? new Date(task.dueDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not set'}
                    </span>
                    {task.dueTime && (
                      <span className="px-2 py-0.5 rounded-md bg-secondary text-[11px] font-bold text-muted-foreground tabular-nums">
                        Time: {task.dueTime}
                      </span>
                    )}
                  </div>
                </NotionPropertyRow>

                {((Number(task.allocatedHours) || 0) > 0 || (Number(task.allocatedMinutes) || 0) > 0) && (
                  <NotionPropertyRow icon={Clock} label="Timer Allocation">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-foreground font-bold text-xs tabular-nums">
                        {task.allocatedHours || 0}h {task.allocatedMinutes || 0}m
                      </span>
                      {task.isAccepted ? (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          task.isOverdue
                            ? 'bg-primary text-primary-foreground '
                            : 'bg-secondary text-foreground '
                        }`}>
                          {task.isOverdue ? 'Overdue' : 'Running'}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary text-muted-foreground ">
                          Awaiting Acceptance
                        </span>
                      )}
                    </div>
                  </NotionPropertyRow>
                )}

                {task.completionReason && (
                  <NotionPropertyRow icon={AlertCircle} label="Delay / Reason">
                    <span className="text-foreground font-semibold text-xs italic">
                      "{task.completionReason}"
                    </span>
                  </NotionPropertyRow>
                )}

                {task.editDueDate && (
                  <NotionPropertyRow icon={Scissors} label="Edit Due Date">
                    <span className="text-foreground font-semibold text-xs tabular-nums">
                      {new Date(task.editDueDate).toLocaleDateString([], { dateStyle: 'medium' })}
                    </span>
                  </NotionPropertyRow>
                )}

                {task.shootDate && (
                  <NotionPropertyRow icon={Camera} label="Shoot Date">
                    <span className="text-foreground font-semibold text-xs tabular-nums">
                      {new Date(task.shootDate).toLocaleDateString([], { dateStyle: 'medium' })}
                    </span>
                  </NotionPropertyRow>
                )}

                {task.designDueDate && (
                  <NotionPropertyRow icon={Palette} label="Design Due">
                    <span className="text-foreground font-semibold text-xs tabular-nums">
                      {new Date(task.designDueDate).toLocaleDateString([], { dateStyle: 'medium' })}
                    </span>
                  </NotionPropertyRow>
                )}

                {task.postingScheduleDate && (
                  <NotionPropertyRow icon={Share2} label="Posting Date">
                    <span className="text-foreground font-semibold text-xs tabular-nums">
                      {new Date(task.postingScheduleDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </NotionPropertyRow>
                )}

                {task.videoType && (
                  <NotionPropertyRow icon={Film} label="Video Type">
                    <span className="px-2 py-0.5 rounded-md bg-secondary text-foreground font-bold text-xs ">
                      {task.videoType}
                    </span>
                  </NotionPropertyRow>
                )}

                {task.videoFormat && (
                  <NotionPropertyRow icon={Video} label="Video Format">
                    <span className="font-semibold text-foreground text-xs">{task.videoFormat}</span>
                  </NotionPropertyRow>
                )}

                {task.videoDuration && (
                  <NotionPropertyRow icon={Clock} label="Duration">
                    <span className="font-semibold text-foreground text-xs tabular-nums">{task.videoDuration}</span>
                  </NotionPropertyRow>
                )}

                {(task.editingReferenceVideo || task.referenceVideoLink) && (
                  <NotionPropertyRow icon={ExternalLink} label="Reference Video">
                    <a
                      href={task.editingReferenceVideo || task.referenceVideoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-foreground hover:underline inline-flex items-center gap-1 text-xs truncate max-w-[280px]"
                    >
                      <span>Open Reference Link</span>
                      <ExternalLink size={11} className="shrink-0" />
                    </a>
                  </NotionPropertyRow>
                )}

                {task.cta && (
                  <NotionPropertyRow icon={Sparkles} label="Call to Action">
                    <span className="font-semibold text-foreground text-xs">{task.cta}</span>
                  </NotionPropertyRow>
                )}

                <NotionPropertyRow icon={CheckCircle2} label="Client Approval">
                  <span className="capitalize font-semibold text-foreground text-xs">
                    {task.approvalStatus || task.clientResponse || 'Pending'}
                  </span>
                </NotionPropertyRow>

                {task.department && (
                  <NotionPropertyRow icon={Briefcase} label="Department">
                    <span className="font-semibold text-foreground text-xs">{task.department}</span>
                  </NotionPropertyRow>
                )}

                {(task.department === 'Development' || task.development?.isDevTask) && (
                  <NotionPropertyRow icon={Code2} label="Dev Stage">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-secondary text-foreground font-bold text-xs ">
                        {DEV_STAGE_LABELS[task.development?.stage] || task.development?.stage || 'In Development'}
                      </span>
                      {task.development?.isBlocked && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary text-primary-foreground font-bold text-[11px] ">
                          <AlertCircle size={11} /> Blocked
                        </span>
                      )}
                    </div>
                  </NotionPropertyRow>
                )}
              </div>

              {/* ── Production Pipeline Workflow ── */}
              {hasPipeline && (
                <div className="rounded-2xl bg-secondary/40 p-3.5 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-foreground inline-flex items-center gap-1.5">
                      <Flame size={14} className="text-foreground" /> Multi-Role Sub-Assignments
                    </span>
                    {task.postingScheduleDate && (
                      <span className="text-[10px] font-bold text-foreground px-2 py-0.5 rounded-full bg-card tabular-nums">
                        Post: {new Date(task.postingScheduleDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>

                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
                    <div className="p-2.5 rounded-xl bg-card space-y-1">
                      <span className="text-[9px] font-bold uppercase text-muted-foreground block">Script</span>
                      <p className="font-bold text-foreground text-xs truncate">
                        {task.scriptWriterAssigned?.name || task.scriptWriterName || 'Unassigned'}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-card space-y-1">
                      <span className="text-[9px] font-bold uppercase text-muted-foreground block">RJ / Voice</span>
                      <p className="font-bold text-foreground text-xs truncate">
                        {task.voiceArtistAssigned?.name || task.voiceArtistName || 'Unassigned'}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-card space-y-1">
                      <span className="text-[9px] font-bold uppercase text-muted-foreground block">Shoot</span>
                      <p className="font-bold text-foreground text-xs truncate">
                        {task.videographerAssigned?.name || task.videographerName || 'Unassigned'}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-card space-y-1">
                      <span className="text-[9px] font-bold uppercase text-muted-foreground block">Edit</span>
                      <p className="font-bold text-foreground text-xs truncate">
                        {task.editorAssigned?.name || task.editorName || 'Unassigned'}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-card space-y-1">
                      <span className="text-[9px] font-bold uppercase text-muted-foreground block">Design</span>
                      <p className="font-bold text-foreground text-xs truncate">
                        {task.designerAssigned?.name || task.designerName || 'Unassigned'}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-card space-y-1">
                      <span className="text-[9px] font-bold uppercase text-muted-foreground block">Post</span>
                      <p className="font-bold text-foreground text-xs truncate">
                        {task.publisherAssigned?.name || task.publisherName || 'Unassigned'}
                      </p>
                    </div>
                  </div>

                  {task.rawFootageLink && (
                    <div className="pt-1 text-xs flex items-center justify-between">
                      <span className="text-muted-foreground font-semibold">Raw Footage:</span>
                      <a href={task.rawFootageLink} target="_blank" rel="noreferrer" className="font-bold text-foreground hover:underline inline-flex items-center gap-1">
                        <span>Open Drive</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  )}

                  {task.editReminder && (
                    <div className="pt-1 text-xs flex items-center justify-between ">
                      <span className="text-muted-foreground font-semibold">Edit Reminder:</span>
                      <span className="font-semibold text-foreground">{task.editReminder}</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── Interconnected Upstream Details & Editor Hand-off Hub ── */}
              {(task.editorAssigned || task.videographerAssigned || task.scriptWriterAssigned || task.shootDate || task.taskCategory === 'content') && (
                <div className="rounded-2xl bg-secondary/30 p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-card text-foreground shrink-0">
                        <Scissors size={16} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1.5">
                            <Film size={14} className="shrink-0" />
                            <span>Production Pipeline &amp; Editor Hub</span>
                          </span>
                          <span className="text-[10px] normal-case font-bold px-2 py-0.5 rounded-full bg-card text-foreground ">
                            Interconnected Workflow
                          </span>
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Upstream shoot details, videographer notes, and scripts automatically synced for the editor.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 3-Column Pipeline Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Stage 1: Pre-Production & Script */}
                    <div className="p-3.5 rounded-xl bg-card space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase text-foreground inline-flex items-center gap-1.5">
                          <FileText size={13} className="shrink-0 text-muted-foreground" />
                          <span>1. Script &amp; Pre-Production</span>
                        </span>
                        {task.scriptWriterAssigned?.name && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-secondary text-foreground truncate max-w-[110px]">
                            {task.scriptWriterAssigned.name}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 text-xs">
                        {task.hookOpeningLine && (
                          <div className="p-2 rounded-lg bg-secondary/40 space-y-0.5">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground inline-flex items-center gap-1">
                              <Sparkles size={10} /> Hook / Opening Line
                            </span>
                            <p className="text-foreground font-medium italic text-xs">&ldquo;{task.hookOpeningLine}&rdquo;</p>
                          </div>
                        )}

                        {(task.fullScript || task.scriptText) && (
                          <div className="p-2 rounded-lg bg-secondary/40 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase text-muted-foreground inline-flex items-center gap-1">
                                <FileText size={10} /> Script Content
                              </span>
                              <CopyButton text={task.fullScript || task.scriptText} label="Copy" />
                            </div>
                            <p className="text-foreground text-[11px] line-clamp-3 whitespace-pre-wrap font-mono">
                              {task.fullScript || task.scriptText}
                            </p>
                          </div>
                        )}

                        {task.scriptLink && (
                          <a
                            href={task.scriptLink}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between p-2 rounded-lg bg-secondary/40 text-foreground hover:underline font-bold text-xs"
                          >
                            <span className="truncate">Google Docs Script</span>
                            <ExternalLink size={12} className="shrink-0" />
                          </a>
                        )}

                        {task.voiceOverAudioLink && (
                          <a
                            href={task.voiceOverAudioLink}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between p-2 rounded-lg bg-secondary/40 text-foreground hover:underline font-bold text-xs"
                          >
                            <span className="truncate inline-flex items-center gap-1">
                              <Mic size={11} className="shrink-0" /> Voice-Over Audio
                            </span>
                            <ExternalLink size={12} className="shrink-0" />
                          </a>
                        )}

                        {!task.hookOpeningLine && !task.fullScript && !task.scriptText && !task.scriptLink && (
                          <p className="text-[11px] text-muted-foreground italic py-1">No script details added yet.</p>
                        )}
                      </div>
                    </div>

                    {/* Stage 2: Production & Shoot Details */}
                    <div className="p-3.5 rounded-xl bg-card space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase text-foreground inline-flex items-center gap-1.5">
                          <Video size={13} className="shrink-0 text-muted-foreground" />
                          <span>2. Shoot &amp; Videographer</span>
                        </span>
                        {task.videographerAssigned?.name && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-secondary text-foreground truncate max-w-[110px]">
                            {task.videographerAssigned.name}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="p-2 rounded-lg bg-secondary/40 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground inline-flex items-center gap-1">
                              <Calendar size={10} /> Shoot Schedule
                            </span>
                            <span className="text-foreground font-bold text-xs tabular-nums">
                              {task.shootDate ? new Date(task.shootDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date TBD'}
                            </span>
                          </div>
                          {task.shootTime && (
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                              <span>Time:</span>
                              <span className="font-semibold text-foreground tabular-nums">{task.shootTime}</span>
                            </div>
                          )}
                        </div>

                        {(task.shootLocation || task.shootLocationLink) && (
                          <div className="p-2 rounded-lg bg-secondary/40 space-y-0.5">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground inline-flex items-center gap-1">
                              <MapPin size={10} /> Shoot Location
                            </span>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-foreground font-medium text-xs truncate">
                                {task.shootLocation || 'Location specified'}
                              </span>
                              {task.shootLocationLink && (
                                <a
                                  href={task.shootLocationLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-foreground hover:underline font-bold text-[11px] shrink-0 inline-flex items-center gap-0.5"
                                >
                                  <span>Map</span>
                                  <ExternalLink size={10} />
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        {task.rawFootageLink && (
                          <div className="p-2 rounded-lg bg-secondary/50 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase text-foreground inline-flex items-center gap-1">
                                <UploadCloud size={10} /> Raw Footage Link
                              </span>
                              <CopyButton text={task.rawFootageLink} label="Copy" />
                            </div>
                            <a
                              href={task.rawFootageLink}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-foreground hover:underline flex items-center justify-between text-xs"
                            >
                              <span className="truncate">Open Footage Drive</span>
                              <ExternalLink size={11} className="shrink-0" />
                            </a>
                          </div>
                        )}

                        {task.videographerContentNeeded && (
                          <div className="p-2 rounded-lg bg-secondary/40 space-y-0.5">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground inline-flex items-center gap-1">
                              <Film size={10} /> Required Shots
                            </span>
                            <p className="text-[11px] text-foreground line-clamp-2">{task.videographerContentNeeded}</p>
                          </div>
                        )}

                        {!task.shootDate && !task.shootLocation && !task.rawFootageLink && (
                          <p className="text-[11px] text-muted-foreground italic py-1">Shoot schedule pending.</p>
                        )}
                      </div>
                    </div>

                    {/* Stage 3: Post-Production & Editing */}
                    <div className="p-3.5 rounded-xl bg-card space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold uppercase text-foreground inline-flex items-center gap-1.5">
                          <Scissors size={13} className="shrink-0 text-muted-foreground" />
                          <span>3. Video Editing Specs</span>
                        </span>
                        {task.editorAssigned?.name && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-secondary text-foreground truncate max-w-[110px]">
                            {task.editorAssigned.name}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="p-2 rounded-lg bg-secondary/40 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground">Format</span>
                            <span className="font-bold text-foreground text-xs">{task.videoFormat || '9:16 (Reels/Shorts)'}</span>
                          </div>
                          {task.videoDuration && (
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground">Duration:</span>
                              <span className="font-semibold text-foreground tabular-nums">{task.videoDuration}</span>
                            </div>
                          )}
                          {task.editDueDate && (
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-muted-foreground">Edit Due:</span>
                              <span className="font-bold text-foreground tabular-nums">
                                {new Date(task.editDueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          )}
                        </div>

                        {(task.editingReferenceVideo || task.referenceVideoLink) && (
                          <a
                            href={task.editingReferenceVideo || task.referenceVideoLink}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between p-2 rounded-lg bg-secondary/40 text-foreground hover:underline font-bold text-xs"
                          >
                            <span className="truncate">Reference Video</span>
                            <ExternalLink size={12} className="shrink-0" />
                          </a>
                        )}

                        {task.brandAssetsDriveLink && (
                          <a
                            href={task.brandAssetsDriveLink}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between p-2 rounded-lg bg-secondary/40 text-foreground hover:underline font-bold text-xs"
                          >
                            <span className="truncate">Brand Assets / Fonts / Logos</span>
                            <ExternalLink size={12} className="shrink-0" />
                          </a>
                        )}

                        {task.finalVideoDriveLink && (
                          <div className="p-2 rounded-lg bg-secondary/50 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase text-foreground inline-flex items-center gap-1">
                                <Film size={10} /> Final Output Drive
                              </span>
                              <CopyButton text={task.finalVideoDriveLink} label="Copy" />
                            </div>
                            <a
                              href={task.finalVideoDriveLink}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-foreground hover:underline flex items-center justify-between text-xs"
                            >
                              <span className="truncate">Open Final Video Link</span>
                              <ExternalLink size={11} className="shrink-0" />
                            </a>
                          </div>
                        )}

                        {task.editingInstructions && (
                          <div className="p-2 rounded-lg bg-secondary/40 space-y-0.5">
                            <span className="text-[10px] font-bold uppercase text-muted-foreground block">Instructions</span>
                            <p className="text-[11px] text-foreground line-clamp-2">{task.editingInstructions}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Drawer Tabs ── */}
              <div className="inline-flex max-w-full items-center gap-1 bg-secondary/75 p-1 rounded-xl overflow-x-auto no-scrollbar">
                {[
                  { id: 'brief', label: 'Brief & Scope', icon: FileText },
                  ...((task.department === 'Development' || task.development?.isDevTask || isWebsiteTaskType(task.taskType))
                    ? [{ id: 'development', label: 'Dev Workflow', icon: Code2 }]
                    : []),
                  { id: 'deliverables', label: `Files (${(task.attachments?.length || 0) + (task.completedFiles?.length || 0)})`, icon: FolderArchive },
                  { id: 'progress', label: `Logs (${task.progressUpdates?.length || 0})`, icon: Clock },
                  { id: 'review', label: 'Review', icon: MessageSquare },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer select-none rounded-lg tabular-nums ${
                      activeTab === tab.id
                        ? 'bg-background text-foreground font-bold shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <tab.icon size={13} className="shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* ── BRIEF & CONTENT TAB ── */}
              {activeTab === 'brief' && (
                <div className="space-y-4">
                  {/* Description / Requirements */}
                  <div className="rounded-2xl bg-card p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider inline-flex items-center gap-1.5">
                        <ClipboardList size={13} /> Brief &amp; Requirements
                      </span>
                      {task.description && <CopyButton text={task.description} label="Copy" />}
                    </div>
                    <div className="rounded-xl bg-background p-3 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                      {task.description || 'No description provided.'}
                    </div>
                  </div>

                  {/* Script */}
                  {task.taskCategory === 'content' && (
                    <div className="rounded-2xl bg-card p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground uppercase tracking-wider inline-flex items-center gap-1.5">
                          <FileText size={13} /> Script
                        </span>
                        {task.scriptText && <CopyButton text={task.scriptText} label="Copy Script" />}
                      </div>
                      {task.scriptText ? (
                        <div className="rounded-xl bg-background p-3 text-xs font-mono text-foreground whitespace-pre-wrap leading-relaxed">
                          {task.scriptText}
                        </div>
                      ) : (
                        <div className="rounded-xl p-4 text-center text-xs text-muted-foreground">
                          No script provided.
                        </div>
                      )}
                      {task.scriptLink && (
                        <a href={task.scriptLink} target="_blank" rel="noreferrer" className="text-xs font-bold text-foreground hover:underline inline-flex items-center gap-1 pt-1">
                          <span>Open Google Docs Script</span>
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  )}

                  {/* RJ / Voice-Over Script & Instructions */}
                  {task.taskCategory === 'content' && (task.voiceScriptText || task.voiceInstructions) && (
                    <div className="rounded-2xl bg-secondary/40 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground uppercase tracking-wider inline-flex items-center gap-1.5">
                          <Mic size={13} /> RJ / Voice-Over Script &amp; Brief
                        </span>
                        {task.voiceScriptText && <CopyButton text={task.voiceScriptText} label="Copy Script" />}
                      </div>
                      {task.voiceScriptText && (
                        <div className="rounded-xl bg-background p-3 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                          {task.voiceScriptText}
                        </div>
                      )}
                      {task.voiceInstructions && (
                        <p className="text-xs text-muted-foreground pt-1">
                          <span className="font-bold text-foreground">Instructions: </span>{task.voiceInstructions}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Videographer Content Requirements */}
                  {task.videographerContentNeeded && (
                    <div className="rounded-2xl bg-secondary/40 p-4 space-y-2">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider inline-flex items-center gap-1.5">
                        <Video size={13} /> What Content / Shots Needed for Videographer
                      </span>
                      <div className="rounded-xl bg-background p-3 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                        {task.videographerContentNeeded}
                      </div>
                    </div>
                  )}

                  {/* Video Production & Asset Details */}
                  {(task.editingReferenceVideo ||
                    task.referenceVideoLink ||
                    task.finalVideoDriveLink ||
                    task.voiceOverAudioLink ||
                    task.musicReferenceLink ||
                    task.brandAssetsDriveLink ||
                    task.shootLocation ||
                    task.shootLocationLink ||
                    task.shootTime ||
                    task.presenterPerson ||
                    (Array.isArray(task.equipmentRequired) && task.equipmentRequired.length > 0) ||
                    task.requiredShots ||
                    task.specialInstructions ||
                    task.hookOpeningLine ||
                    task.fullScript ||
                    task.sceneBySceneInstructions ||
                    task.captionOnScreenText ||
                    task.onScreenText ||
                    task.coverImageDriveLink ||
                    task.publishedPostUrl ||
                    (Array.isArray(task.targetSocialPlatforms) && task.targetSocialPlatforms.length > 0)) && (
                    <div className="rounded-2xl bg-secondary/30 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground uppercase tracking-wider inline-flex items-center gap-1.5">
                          <Film size={14} className="text-foreground" /> Video &amp; Production Details
                        </span>
                        {task.videoType && (
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {task.videoType}
                          </Badge>
                        )}
                      </div>

                      {/* Reference Links & Media Assets */}
                      <div className="space-y-1.5 text-xs">
                        {(task.editingReferenceVideo || task.referenceVideoLink) && (
                          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-card ">
                            <span className="text-muted-foreground font-semibold truncate flex items-center gap-1.5">
                              <Film size={13} className="text-foreground shrink-0" />
                              <span className="truncate">Reference Video: {task.editingReferenceVideo || task.referenceVideoLink}</span>
                            </span>
                            <a
                              href={task.editingReferenceVideo || task.referenceVideoLink}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-foreground hover:underline inline-flex items-center gap-1 shrink-0"
                            >
                              <span>Watch</span>
                              <ExternalLink size={11} />
                            </a>
                          </div>
                        )}

                        {task.finalVideoDriveLink && (
                          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-card ">
                            <span className="text-muted-foreground font-semibold truncate flex items-center gap-1.5">
                              <Video size={13} className="text-foreground shrink-0" />
                              <span className="truncate">Final Video Drive: {task.finalVideoDriveLink}</span>
                            </span>
                            <a
                              href={task.finalVideoDriveLink}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-foreground hover:underline inline-flex items-center gap-1 shrink-0"
                            >
                              <span>Open</span>
                              <ExternalLink size={11} />
                            </a>
                          </div>
                        )}

                        {task.voiceOverAudioLink && (
                          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-card ">
                            <span className="text-muted-foreground font-semibold truncate flex items-center gap-1.5">
                              <Mic size={13} className="text-foreground shrink-0" />
                              <span className="truncate">Voice-Over Audio Link: {task.voiceOverAudioLink}</span>
                            </span>
                            <a
                              href={task.voiceOverAudioLink}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-foreground hover:underline inline-flex items-center gap-1 shrink-0"
                            >
                              <span>Listen</span>
                              <ExternalLink size={11} />
                            </a>
                          </div>
                        )}

                        {task.musicReferenceLink && (
                          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-card ">
                            <span className="text-muted-foreground font-semibold truncate flex items-center gap-1.5">
                              <Sparkles size={13} className="text-foreground shrink-0" />
                              <span className="truncate">Music Reference Link: {task.musicReferenceLink}</span>
                            </span>
                            <a
                              href={task.musicReferenceLink}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-foreground hover:underline inline-flex items-center gap-1 shrink-0"
                            >
                              <span>Open</span>
                              <ExternalLink size={11} />
                            </a>
                          </div>
                        )}

                        {task.brandAssetsDriveLink && (
                          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-card ">
                            <span className="text-muted-foreground font-semibold truncate flex items-center gap-1.5">
                              <FolderArchive size={13} className="text-foreground shrink-0" />
                              <span className="truncate">Brand Assets Drive: {task.brandAssetsDriveLink}</span>
                            </span>
                            <a
                              href={task.brandAssetsDriveLink}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-foreground hover:underline inline-flex items-center gap-1 shrink-0"
                            >
                              <span>Open</span>
                              <ExternalLink size={11} />
                            </a>
                          </div>
                        )}

                        {task.shootLocationLink && (
                          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-card ">
                            <span className="text-muted-foreground font-semibold truncate flex items-center gap-1.5">
                              <MapPin size={13} className="text-foreground shrink-0" />
                              <span className="truncate">Location Maps: {task.shootLocationLink}</span>
                            </span>
                            <a
                              href={task.shootLocationLink}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-foreground hover:underline inline-flex items-center gap-1 shrink-0"
                            >
                              <span>Open Map</span>
                              <ExternalLink size={11} />
                            </a>
                          </div>
                        )}

                        {task.coverImageDriveLink && (
                          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-card ">
                            <span className="text-muted-foreground font-semibold truncate flex items-center gap-1.5">
                              <Palette size={13} className="text-foreground shrink-0" />
                              <span className="truncate">Cover Image / Thumbnail: {task.coverImageDriveLink}</span>
                            </span>
                            <a
                              href={task.coverImageDriveLink}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-foreground hover:underline inline-flex items-center gap-1 shrink-0"
                            >
                              <span>Open</span>
                              <ExternalLink size={11} />
                            </a>
                          </div>
                        )}

                        {task.publishedPostUrl && (
                          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-card ">
                            <span className="text-muted-foreground font-semibold truncate flex items-center gap-1.5">
                              <Share2 size={13} className="text-foreground shrink-0" />
                              <span className="truncate">Live Post URL: {task.publishedPostUrl}</span>
                            </span>
                            <a
                              href={task.publishedPostUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-bold text-foreground hover:underline inline-flex items-center gap-1 shrink-0"
                            >
                              <span>View Post</span>
                              <ExternalLink size={11} />
                            </a>
                          </div>
                        )}
                      </div>

                      {/* Shoot & Production Metadata Grid */}
                      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 text-xs pt-1">
                        {task.shootTime && (
                          <div className="p-2 rounded-xl bg-card ">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Shoot Time</span>
                            <span className="font-semibold text-foreground truncate block tabular-nums">{task.shootTime}</span>
                          </div>
                        )}
                        {task.shootLocation && (
                          <div className="p-2 rounded-xl bg-card ">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Shoot Location</span>
                            <span className="font-semibold text-foreground truncate block">{task.shootLocation}</span>
                          </div>
                        )}
                        {task.presenterPerson && (
                          <div className="p-2 rounded-xl bg-card ">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Presenter</span>
                            <span className="font-semibold text-foreground truncate block">{task.presenterPerson}</span>
                          </div>
                        )}
                      </div>

                      {/* Equipment Required Pills */}
                      {Array.isArray(task.equipmentRequired) && task.equipmentRequired.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-card space-y-1.5 text-xs">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground block">Equipment Required</span>
                          <div className="flex flex-wrap gap-1">
                            {task.equipmentRequired.map((eq, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px] font-semibold">
                                {eq}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Target Platforms */}
                      {Array.isArray(task.targetSocialPlatforms) && task.targetSocialPlatforms.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-card space-y-1.5 text-xs">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground block">Target Social Platforms</span>
                          <div className="flex flex-wrap gap-1">
                            {task.targetSocialPlatforms.map((plat, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] font-semibold text-foreground">
                                {plat}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Hook */}
                      {task.hookOpeningLine && (
                        <div className="p-2.5 rounded-xl bg-secondary text-xs space-y-1">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground inline-flex items-center gap-1">
                            <Sparkles size={10} /> Hook / Opening Line
                          </span>
                          <p className="font-semibold text-foreground italic">"{task.hookOpeningLine}"</p>
                        </div>
                      )}

                      {/* Required Shots */}
                      {task.requiredShots && (
                        <div className="p-2.5 rounded-xl bg-card text-xs space-y-1">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground inline-flex items-center gap-1">
                            <Video size={10} /> Required Shots List
                          </span>
                          <p className="text-foreground whitespace-pre-wrap">{task.requiredShots}</p>
                        </div>
                      )}

                      {/* Special Instructions */}
                      {task.specialInstructions && (
                        <div className="p-2.5 rounded-xl bg-card text-xs space-y-1">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground inline-flex items-center gap-1">
                            <FileText size={10} /> Special Instructions
                          </span>
                          <p className="text-foreground whitespace-pre-wrap">{task.specialInstructions}</p>
                        </div>
                      )}

                      {/* On-Screen Text / Captions */}
                      {(task.captionOnScreenText || task.onScreenText) && (
                        <div className="p-2.5 rounded-xl bg-card text-xs space-y-1">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground inline-flex items-center gap-1">
                            <MessageSquare size={10} /> On-Screen Text &amp; Captions
                          </span>
                          <p className="text-foreground whitespace-pre-wrap">{task.captionOnScreenText || task.onScreenText}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Caption & Tags */}
                  {task.taskCategory === 'content' && (
                    <div className="rounded-2xl bg-card p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground uppercase tracking-wider inline-flex items-center gap-1.5">
                          <MessageSquare size={13} /> Social Caption
                        </span>
                        {task.caption && <CopyButton text={`${task.caption}\n\n${task.hashtags || ''}`} label="Copy Caption" />}
                      </div>
                      <div className="rounded-xl bg-background p-3 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                        {task.caption || 'No caption drafted yet.'}
                      </div>
                      {task.hashtags && (
                        <p className="text-[11px] font-semibold text-muted-foreground break-all pt-1">
                          {task.hashtags}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Website Technical Specs */}
                  {isWebsiteTaskType(task.taskType) && (
                    <div className="rounded-2xl bg-card p-4 space-y-3">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider inline-flex items-center gap-1.5">
                        <Laptop size={13} /> Website Specifications
                      </span>
                      <div className="grid gap-2 sm:grid-cols-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-background">
                          <span className="text-[10px] text-muted-foreground uppercase block font-bold">Website Type</span>
                          <span className="font-semibold">{task.websiteType || 'Custom Website'}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-background">
                          <span className="text-[10px] text-muted-foreground uppercase block font-bold">Domain &amp; Hosting</span>
                          <span className="font-semibold">{[task.domainDetails, task.hostingDetails].filter(Boolean).join(' • ') || 'Not specified'}</span>
                        </div>
                      </div>

                      {task.adminCredentials && (
                        <div className="rounded-xl bg-secondary/40 p-3 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold">Admin Credentials:</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setShowCredentials(!showCredentials)}
                                className="font-semibold text-muted-foreground hover:text-foreground text-[11px] inline-flex items-center gap-1 cursor-pointer"
                              >
                                {showCredentials ? <EyeOff size={11} /> : <Eye size={11} />}
                                <span>{showCredentials ? 'Hide' : 'Show'}</span>
                              </button>
                              <CopyButton text={task.adminCredentials} label="Copy" />
                            </div>
                          </div>
                          <div className="text-xs font-mono bg-background p-2 rounded-lg ">
                            {showCredentials ? task.adminCredentials : '••••••••••••••••••••'}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reference Links */}
                  {(task.referenceLink || task.audioReference || task.editorGuide || task.internalNotes) && (
                    <div className="rounded-2xl bg-card p-4 space-y-2">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider inline-flex items-center gap-1.5">
                        <Link2 size={13} /> References &amp; Direction
                      </span>
                      <div className="space-y-2 text-xs">
                        {task.referenceLink && (
                          <div className="flex items-center justify-between p-2 rounded-xl bg-background">
                            <span className="text-muted-foreground">Inspiration Link:</span>
                            <a href={task.referenceLink} target="_blank" rel="noreferrer" className="font-bold text-foreground hover:underline inline-flex items-center gap-1 truncate max-w-[200px]">
                              <span className="truncate">{task.referenceLink}</span>
                              <ArrowUpRight size={11} className="shrink-0" />
                            </a>
                          </div>
                        )}
                        {task.audioReference && (
                          <div className="flex items-center justify-between p-2 rounded-xl bg-background">
                            <span className="text-muted-foreground">Audio Reference:</span>
                            <a href={task.audioReference} target="_blank" rel="noreferrer" className="font-bold text-foreground hover:underline inline-flex items-center gap-1 truncate max-w-[200px]">
                              <span className="truncate">{task.audioReference}</span>
                              <ArrowUpRight size={11} className="shrink-0" />
                            </a>
                          </div>
                        )}
                        {task.editorGuide && (
                          <div className="p-2.5 rounded-xl bg-background space-y-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Editor Guide:</span>
                            <p className="text-xs whitespace-pre-wrap">{task.editorGuide}</p>
                          </div>
                        )}
                        {task.internalNotes && (
                          <div className="p-2.5 rounded-xl bg-secondary/40 space-y-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Internal Notes:</span>
                            <p className="text-xs whitespace-pre-wrap">{task.internalNotes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── DEVELOPMENT WORKFLOW TAB ── */}
              {activeTab === 'development' && (
                <div className="space-y-4">
                  {/* Pipeline Stage Card */}
                  <div className="rounded-2xl bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider inline-flex items-center gap-1.5">
                        <Code2 size={14} className="text-foreground" /> Development Pipeline
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-secondary text-foreground capitalize">
                        {DEV_STAGE_LABELS[task.development?.stage] || task.development?.stage || 'Backlog'}
                      </span>
                    </div>

                    {task.development?.isBlocked && (
                      <div className="rounded-xl bg-secondary p-3 space-y-1 text-xs text-foreground">
                        <div className="flex items-center gap-1.5 font-bold">
                          <AlertTriangle size={14} className="text-foreground shrink-0" />
                          <span>Task is Currently Blocked</span>
                        </div>
                        <p className="text-muted-foreground">
                          <span className="font-semibold text-foreground">Reason: </span>
                          {task.development?.blockedReason || 'No reason specified'}
                        </p>
                        {task.development?.blockedAt && (
                          <span className="text-[10px] text-muted-foreground block tabular-nums">
                            Blocked on {new Date(task.development.blockedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="grid gap-2 sm:grid-cols-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-background">
                        <span className="text-[10px] text-muted-foreground uppercase block font-bold">Developer</span>
                        <span className="font-semibold text-foreground">
                          {task.development?.developer?.name || (Array.isArray(task.assignedTo) ? task.assignedTo[0]?.name : task.assignedTo?.name) || 'Assigned Lead'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-background">
                        <span className="text-[10px] text-muted-foreground uppercase block font-bold">Environment</span>
                        <span className="font-semibold text-foreground capitalize">{task.development?.environment || 'Development'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Git & Branch Specs */}
                  <div className="rounded-2xl bg-card p-4 space-y-3">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider inline-flex items-center gap-1.5">
                      <GitBranch size={14} className="text-foreground" /> Repository &amp; Version Control
                    </span>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2 rounded-xl bg-background">
                        <span className="text-muted-foreground font-semibold">Branch:</span>
                        <span className="font-mono font-bold text-foreground text-[11px] bg-secondary px-2 py-0.5 rounded">
                          {task.development?.branch || `feat/${task.taskTitle ? task.taskTitle.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30) : 'task-' + task._id?.slice(-4)}`}
                        </span>
                      </div>
                      {task.development?.pullRequestUrl && (
                        <div className="flex items-center justify-between p-2 rounded-xl bg-background">
                          <span className="text-muted-foreground font-semibold">Pull Request:</span>
                          <a
                            href={task.development.pullRequestUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold text-foreground hover:underline inline-flex items-center gap-1 truncate max-w-[240px]"
                          >
                            <GitPullRequest size={12} />
                            <span>{task.development.pullRequestNumber ? `PR #${task.development.pullRequestNumber}` : task.development.pullRequestUrl}</span>
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      )}
                      {task.development?.commitHash && (
                        <div className="flex items-center justify-between p-2 rounded-xl bg-background">
                          <span className="text-muted-foreground font-semibold">Commit Hash:</span>
                          <span className="font-mono text-xs text-foreground">{task.development.commitHash}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Code Review Details */}
                  <div className="rounded-2xl bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider inline-flex items-center gap-1.5">
                        <GitPullRequest size={14} className="text-foreground" /> Code Review
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                        task.development?.reviewStatus === 'approved'
                          ? 'bg-primary text-primary-foreground '
                          : task.development?.reviewStatus === 'changes_requested'
                          ? 'bg-foreground/10 text-foreground '
                          : 'bg-secondary text-muted-foreground '
                      }`}>
                        {task.development?.reviewStatus?.replace('_', ' ') || 'Pending'}
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-background">
                        <span className="text-[10px] text-muted-foreground uppercase block font-bold">Reviewer</span>
                        <span className="font-semibold text-foreground">{task.development?.reviewer?.name || 'Unassigned'}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-background">
                        <span className="text-[10px] text-muted-foreground uppercase block font-bold">Reviewed At</span>
                        <span className="font-semibold text-foreground tabular-nums">
                          {task.development?.reviewedAt ? new Date(task.development.reviewedAt).toLocaleDateString() : '—'}
                        </span>
                      </div>
                    </div>
                    {task.development?.reviewComments && (
                      <div className="p-3 rounded-xl bg-background text-xs space-y-1">
                        <span className="font-bold text-foreground">Review Comments:</span>
                        <p className="text-muted-foreground whitespace-pre-wrap">{task.development.reviewComments}</p>
                      </div>
                    )}
                  </div>

                  {/* QA / Testing Details */}
                  <div className="rounded-2xl bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider inline-flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-foreground" /> QA &amp; Verification
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                        task.development?.testStatus === 'passed'
                          ? 'bg-primary text-primary-foreground '
                          : task.development?.testStatus === 'failed' || task.development?.testStatus === 'blocked'
                          ? 'bg-foreground/10 text-foreground '
                          : 'bg-secondary text-muted-foreground '
                      }`}>
                        {task.development?.testStatus || 'Pending'}
                      </span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-background">
                        <span className="text-[10px] text-muted-foreground uppercase block font-bold">Tester</span>
                        <span className="font-semibold text-foreground">{task.development?.tester?.name || 'Unassigned'}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-background">
                        <span className="text-[10px] text-muted-foreground uppercase block font-bold">Tested At</span>
                        <span className="font-semibold text-foreground tabular-nums">
                          {task.development?.testedAt ? new Date(task.development.testedAt).toLocaleDateString() : '—'}
                        </span>
                      </div>
                    </div>
                    {task.development?.testNotes && (
                      <div className="p-3 rounded-xl bg-background text-xs space-y-1">
                        <span className="font-bold text-foreground">QA Test Notes:</span>
                        <p className="text-muted-foreground whitespace-pre-wrap">{task.development.testNotes}</p>
                      </div>
                    )}
                  </div>

                  {/* Sprints & Releases */}
                  {(task.development?.sprint || task.development?.release) && (
                    <div className="rounded-2xl bg-card p-4 space-y-3">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider inline-flex items-center gap-1.5">
                        <Target size={13} /> Sprint &amp; Release Target
                      </span>
                      <div className="grid gap-2 sm:grid-cols-2 text-xs">
                        {task.development?.sprint && (
                          <div className="p-2.5 rounded-xl bg-background">
                            <span className="text-[10px] text-muted-foreground uppercase block font-bold">Sprint</span>
                            <span className="font-semibold text-foreground">{task.development.sprint.name || 'Assigned Sprint'}</span>
                          </div>
                        )}
                        {task.development?.release && (
                          <div className="p-2.5 rounded-xl bg-background">
                            <span className="text-[10px] text-muted-foreground uppercase block font-bold">Release</span>
                            <span className="font-semibold text-foreground">
                              {task.development.release.version ? `v${task.development.release.version} - ${task.development.release.name}` : task.development.release.name || 'Assigned Release'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bug Tracking */}
                  {task.development?.isBug && (
                    <div className="rounded-2xl bg-secondary/40 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground uppercase tracking-wider inline-flex items-center gap-1.5">
                          <Bug size={14} className="text-foreground" /> Defect / Bug Report
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary text-primary-foreground ">
                          {task.development?.bugSeverity || 'Medium'} Severity
                        </span>
                      </div>
                      {task.development?.stepsToReproduce && (
                        <div className="p-2.5 rounded-xl bg-background text-xs space-y-1">
                          <span className="font-bold text-foreground">Steps to Reproduce:</span>
                          <p className="text-muted-foreground whitespace-pre-wrap">{task.development.stepsToReproduce}</p>
                        </div>
                      )}
                      <div className="grid gap-2 sm:grid-cols-2 text-xs">
                        {task.development?.expectedResult && (
                          <div className="p-2.5 rounded-xl bg-card space-y-1">
                            <span className="font-bold text-foreground text-[10px] uppercase">Expected:</span>
                            <p className="text-foreground">{task.development.expectedResult}</p>
                          </div>
                        )}
                        {task.development?.actualResult && (
                          <div className="p-2.5 rounded-xl bg-card space-y-1">
                            <span className="font-bold text-foreground text-[10px] uppercase">Actual:</span>
                            <p className="text-foreground">{task.development.actualResult}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── DELIVERABLES TAB ── */}
              {activeTab === 'deliverables' && (
                <div className="space-y-4">
                  {!isClient && (
                    <div className="rounded-2xl bg-card p-4 space-y-3">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <UploadCloud size={14} className="text-primary" /> Upload Final Deliverables
                      </span>
                      <input
                        type="file"
                        multiple
                        onChange={(e) => setCompletedFiles(Array.from(e.target.files || []))}
                        className="text-xs w-full"
                      />
                      {completedFiles.length > 0 && (
                        <Button onClick={handleUploadCompletedFiles} disabled={addCompletedFiles.isPending} size="sm" className="w-full font-bold">
                          {addCompletedFiles.isPending ? 'Uploading...' : 'Confirm Upload'}
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Completed Files */}
                  <div className="rounded-2xl bg-card p-4 space-y-2">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Completed Deliverables ({(task.completedFiles || []).length})
                    </span>
                    <div className="space-y-2">
                      {(task.completedFiles || []).length > 0 ? (
                        task.completedFiles.map((file, idx) => (
                          <a
                            key={idx}
                            href={getAssetUrl(file.url)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-background hover:bg-secondary/40 text-xs"
                          >
                            <span className="font-bold text-foreground truncate">{file.name || 'Deliverable'}</span>
                            <Download size={13} className="text-muted-foreground shrink-0" />
                          </a>
                        ))
                      ) : (
                        <div className="text-xs text-muted-foreground p-4 text-center rounded-xl">
                          No completed deliverables uploaded.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Initial Attachments */}
                  <div className="rounded-2xl bg-card p-4 space-y-2">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Initial Attachments ({(task.attachments || []).length})
                    </span>
                    <div className="space-y-2">
                      {(task.attachments || []).length > 0 ? (
                        task.attachments.map((file, idx) => (
                          <a
                            key={idx}
                            href={getAssetUrl(file.url)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-background hover:bg-secondary/40 text-xs"
                          >
                            <span className="font-bold text-foreground truncate">{file.name || 'Attachment'}</span>
                            <Download size={13} className="text-muted-foreground shrink-0" />
                          </a>
                        ))
                      ) : (
                        <div className="text-xs text-muted-foreground p-4 text-center rounded-xl">
                          No initial attachments uploaded.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── PROGRESS LOGS TAB ── */}
              {activeTab === 'progress' && (
                <div className="space-y-4">
                  {!isClient && (
                    <div className="rounded-2xl bg-card p-4 space-y-2">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">Log Today&apos;s Work</span>
                      <ProgressUpdateForm taskId={taskId} onSuccess={refetch} />
                    </div>
                  )}

                  <div className="rounded-2xl bg-card p-4 space-y-2">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Work Progress History ({(task.progressUpdates || []).length})
                    </span>
                    <div className="space-y-2">
                      {(task.progressUpdates || []).length > 0 ? (
                        task.progressUpdates.slice().reverse().map((update, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-background space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-foreground">{update.description}</span>
                              <span className="text-[10px] text-muted-foreground">
                                {update.completedAt ? new Date(update.completedAt).toLocaleDateString() : ''}
                              </span>
                            </div>
                            {update.workNotes && <p className="text-muted-foreground whitespace-pre-wrap">{update.workNotes}</p>}
                            {update.hours ? (
                              <span className="inline-block text-[10px] font-bold text-primary">{update.hours}h logged</span>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-muted-foreground p-4 text-center rounded-xl">
                          No progress updates logged yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── CLIENT REVIEW TAB ── */}
              {activeTab === 'review' && (
                <div className="rounded-2xl bg-card p-4 space-y-3">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">Client Approval & Feedback</span>
                  <div className="grid gap-2 sm:grid-cols-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-background">
                      <span className="text-[10px] text-muted-foreground uppercase block font-bold">Approval Status</span>
                      <span className="font-bold capitalize">{task.approvalStatus || 'Pending'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-background">
                      <span className="text-[10px] text-muted-foreground uppercase block font-bold">Client Response</span>
                      <span className="font-bold capitalize">{task.clientResponse || 'Pending'}</span>
                    </div>
                  </div>

                  {task.clientFeedback && (
                    <div className="p-3 rounded-xl bg-background text-xs space-y-1">
                      <span className="font-bold text-foreground">Client Feedback:</span>
                      <p className="text-muted-foreground whitespace-pre-wrap">{task.clientFeedback}</p>
                    </div>
                  )}

                  {task.rejectionReason && (
                    <div className="p-3 rounded-xl bg-secondary text-foreground text-xs space-y-1">
                      <span className="font-bold">Rework Reason:</span>
                      <p className="whitespace-pre-wrap text-muted-foreground">{task.rejectionReason}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl bg-card p-8 text-center text-xs text-muted-foreground">
              Task not found.
            </div>
          )}
        </div>

        {/* Edit Modal */}
        <AddTaskModal
          open={isEditing}
          onOpenChange={(val) => {
            setIsEditing(val);
            if (!val) refetch();
          }}
          task={task}
        />

        {/* Assign Another Task Modal */}
        {showAssignAnotherModal && (
          <KanbanCreateTaskModal
            isOpen={showAssignAnotherModal}
            onClose={() => {
              setShowAssignAnotherModal(false);
              refetch();
            }}
            initialValues={{
              client: task.client?._id || task.client || '',
              project: task.project?._id || task.project || '',
              assignedTo: Array.isArray(task.assignedTo) ? task.assignedTo[0]?._id || task.assignedTo[0] || '' : task.assignedTo || '',
              assignedManager: task.assignedManager?._id || task.assignedManager || '',
              priority: task.priority || 'Medium',
              dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
            }}
            onTaskCreated={() => refetch()}
          />
        )}

        {/* Submit Task Modal */}
        {showSubmitModal && (
          <TaskSubmitModal
            open={showSubmitModal}
            onOpenChange={setShowSubmitModal}
            task={task}
            onSubmitted={() => refetch()}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
