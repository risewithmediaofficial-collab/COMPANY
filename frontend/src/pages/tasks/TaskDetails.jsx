import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ChevronLeft,
  Edit3,
  Copy,
  Check,
  Share2,
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
  Plus,
  Layers,
  UploadCloud,
  FileCode,
  Tag,
  Hash,
  MessageSquare,
  Globe,
  FolderArchive,
  ArrowUpRight,
  ShieldCheck,
  Flame,
  ChevronDown,
  Trash2,
  FileEdit,
  Mic,
  Scissors,
  Smartphone,
  MapPin,
  ClipboardList,
  Lock,
  Link2,
  TrendingUp,
  Paperclip,
  Laptop,
  AlertTriangle,
} from '@/components/ui/muiIcons';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { SelectDropdown } from '../../components/ui/SelectDropdown';
import { AddTaskModal } from '../../components/modals/AddTaskModal';
import { KanbanCreateTaskModal } from '../../components/tasks/KanbanCreateTaskModal';
import { ProgressUpdateForm } from '../../components/ui/ProgressUpdateForm';
import { TaskCountdownTimer } from '../../components/tasks/TaskCountdownTimer';
import { TaskSubmitModal } from '../../components/tasks/TaskSubmitModal';
import { useAddCompletedFiles, useTask, useUpdateTaskStatus, useDeleteTask } from '../../hooks/useTasks';
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
  if (t.includes('reel') || t.includes('video') || t.includes('youtube')) return <Film className="text-foreground" size={20} />;
  if (t.includes('poster') || t.includes('design') || t.includes('carousel')) return <Sparkles className="text-foreground" size={20} />;
  if (t.includes('website') || t.includes('landing')) return <Globe className="text-foreground" size={20} />;
  if (cat.includes('content')) return <FileText className="text-foreground" size={20} />;
  return <Layers className="text-foreground" size={20} />;
};

const NotionPropertyRow = ({ icon: Icon, label, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 py-2.5 px-3 rounded-xl hover:bg-secondary/40 transition-colors">
    <div className="flex items-center gap-2 w-auto sm:w-36 md:w-44 shrink-0 text-xs font-semibold text-muted-foreground select-none">
      <Icon size={14} className="shrink-0 text-muted-foreground" />
      <span className="truncate">{label}</span>
    </div>
    <div className="flex-1 min-w-0 text-xs sm:text-sm font-medium text-foreground flex items-center justify-start">
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
    toast.success(`${label} copied to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all active:scale-95 cursor-pointer select-none"
      title={`Copy ${label}`}
    >
      {copied ? <Check size={13} className="text-foreground" /> : <Copy size={13} />}
      <span>{copied ? 'Copied!' : label}</span>
    </button>
  );
};

export const TaskDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { data: task, isLoading, isError, error, refetch } = useTask(id);
  const updateStatus = useUpdateTaskStatus();
  const addCompletedFiles = useAddCompletedFiles();

  const [activeTab, setActiveTab] = useState('brief');
  const [editing, setEditing] = useState(false);
  const [showAssignAnotherModal, setShowAssignAnotherModal] = useState(false);
  const [completedFiles, setCompletedFiles] = useState([]);
  const [showCredentials, setShowCredentials] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const isEmployee = user?.role === 'employee';
  const isClient = user?.role === 'client';
  const canEdit = ['superAdmin', 'admin', 'manager', 'organizationOwner'].includes(user?.role);
  const canDelete = ['superAdmin', 'admin', 'manager', 'organizationOwner'].includes(user?.role);
  const deleteTaskMutation = useDeleteTask();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const allowedStatusOptions = isEmployee ? TEAM_STATUS_OPTIONS : TASK_STATUS_OPTIONS;

  const handleUploadCompleted = async () => {
    if (!completedFiles.length) return;
    try {
      const uploaded = await uploadFiles(completedFiles);
      await addCompletedFiles.mutateAsync({ id, completedFiles: uploaded });
      setCompletedFiles([]);
      toast.success('Completed deliverables uploaded successfully!');
      refetch();
    } catch (err) {
      toast.error('Failed to upload completed files');
    }
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Task link copied to clipboard!');
  };

  if (user?.role === 'employee') return null;

  if (isLoading) {
    return (
      <div className="space-y-4 w-full py-6 animate-pulse">
        <div className="h-8 w-64 rounded-xl bg-secondary/70" />
        <div className="h-40 rounded-3xl bg-secondary/50 " />
        <div className="grid gap-6 md:grid-cols-3">
          <div className="h-80 rounded-3xl bg-secondary/50 md:col-span-2" />
          <div className="h-80 rounded-3xl bg-secondary/50 " />
        </div>
      </div>
    );
  }

  if (!task) {
    const message = error?.response?.status === 403
      ? 'You do not have access to this task.'
      : 'Task not found or has been removed.';
    return (
      <div className="max-w-xl mx-auto py-24 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-foreground">{isError ? message : 'Task Not Found'}</h2>
        <p className="text-sm text-muted-foreground">The task you are trying to view does not exist or access is restricted.</p>
        <Button onClick={() => navigate('/tasks')} className="mt-2">
          <ChevronLeft size={16} className="mr-1.5" /> Back to Tasks
        </Button>
      </div>
    );
  }

  const normalizedStatus = normalizeTaskStatusLabel(task.status);
  const assigneesList = Array.isArray(task.assignedTo) ? task.assignedTo : (task.assignedTo ? [task.assignedTo] : []);
  const hasPipeline = Boolean(
    task.scriptWriterAssigned ||
    task.voiceArtistAssigned ||
    task.videographerAssigned ||
    task.editorAssigned ||
    task.publisherAssigned ||
    task.voiceScriptText ||
    task.videographerContentNeeded ||
    task.shootDate ||
    (task.postingPlatforms && task.postingPlatforms.length > 0)
  );

  return (
    <div className="w-full pb-16 space-y-4">
      {/* ── Top Notion Breadcrumb & Actions Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-2 ">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Link to="/tasks" className="flex items-center gap-1 hover:text-foreground transition-colors">
            <ChevronLeft size={16} />
            <span>Tasks</span>
          </Link>
          <span>/</span>
          {task.client?.name && (
            <>
              <span className="text-muted-foreground/80 truncate max-w-[140px]">{task.client.name}</span>
              <span>/</span>
            </>
          )}
          <span className="text-foreground font-bold truncate max-w-[200px] sm:max-w-md">
            {task.taskTitle || task.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShareLink}
            className="inline-flex items-center gap-1.5 rounded-xl text-xs font-bold hover:bg-secondary cursor-pointer"
          >
            <Share2 size={13} />
            <span>Share</span>
          </Button>

          {canEdit && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAssignAnotherModal(true)}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl text-xs font-bold text-foreground hover:bg-secondary cursor-pointer"
              >
                <Plus size={13} />
                <span>Assign Another</span>
              </Button>

              <Button
                size="sm"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 cursor-pointer"
              >
                <Edit3 size={13} />
                <span>Edit Task</span>
              </Button>
            </>
          )}

          {canDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                showDeleteConfirm
                  ? 'bg-primary text-primary-foreground '
                  : ' text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
              title="Delete Task"
            >
              <Trash2 size={13} />
              <span>Delete</span>
            </Button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Alert Banner */}
      {showDeleteConfirm && (
        <div className="rounded-2xl bg-secondary p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="text-xs text-foreground">
            <span className="font-bold">Are you sure you want to delete this task?</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">This action cannot be undone and will delete all associated subtasks.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground bg-background hover:bg-card cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteTaskMutation.isLoading}
              onClick={async () => {
                try {
                  await deleteTaskMutation.mutateAsync(id);
                  toast.success('Task deleted successfully');
                  navigate('/tasks');
                } catch (err) {
                  toast.error(err?.response?.data?.message || 'Failed to delete task');
                }
              }}
              className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Trash2 size={13} />
              <span>{deleteTaskMutation.isLoading ? 'Deleting...' : 'Confirm Delete'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Notion Page Hero & Title ── */}
      <div className="rounded-3xl bg-card p-6 sm:p-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary shrink-0 ">
            {getCategoryIcon(task.taskCategory, task.taskType)}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${STATUS_TONES[normalizedStatus] || STATUS_TONES['To Do']}`}>
                {normalizedStatus}
              </span>
              {task.priority && (
                <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${PRIORITY_TONES[task.priority] || PRIORITY_TONES.Medium}`}>
                  {task.priority} Priority
                </span>
              )}
              {task.taskCategory && (
                <Badge variant="secondary" className="text-xs font-semibold">
                  {task.taskCategory === 'non_content' ? 'Non-Content Task' : 'Content Task'}
                </Badge>
              )}
              {task.isOverTarget && (
                <span className="px-2.5 py-1 rounded-lg bg-primary text-xs font-bold uppercase text-primary-foreground inline-flex items-center gap-1.5 ">
                  <AlertTriangle size={12} />
                  <span>Over Target Deliverable</span>
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {task.taskTitle || task.title}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground flex flex-wrap items-center gap-2 tabular-nums">
              {task.client?.name && (
                <span className="font-semibold text-foreground inline-flex items-center gap-1">
                  <Building2 size={13} className="text-muted-foreground" /> {task.client.name}
                </span>
              )}
              {task.project?.name && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Briefcase size={13} /> {task.project.name}
                  </span>
                </>
              )}
              {task.createdAt && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Calendar size={13} /> Created {new Date(task.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </>
              )}
              {task.dueDate && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Calendar size={13} /> Due {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {task.isOverTarget && (
          <div className="rounded-2xl bg-secondary p-3.5 sm:p-4 text-foreground flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle size={15} className="shrink-0" />
              <span>This task exceeded the configured monthly deliverable quota for this project.</span>
            </div>
            {task.targetExceededBy > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-bold text-[11px] tabular-nums">
                +{task.targetExceededBy} Exceeded Over Target
              </span>
            )}
          </div>
        )}

        {/* ── Active Task Completion Timer ── */}
        <TaskCountdownTimer
          task={task}
          onOpenSubmitModal={() => setShowSubmitModal(true)}
          onTimerUpdated={() => refetch()}
        />

        {/* ── Notion Property Matrix ── */}
        <div className="pt-4 grid gap-1 sm:grid-cols-2">
          {/* Status Changer */}
          {!isClient && (
            <NotionPropertyRow icon={ShieldCheck} label="Status">
              <div className="relative inline-flex items-center min-w-[140px]">
                <SelectDropdown
                  value={normalizedStatus}
                  onChange={(val) => val && updateStatus.mutate({ id: task._id, status: val })}
                  options={allowedStatusOptions.map((opt) => ({ value: opt, label: opt }))}
                  allowCustom={false}
                  allowDeselect={false}
                  className="w-40 text-xs"
                  buttonClassName={`h-8 py-1 px-3 text-xs font-bold rounded-lg border-none ${
                    STATUS_TONES[normalizedStatus] || STATUS_TONES['To Do']
                  }`}
                />
              </div>
            </NotionPropertyRow>
          )}

          {/* Assigned Team */}
          <NotionPropertyRow icon={Users} label="Assignees">
            {assigneesList.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {assigneesList.map((assignee, idx) => {
                  const name = typeof assignee === 'object' ? assignee.name : assignee;
                  const avatar = typeof assignee === 'object' ? assignee.avatar : null;
                  return (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-secondary/80 text-xs font-semibold">
                      {avatar ? (
                        <img src={getAssetUrl(avatar)} alt="" className="w-4 h-4 rounded-full object-cover" />
                      ) : (
                        <User size={12} className="text-muted-foreground" />
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

          {/* Manager */}
          {task.assignedManager && (
            <NotionPropertyRow icon={User} label="Manager">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-secondary text-xs font-semibold">
                {task.assignedManager.avatar ? (
                  <img src={getAssetUrl(task.assignedManager.avatar)} alt="" className="w-4 h-4 rounded-full object-cover" />
                ) : (
                  <User size={12} className="text-muted-foreground" />
                )}
                <span>{task.assignedManager.name || 'Manager'}</span>
              </span>
            </NotionPropertyRow>
          )}

          {/* Task Type */}
          <NotionPropertyRow icon={Tag} label="Task Type">
            <span className="font-semibold text-foreground">{formatTaskTypeLabel(task.taskType)}</span>
          </NotionPropertyRow>

          {/* Content Type / Video Type */}
          {(task.contentType || task.videoType) && (
            <NotionPropertyRow icon={Video} label="Media Format">
              <span className="font-semibold text-foreground capitalize">
                {[task.contentType, task.videoType].filter(Boolean).map((v) => v.replace(/_/g, ' ')).join(' • ')}
              </span>
            </NotionPropertyRow>
          )}

          {/* Created Date */}
          <NotionPropertyRow icon={Calendar} label="Created Date">
            <span className="text-foreground font-semibold tabular-nums">
              {task.createdAt ? new Date(task.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
            </span>
          </NotionPropertyRow>

          {/* Due Date & Time */}
          <NotionPropertyRow icon={Clock} label="Due Date">
            <span className="text-foreground font-semibold tabular-nums">
              {task.dueDate ? new Date(task.dueDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not set'}
            </span>
          </NotionPropertyRow>

          {/* Client Approval Status */}
          <NotionPropertyRow icon={CheckCircle2} label="Client Approval">
            <span className="capitalize font-semibold text-foreground">
              {task.approvalStatus || task.clientResponse || 'Pending'}
            </span>
          </NotionPropertyRow>

          {/* Posting Scheduled */}
          {task.postingScheduleDate && (
            <NotionPropertyRow icon={Calendar} label="Posting Date">
              <span className="font-semibold text-foreground tabular-nums">
                {new Date(task.postingScheduleDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </NotionPropertyRow>
          )}

          {/* Completion Timer & Acceptance */}
          {(task.allocatedHours > 0 || task.allocatedMinutes > 0 || task.timerExpiresAt) && (
            <NotionPropertyRow icon={Clock} label="Timer Allocation">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-foreground tabular-nums">
                  {task.allocatedHours || 0}h {task.allocatedMinutes || 0}m
                </span>
                {task.isAccepted ? (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-secondary text-foreground ">
                    Accepted &amp; Started
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-secondary text-muted-foreground ">
                    Awaiting Acceptance
                  </span>
                )}
                {task.isOverdue && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary text-primary-foreground ">
                    <AlertTriangle size={11} />
                    <span>Overdue</span>
                  </span>
                )}
              </div>
            </NotionPropertyRow>
          )}

          {/* Submission Status & Delay Reason */}
          {(task.completionReason || task.submissionStatus) && (
            <NotionPropertyRow icon={AlertCircle} label="Submission / Delay Reason">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                    task.submissionStatus === 'on_time'
                      ? 'bg-primary text-primary-foreground '
                      : 'bg-secondary text-foreground '
                  }`}>
                    {task.submissionStatus === 'on_time' ? 'Submitted On Time' :
                     task.submissionStatus === 'completed_with_delay' ? 'Submitted With Delay' :
                     'Incomplete With Reason'}
                  </span>
                  {task.actualTimeSpentMinutes > 0 && (
                    <span className="text-xs text-muted-foreground font-medium tabular-nums">
                      Spent: {Math.floor(task.actualTimeSpentMinutes / 60)}h {task.actualTimeSpentMinutes % 60}m
                    </span>
                  )}
                </div>
                {task.completionReason && (
                  <p className="text-xs text-muted-foreground italic">
                    "{task.completionReason}"
                  </p>
                )}
              </div>
            </NotionPropertyRow>
          )}
        </div>
      </div>

      {/* ── Notion Production Pipeline & Multi-Person Sub-Assignments ── */}
      {hasPipeline && (
        <div className="rounded-3xl bg-card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-widest inline-flex items-center gap-2">
              <Flame size={16} className="text-foreground" /> Production Workflow &amp; Team Assignments
            </h3>
            {task.postingScheduleDate && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-foreground font-bold text-xs tabular-nums">
                <Clock size={12} /> Scheduled: {new Date(task.postingScheduleDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
            {/* 1. Script Writer */}
            <div className="p-4 rounded-2xl bg-secondary/30 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                <FileEdit size={11} /> 1. Script Writer
              </span>
              <p className="font-bold text-foreground text-sm truncate">
                {task.scriptWriterAssigned?.name || task.scriptWriterName || 'Unassigned'}
              </p>
              <span className="text-xs text-muted-foreground block">{task.scriptWriterAssigned?.role || 'Copywriter'}</span>
            </div>

            {/* 2. RJ / Voice Artist */}
            <div className="p-4 rounded-2xl bg-secondary/30 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                <Mic size={11} /> 2. RJ / Voice Artist
              </span>
              <p className="font-bold text-foreground text-sm truncate">
                {task.voiceArtistAssigned?.name || task.voiceArtistName || 'Unassigned'}
              </p>
              <span className="text-xs text-muted-foreground block">{task.voiceArtistAssigned?.role || 'Voice Artist'}</span>
            </div>

            {/* 3. Videographer */}
            <div className="p-4 rounded-2xl bg-secondary/30 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                <Video size={11} /> 3. Videographer
              </span>
              <p className="font-bold text-foreground text-sm truncate">
                {task.videographerAssigned?.name || task.videographerName || 'Unassigned'}
              </p>
              <span className="text-xs text-muted-foreground block">{task.videographerAssigned?.role || 'Shoot Specialist'}</span>
            </div>

            {/* 4. Editor */}
            <div className="p-4 rounded-2xl bg-secondary/30 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                <Scissors size={11} /> 4. Video Editor
              </span>
              <p className="font-bold text-foreground text-sm truncate">
                {task.editorAssigned?.name || task.editorName || 'Unassigned'}
              </p>
              <span className="text-xs text-muted-foreground block">{task.editorAssigned?.role || 'Post-Production'}</span>
            </div>

            {/* 5. Publisher */}
            <div className="p-4 rounded-2xl bg-secondary/30 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                <Smartphone size={11} /> 5. Publisher / Socials
              </span>
              <p className="font-bold text-foreground text-sm truncate">
                {task.publisherAssigned?.name || task.publisherName || 'Unassigned'}
              </p>
              <span className="text-xs text-muted-foreground block">{task.publisherAssigned?.role || 'Distribution'}</span>
            </div>
          </div>

          {/* RJ / Voice Script & Instructions Card */}
          {(task.voiceScriptText || task.voiceInstructions) && (
            <div className="rounded-2xl bg-secondary/40 p-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground inline-flex items-center gap-1.5">
                <Mic size={13} /> RJ / Voice-Over Script &amp; Brief
              </span>
              {task.voiceScriptText && (
                <div className="rounded-xl bg-background p-3 ">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">Voice Script / Lines</span>
                  <p className="text-sm font-medium text-foreground whitespace-pre-line mt-1">{task.voiceScriptText}</p>
                </div>
              )}
              {task.voiceInstructions && (
                <div className="rounded-xl bg-background p-3 ">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">Voice Instructions (Tone / Pace / Dialect)</span>
                  <p className="text-xs font-medium text-foreground mt-0.5">{task.voiceInstructions}</p>
                </div>
              )}
            </div>
          )}

          {/* Videographer Content Requirements Card */}
          {task.videographerContentNeeded && (
            <div className="rounded-2xl bg-secondary/40 p-4 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground inline-flex items-center gap-1.5">
                <Video size={13} /> What Content / Shots Needed for Videographer
              </span>
              <div className="rounded-xl bg-background p-3 ">
                <p className="text-sm font-medium text-foreground whitespace-pre-line">{task.videographerContentNeeded}</p>
              </div>
            </div>
          )}

          {/* Shoot & Footage Details Row */}
          {(task.shootDate || task.shootLocation || task.rawFootageLink || task.finalVideoDriveLink || task.editingReferenceVideo) && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-3 text-xs">
              {task.shootDate && (
                <div className="rounded-xl bg-background p-3 ">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground inline-flex items-center gap-1">
                    <Calendar size={10} /> Shoot Date &amp; Time
                  </span>
                  <span className="font-semibold text-foreground mt-0.5 block tabular-nums">
                    {new Date(task.shootDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    {task.shootTime ? ` at ${task.shootTime}` : ''}
                  </span>
                </div>
              )}
              {task.shootLocation && (
                <div className="rounded-xl bg-background p-3 ">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground inline-flex items-center gap-1">
                    <MapPin size={10} /> Shoot Location
                  </span>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span className="font-semibold text-foreground truncate">{task.shootLocation}</span>
                    {task.shootLocationLink && (
                      <a href={task.shootLocationLink} target="_blank" rel="noreferrer" className="text-foreground hover:underline font-bold text-[11px] shrink-0 inline-flex items-center gap-0.5">
                        <span>Map</span>
                        <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              )}
              {task.rawFootageLink && (
                <div className="rounded-xl bg-secondary p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-foreground inline-flex items-center gap-1">
                      <UploadCloud size={11} /> Raw Footage Link
                    </span>
                    <CopyButton text={task.rawFootageLink} label="Copy" />
                  </div>
                  <a href={task.rawFootageLink} target="_blank" rel="noreferrer" className="font-bold text-foreground hover:underline flex items-center justify-between text-xs">
                    <span className="truncate">Open Drive Folder</span>
                    <ExternalLink size={11} className="shrink-0" />
                  </a>
                </div>
              )}
              {task.finalVideoDriveLink && (
                <div className="rounded-xl bg-secondary p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-foreground inline-flex items-center gap-1">
                      <Film size={11} /> Final Video Drive
                    </span>
                    <CopyButton text={task.finalVideoDriveLink} label="Copy" />
                  </div>
                  <a href={task.finalVideoDriveLink} target="_blank" rel="noreferrer" className="font-bold text-foreground hover:underline flex items-center justify-between text-xs">
                    <span className="truncate">Open Video Link</span>
                    <ExternalLink size={11} className="shrink-0" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Platforms Chips */}
          {task.postingPlatforms && task.postingPlatforms.length > 0 && (
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground">Target Channels:</span>
              {task.postingPlatforms.map((platform, idx) => (
                <span key={idx} className="px-2.5 py-1 rounded-xl bg-secondary text-xs font-semibold text-foreground ">
                  {platform}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Navigation Workspace Tabs ── */}
      <div className="inline-flex max-w-full items-center gap-1 bg-secondary/75 p-1 rounded-xl overflow-x-auto no-scrollbar">
        {[
          { id: 'brief', label: 'Brief & Content Scope', icon: FileText },
          { id: 'deliverables', label: `Deliverables & Files (${(task.attachments?.length || 0) + (task.completedFiles?.length || 0)})`, icon: FolderArchive },
          { id: 'progress', label: `Progress & Logs (${task.progressUpdates?.length || 0})`, icon: Clock },
          { id: 'review', label: 'Client Feedback', icon: MessageSquare },
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

      {/* ── TAB CONTENT: Brief & Creative Content ── */}
      {activeTab === 'brief' && (
        <div className="space-y-6">
          {/* Description / Requirements */}
          <div className="rounded-3xl bg-card p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider inline-flex items-center gap-2">
                <ClipboardList size={15} /> Brief &amp; Task Requirements
              </h3>
              {task.description && <CopyButton text={task.description} label="Copy Brief" />}
            </div>
            <div className="rounded-2xl bg-background p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {task.description || 'No detailed brief or requirements provided for this task.'}
            </div>
          </div>

          {/* Script Box (For Reels / Videos / Content) */}
          {task.taskCategory === 'content' && (
            <div className="rounded-3xl bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider inline-flex items-center gap-2">
                    <FileText size={15} /> Video Script &amp; Hook
                  </h3>
                  {task.scriptText && (
                    <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
                      ({task.scriptText.split(/\s+/).filter(Boolean).length} words • ~{Math.ceil(task.scriptText.split(/\s+/).filter(Boolean).length / 2.5)}s read)
                    </span>
                  )}
                </div>
                {task.scriptText && <CopyButton text={task.scriptText} label="Copy Script" />}
              </div>

              {task.scriptText ? (
                <div className="rounded-2xl bg-background p-5 text-sm font-mono text-foreground whitespace-pre-wrap leading-relaxed custom-scrollbar">
                  {task.scriptText}
                </div>
              ) : (
                <div className="rounded-2xl bg-background/50 p-6 text-center text-xs text-muted-foreground">
                  No script text provided.
                </div>
              )}

              {task.scriptLink && (
                <div className="flex items-center justify-between rounded-2xl bg-secondary/30 px-4 py-3">
                  <span className="text-xs font-semibold text-muted-foreground">Google Docs / External Script Link:</span>
                  <a href={task.scriptLink} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                    <span>Open Script Document</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Caption, Hashtags & Keywords */}
          {task.taskCategory === 'content' && (
            <div className="rounded-3xl bg-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider inline-flex items-center gap-2">
                  <MessageSquare size={15} /> Social Caption &amp; Tags
                </h3>
                {task.caption && <CopyButton text={`${task.caption}\n\n${task.hashtags || ''}`} label="Copy Caption + Tags" />}
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl bg-background p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {task.caption || 'No caption drafted for this post yet.'}
                </div>

                {task.hashtags && (
                  <div className="p-3.5 rounded-2xl bg-secondary/40 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground inline-flex items-center gap-1">
                      <Hash size={11} /> Hashtags
                    </span>
                    <p className="text-xs font-semibold text-foreground break-all">{task.hashtags}</p>
                  </div>
                )}

                {task.keywords && (
                  <div className="p-3.5 rounded-2xl bg-secondary/40 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground inline-flex items-center gap-1">
                      <Tag size={11} /> SEO Keywords &amp; Hooks
                    </span>
                    <p className="text-xs font-semibold text-foreground">{task.keywords}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Website / Technical Specifications */}
          {isWebsiteTaskType(task.taskType) && (
            <div className="rounded-3xl bg-card p-6 space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider inline-flex items-center gap-2">
                <Laptop size={15} /> Website &amp; Development Architecture
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 rounded-2xl bg-background space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Website Type</span>
                  <p className="text-sm font-bold text-foreground">{task.websiteType || 'Custom Website'}</p>
                </div>

                <div className="p-4 rounded-2xl bg-background space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Pages Needed</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(task.pagesNeeded || []).length > 0 ? (
                      task.pagesNeeded.map((page, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-lg bg-secondary text-xs font-bold text-foreground">
                          {page}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Standard Pages</span>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-background space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Domain Information</span>
                  <p className="text-sm font-semibold text-foreground">{task.domainDetails || 'Not specified'}</p>
                </div>

                <div className="p-4 rounded-2xl bg-background space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Hosting &amp; Server</span>
                  <p className="text-sm font-semibold text-foreground">{task.hostingDetails || 'Not specified'}</p>
                </div>
              </div>

              {/* Admin Credentials Card */}
              {task.adminCredentials && (
                <div className="rounded-2xl bg-secondary/40 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground inline-flex items-center gap-1.5">
                      <Lock size={13} /> Admin Credentials / Access Info
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCredentials(!showCredentials)}
                        className="text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer"
                      >
                        {showCredentials ? <EyeOff size={13} /> : <Eye size={13} />}
                        <span>{showCredentials ? 'Hide' : 'Show'}</span>
                      </button>
                      <CopyButton text={task.adminCredentials} label="Copy Credentials" />
                    </div>
                  </div>
                  <div className="rounded-xl bg-background p-3 text-xs font-mono text-foreground whitespace-pre-wrap">
                    {showCredentials ? task.adminCredentials : '•••••••••••••••••••••••••••••••• (Click Show to view)'}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reference Links & Inspiration */}
          {(task.referenceLink || task.audioReference || task.editorGuide || task.internalNotes) && (
            <div className="rounded-3xl bg-card p-6 space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider inline-flex items-center gap-2">
                <Link2 size={15} /> Inspiration, Audio &amp; Editorial Guidelines
              </h3>

              <div className="grid gap-3.5 sm:grid-cols-2">
                {task.referenceLink && (
                  <div className="p-4 rounded-2xl bg-background space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Inspiration Reference Link</span>
                    <a href={task.referenceLink} target="_blank" rel="noreferrer" className="text-xs font-bold text-foreground hover:underline flex items-center gap-1 truncate">
                      <span className="truncate">{task.referenceLink}</span>
                      <ArrowUpRight size={12} className="shrink-0" />
                    </a>
                  </div>
                )}

                {task.audioReference && (
                  <div className="p-4 rounded-2xl bg-background space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Audio / Music Reference</span>
                    <a href={task.audioReference} target="_blank" rel="noreferrer" className="text-xs font-bold text-foreground hover:underline flex items-center gap-1 truncate">
                      <span className="truncate">{task.audioReference}</span>
                      <ArrowUpRight size={12} className="shrink-0" />
                    </a>
                  </div>
                )}

                {task.editorGuide && (
                  <div className="p-4 rounded-2xl bg-background space-y-1 sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Editor Direction &amp; Guidelines</span>
                    <p className="text-xs text-foreground whitespace-pre-wrap">{task.editorGuide}</p>
                  </div>
                )}

                {task.internalNotes && (
                  <div className="p-4 rounded-2xl bg-secondary/40 space-y-1 sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Internal Agency Notes</span>
                    <p className="text-xs text-foreground whitespace-pre-wrap">{task.internalNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB CONTENT: Deliverables & Files ── */}
      {activeTab === 'deliverables' && (
        <div className="space-y-6">
          {/* Upload Completed Files (Team only) */}
          {!isClient && (
            <div className="rounded-3xl bg-card p-6 space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider inline-flex items-center gap-2">
                <UploadCloud size={18} className="text-foreground" /> Upload Final Deliverables
              </h3>
              <div className="rounded-2xl bg-secondary/20 p-6 text-center space-y-3">
                <input
                  type="file"
                  multiple
                  id="task-file-upload"
                  className="hidden"
                  onChange={(e) => setCompletedFiles(Array.from(e.target.files || []))}
                />
                <label
                  htmlFor="task-file-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 cursor-pointer"
                >
                  <Plus size={14} /> Choose Files
                </label>
              </div>

              {completedFiles.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-foreground">Selected for Upload:</span>
                  <div className="space-y-1.5">
                    {completedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-xl bg-background px-3 py-2 text-xs">
                        <span className="font-semibold text-foreground truncate">{file.name}</span>
                        <span className="text-muted-foreground tabular-nums">{Math.round(file.size / 1024)} KB</span>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={handleUploadCompleted}
                    disabled={addCompletedFiles.isPending}
                    className="w-full mt-2 font-bold"
                  >
                    {addCompletedFiles.isPending ? 'Uploading...' : 'Confirm & Save Deliverables'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Completed Files Gallery */}
          <div className="rounded-3xl bg-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider inline-flex items-center gap-2 tabular-nums">
              <CheckCircle2 size={16} className="text-foreground" /> Completed Deliverables ({(task.completedFiles || []).length})
            </h3>

            {(task.completedFiles || []).length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {task.completedFiles.map((file, index) => {
                  const fileUrl = getAssetUrl(file.url);
                  const isImg = file.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.url || file.name || '');

                  return (
                    <a
                      key={index}
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-background hover:bg-secondary/40 transition-all "
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isImg ? (
                          <img src={fileUrl} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-foreground shrink-0">
                            <FileText size={20} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-foreground text-sm truncate group-hover:underline transition-colors">
                            {file.name || 'Deliverable File'}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{file.type || 'File Asset'}</p>
                        </div>
                      </div>
                      <Download size={16} className="text-muted-foreground group-hover:text-foreground shrink-0" />
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl p-8 text-center text-xs text-muted-foreground">
                No completed deliverables uploaded yet.
              </div>
            )}
          </div>

          {/* Brief Attachments */}
          <div className="rounded-3xl bg-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider inline-flex items-center gap-2 tabular-nums">
              <Paperclip size={15} /> Initial Brief Attachments ({(task.attachments || []).length})
            </h3>

            {(task.attachments || []).length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {task.attachments.map((file, index) => {
                  const fileUrl = getAssetUrl(file.url);
                  const isImg = file.type?.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.url || file.name || '');

                  return (
                    <a
                      key={index}
                      href={fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-background hover:bg-secondary/40 transition-all "
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isImg ? (
                          <img src={fileUrl} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
                            <FileText size={20} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-foreground text-sm truncate group-hover:underline transition-colors">
                            {file.name || 'Attachment'}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{file.type || 'Attachment'}</p>
                        </div>
                      </div>
                      <Download size={16} className="text-muted-foreground group-hover:text-foreground shrink-0" />
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl p-8 text-center text-xs text-muted-foreground">
                No initial brief attachments uploaded.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: Progress & Logs ── */}
      {activeTab === 'progress' && (
        <div className="space-y-6">
          {!isClient && (
            <div className="rounded-3xl bg-card p-6 space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider inline-flex items-center gap-2">
                <FileEdit size={15} /> Log Today&apos;s Work Progress
              </h3>
              <ProgressUpdateForm taskId={task._id} onSuccess={refetch} />
            </div>
          )}

          <div className="rounded-3xl bg-card p-6 space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider inline-flex items-center gap-2 tabular-nums">
              <TrendingUp size={15} /> Progress Timeline ({(task.progressUpdates || []).length})
            </h3>

            {(task.progressUpdates || []).length > 0 ? (
              <div className="space-y-3">
                {task.progressUpdates.slice().reverse().map((update, idx) => (
                  <div key={idx} className="rounded-2xl bg-background p-4 space-y-2 ">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold text-foreground text-sm">{update.description}</p>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {update.completedAt ? new Date(update.completedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently'}
                      </span>
                    </div>
                    {update.workNotes && (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{update.workNotes}</p>
                    )}
                    {update.hours ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-foreground px-2 py-0.5 rounded-md bg-secondary tabular-nums">
                        <Clock size={11} /> {update.hours} hours logged
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl p-8 text-center text-xs text-muted-foreground">
                No progress updates logged for this task yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: Client Feedback & Approval ── */}
      {activeTab === 'review' && (
        <div className="rounded-3xl bg-card p-6 space-y-6">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider inline-flex items-center gap-2">
            <MessageSquare size={15} /> Client Approval &amp; Review Status
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 rounded-2xl bg-background space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Approval Status</span>
              <p className="text-sm font-bold capitalize text-foreground">{task.approvalStatus || 'Pending Review'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-background space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Client Response</span>
              <p className="text-sm font-bold capitalize text-foreground">{task.clientResponse || 'Pending'}</p>
            </div>

            <div className="p-4 rounded-2xl bg-background space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Response Date</span>
              <p className="text-sm font-semibold text-foreground tabular-nums">
                {task.clientResponseDate ? new Date(task.clientResponseDate).toLocaleString() : 'Not submitted yet'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-background space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Submitted By</span>
              <p className="text-sm font-semibold text-foreground">{task.clientResponseBy?.name || '—'}</p>
            </div>
          </div>

          {task.clientFeedback && (
            <div className="rounded-2xl bg-background p-4 space-y-1.5">
              <span className="text-xs font-bold text-foreground">Client Feedback Comments:</span>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{task.clientFeedback}</p>
            </div>
          )}

          {task.rejectionReason && (
            <div className="rounded-2xl bg-secondary p-4 space-y-1.5 text-foreground">
              <span className="text-xs font-bold inline-flex items-center gap-1.5">
                <AlertCircle size={14} /> Rejection / Rework Reason:
              </span>
              <p className="text-xs whitespace-pre-wrap leading-relaxed text-muted-foreground">{task.rejectionReason}</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      <AddTaskModal
        open={editing}
        onOpenChange={(open) => {
          setEditing(open);
          if (!open) refetch();
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

      {/* Task Submission Modal with Reason */}
      <TaskSubmitModal
        open={showSubmitModal}
        onOpenChange={setShowSubmitModal}
        task={task}
        onSubmitted={() => refetch()}
      />
    </div>
  );
};

export default TaskDetails;
