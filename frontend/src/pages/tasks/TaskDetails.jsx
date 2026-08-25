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
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { AddTaskModal } from '../../components/modals/AddTaskModal';
import { ProgressUpdateForm } from '../../components/ui/ProgressUpdateForm';
import { useAddCompletedFiles, useTask, useUpdateTaskStatus } from '../../hooks/useTasks';
import {
  formatTaskTypeLabel,
  isWebsiteTaskType,
  normalizeTaskStatusLabel,
  TASK_STATUS_OPTIONS,
  TEAM_STATUS_OPTIONS,
  uploadFiles,
} from '../../utils/taskFields';
import { getAssetUrl } from '../../utils/assetUrl';
import toast from 'react-hot-toast';

const STATUS_TONES = {
  'To Do': 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700',
  'On Process': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700/50',
  'Waiting for Client': 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700/50',
  Completed: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700/50',
  Rework: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700/50',
  Approved: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/40 dark:text-green-300 dark:border-green-700/50',
  'Rework Completed': 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700/50',
  'Review Required': 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700/50',
};

const PRIORITY_TONES = {
  Low: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400',
  Medium: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/50 dark:text-blue-400',
  High: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-400',
  Urgent: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-400 font-bold',
};

const getCategoryIcon = (category, type) => {
  const cat = (category || '').toLowerCase();
  const t = (type || '').toLowerCase();
  if (t.includes('reel') || t.includes('video') || t.includes('youtube')) return <Film className="text-purple-500" size={20} />;
  if (t.includes('poster') || t.includes('design') || t.includes('carousel')) return <Sparkles className="text-amber-500" size={20} />;
  if (t.includes('website') || t.includes('landing')) return <Globe className="text-blue-500" size={20} />;
  if (cat.includes('content')) return <FileText className="text-emerald-500" size={20} />;
  return <Layers className="text-primary" size={20} />;
};

const NotionPropertyRow = ({ icon: Icon, label, children }) => (
  <div className="flex items-start gap-4 py-2.5 px-3 rounded-xl hover:bg-secondary/40 transition-colors">
    <div className="flex items-center gap-2 w-36 sm:w-44 shrink-0 text-xs font-semibold text-muted-foreground select-none">
      <Icon size={14} className="shrink-0 text-muted-foreground/70" />
      <span className="truncate">{label}</span>
    </div>
    <div className="flex-1 min-w-0 text-sm font-medium text-foreground">
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
      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/60 transition-all active:scale-95 cursor-pointer select-none"
      title={`Copy ${label}`}
    >
      {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
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

  const isEmployee = user?.role === 'employee';
  const isClient = user?.role === 'client';
  const canEdit = ['superAdmin', 'manager'].includes(user?.role);
  const allowedStatusOptions = isEmployee ? TEAM_STATUS_OPTIONS : TASK_STATUS_OPTIONS;

  useEffect(() => {
    if (user?.role === 'employee' && id) {
      navigate(`/tasks?open=${id}`, { replace: true });
    }
  }, [user?.role, id, navigate]);

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
      <div className="space-y-6 max-w-6xl mx-auto py-6 animate-pulse">
        <div className="h-8 w-64 rounded-xl bg-secondary/70" />
        <div className="h-40 rounded-3xl bg-secondary/50 border border-border" />
        <div className="grid gap-6 md:grid-cols-3">
          <div className="h-80 rounded-3xl bg-secondary/50 border border-border md:col-span-2" />
          <div className="h-80 rounded-3xl bg-secondary/50 border border-border" />
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
    <div className="max-w-6xl mx-auto pb-20 space-y-6">
      {/* ── Top Notion Breadcrumb & Actions Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-2 border-b border-border/70">
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
            className="flex items-center gap-1.5 rounded-xl border-border text-xs font-bold hover:bg-secondary"
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
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border-primary/30 text-xs font-bold text-primary hover:bg-primary/5"
              >
                <Plus size={13} />
                <span>Assign Another</span>
              </Button>

              <Button
                size="sm"
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:bg-primary/95"
              >
                <Edit3 size={13} />
                <span>Edit Task</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Notion Page Hero & Title ── */}
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/80 border border-border shrink-0 shadow-xs">
            {getCategoryIcon(task.taskCategory, task.taskType)}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${STATUS_TONES[normalizedStatus] || STATUS_TONES['To Do']}`}>
                {normalizedStatus}
              </span>
              {task.priority && (
                <span className={`px-2.5 py-1 rounded-lg border text-xs font-semibold ${PRIORITY_TONES[task.priority] || PRIORITY_TONES.Medium}`}>
                  {task.priority} Priority
                </span>
              )}
              {task.taskCategory && (
                <Badge variant="secondary" className="text-xs font-semibold">
                  {task.taskCategory === 'non_content' ? 'Non-Content Task' : 'Content Task'}
                </Badge>
              )}
              {task.isOverTarget && (
                <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs font-extrabold uppercase text-rose-600 dark:text-rose-400 flex items-center gap-1.5 shadow-2xs">
                  🔴 Over Target Deliverable
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              {task.taskTitle || task.title}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground flex flex-wrap items-center gap-2">
              {task.client?.name && (
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <Building2 size={13} className="text-primary" /> {task.client.name}
                </span>
              )}
              {task.project?.name && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Briefcase size={13} /> {task.project.name}
                  </span>
                </>
              )}
              {task.createdAt && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar size={13} /> Created {new Date(task.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </>
              )}
              {task.dueDate && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar size={13} /> Due {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {task.isOverTarget && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 sm:p-4 text-rose-700 dark:text-rose-300 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 font-bold">
              <span className="text-base">🔴</span>
              <span>This task exceeded the configured monthly deliverable quota for this project.</span>
            </div>
            {task.targetExceededBy > 0 && (
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-700 dark:text-rose-300 font-extrabold text-[11px] border border-rose-500/30">
                +{task.targetExceededBy} Exceeded Over Target
              </span>
            )}
          </div>
        )}

        {/* ── Notion Property Matrix ── */}
        <div className="border-t border-border/70 pt-4 grid gap-1 sm:grid-cols-2">
          {/* Status Changer */}
          {!isClient && (
            <NotionPropertyRow icon={ShieldCheck} label="Status">
              <select
                value={normalizedStatus}
                onChange={(e) => updateStatus.mutate({ id: task._id, status: e.target.value })}
                className="bg-transparent text-sm font-bold text-foreground border-b border-border/80 pb-0.5 outline-none hover:border-primary focus:border-primary transition-colors cursor-pointer"
              >
                {allowedStatusOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
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
                    <span key={idx} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-secondary/80 border border-border text-xs font-semibold">
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
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-secondary/80 border border-border text-xs font-semibold">
                {task.assignedManager.avatar ? (
                  <img src={getAssetUrl(task.assignedManager.avatar)} alt="" className="w-4 h-4 rounded-full object-cover" />
                ) : (
                  <User size={12} className="text-primary" />
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
            <span className="text-foreground font-semibold">
              {task.createdAt ? new Date(task.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
            </span>
          </NotionPropertyRow>

          {/* Due Date & Time */}
          <NotionPropertyRow icon={Clock} label="Due Date">
            <span className="text-foreground font-semibold">
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
              <span className="font-semibold text-primary">
                {new Date(task.postingScheduleDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </NotionPropertyRow>
          )}
        </div>
      </div>

      {/* ── Notion Production Pipeline & Multi-Person Sub-Assignments ── */}
      {hasPipeline && (
        <div className="rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/5 via-card to-card p-6 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
              <Flame size={16} className="text-primary" /> Production Workflow & Team Assignments
            </h3>
            {task.postingScheduleDate && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs">
                <Clock size={12} /> Scheduled: {new Date(task.postingScheduleDate).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
            {/* 1. Script Writer */}
            <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                ✍️ 1. Script Writer
              </span>
              <p className="font-bold text-foreground text-sm truncate">
                {task.scriptWriterAssigned?.name || task.scriptWriterName || 'Unassigned'}
              </p>
              <span className="text-xs text-muted-foreground block">{task.scriptWriterAssigned?.role || 'Copywriter'}</span>
            </div>

            {/* 2. RJ / Voice Artist */}
            <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                🎙️ 2. RJ / Voice Artist
              </span>
              <p className="font-bold text-foreground text-sm truncate">
                {task.voiceArtistAssigned?.name || task.voiceArtistName || 'Unassigned'}
              </p>
              <span className="text-xs text-muted-foreground block">{task.voiceArtistAssigned?.role || 'Voice Artist'}</span>
            </div>

            {/* 3. Videographer */}
            <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                🎥 3. Videographer
              </span>
              <p className="font-bold text-foreground text-sm truncate">
                {task.videographerAssigned?.name || task.videographerName || 'Unassigned'}
              </p>
              <span className="text-xs text-muted-foreground block">{task.videographerAssigned?.role || 'Shoot Specialist'}</span>
            </div>

            {/* 4. Editor */}
            <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                ✂️ 4. Video Editor
              </span>
              <p className="font-bold text-foreground text-sm truncate">
                {task.editorAssigned?.name || task.editorName || 'Unassigned'}
              </p>
              <span className="text-xs text-muted-foreground block">{task.editorAssigned?.role || 'Post-Production'}</span>
            </div>

            {/* 5. Publisher */}
            <div className="p-4 rounded-2xl bg-card border border-border shadow-2xs space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                📱 5. Publisher / Socials
              </span>
              <p className="font-bold text-foreground text-sm truncate">
                {task.publisherAssigned?.name || task.publisherName || 'Unassigned'}
              </p>
              <span className="text-xs text-muted-foreground block">{task.publisherAssigned?.role || 'Distribution'}</span>
            </div>
          </div>

          {/* 🎙️ RJ / Voice Script & Instructions Card */}
          {(task.voiceScriptText || task.voiceInstructions) && (
            <div className="rounded-2xl bg-indigo-500/5 border border-indigo-500/20 p-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                🎙️ RJ / Voice-Over Script & Brief
              </span>
              {task.voiceScriptText && (
                <div className="rounded-xl bg-background/80 p-3 border border-border/60">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">Voice Script / Lines</span>
                  <p className="text-sm font-medium text-foreground whitespace-pre-line mt-1">{task.voiceScriptText}</p>
                </div>
              )}
              {task.voiceInstructions && (
                <div className="rounded-xl bg-background/80 p-3 border border-border/60">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">Voice Instructions (Tone / Pace / Dialect)</span>
                  <p className="text-xs font-medium text-foreground mt-0.5">{task.voiceInstructions}</p>
                </div>
              )}
            </div>
          )}

          {/* 🎥 Videographer Content Requirements Card */}
          {task.videographerContentNeeded && (
            <div className="rounded-2xl bg-sky-500/5 border border-sky-500/20 p-4 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                🎥 What Content / Shots Needed for Videographer
              </span>
              <div className="rounded-xl bg-background/80 p-3 border border-border/60">
                <p className="text-sm font-medium text-foreground whitespace-pre-line">{task.videographerContentNeeded}</p>
              </div>
            </div>
          )}

          {/* Shoot & Footage Details Row */}
          {(task.shootDate || task.shootLocation || task.rawFootageLink) && (
            <div className="grid gap-3 sm:grid-cols-3 pt-3 border-t border-border/50 text-xs">
              {task.shootDate && (
                <div className="rounded-xl bg-background/80 p-3 border border-border/60">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">📅 Shoot Date</span>
                  <span className="font-semibold text-foreground mt-0.5 block">{new Date(task.shootDate).toLocaleString()}</span>
                </div>
              )}
              {task.shootLocation && (
                <div className="rounded-xl bg-background/80 p-3 border border-border/60">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">📍 Location</span>
                  <span className="font-semibold text-foreground mt-0.5 block truncate">{task.shootLocation}</span>
                </div>
              )}
              {task.rawFootageLink && (
                <div className="rounded-xl bg-background/80 p-3 border border-border/60">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground block">📁 Raw Footage Link</span>
                  <a href={task.rawFootageLink} target="_blank" rel="noreferrer" className="font-bold text-primary hover:underline flex items-center gap-1 mt-0.5 truncate">
                    <span>Open Drive Folder</span>
                    <ExternalLink size={12} />
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
                <span key={idx} className="px-2.5 py-1 rounded-xl bg-card border border-border text-xs font-semibold text-foreground shadow-2xs">
                  {platform}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Navigation Workspace Tabs ── */}
      <div className="flex items-center gap-2 border-b border-border">
        {[
          { id: 'brief', label: 'Brief & Content Scope', icon: FileText },
          { id: 'deliverables', label: `Deliverables & Files (${(task.attachments?.length || 0) + (task.completedFiles?.length || 0)})`, icon: FolderArchive },
          { id: 'progress', label: `Progress & Logs (${task.progressUpdates?.length || 0})`, icon: Clock },
          { id: 'review', label: 'Client Feedback', icon: MessageSquare },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer select-none ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon size={15} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT: Brief & Creative Content ── */}
      {activeTab === 'brief' && (
        <div className="space-y-6">
          {/* Description / Requirements */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                📋 Brief & Task Requirements
              </h3>
              {task.description && <CopyButton text={task.description} label="Copy Brief" />}
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {task.description || 'No detailed brief or requirements provided for this task.'}
            </div>
          </div>

          {/* Script Box (For Reels / Videos / Content) */}
          {task.taskCategory === 'content' && (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    📜 Video Script & Hook
                  </h3>
                  {task.scriptText && (
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      ({task.scriptText.split(/\s+/).filter(Boolean).length} words • ~{Math.ceil(task.scriptText.split(/\s+/).filter(Boolean).length / 2.5)}s read)
                    </span>
                  )}
                </div>
                {task.scriptText && <CopyButton text={task.scriptText} label="Copy Script" />}
              </div>

              {task.scriptText ? (
                <div className="rounded-2xl border border-border/80 bg-background p-5 text-sm font-mono text-foreground whitespace-pre-wrap leading-relaxed custom-scrollbar">
                  {task.scriptText}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-background/50 p-6 text-center text-xs text-muted-foreground">
                  No script text provided.
                </div>
              )}

              {task.scriptLink && (
                <div className="flex items-center justify-between rounded-2xl border border-border bg-secondary/30 px-4 py-3">
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
            <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  💬 Social Caption & Tags
                </h3>
                {task.caption && <CopyButton text={`${task.caption}\n\n${task.hashtags || ''}`} label="Copy Caption + Tags" />}
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-border bg-background p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {task.caption || 'No caption drafted for this post yet.'}
                </div>

                {task.hashtags && (
                  <div className="p-3.5 rounded-2xl border border-border bg-secondary/30 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                      <Hash size={11} /> Hashtags
                    </span>
                    <p className="text-xs font-semibold text-primary break-all">{task.hashtags}</p>
                  </div>
                )}

                {task.keywords && (
                  <div className="p-3.5 rounded-2xl border border-border bg-secondary/30 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                      <Tag size={11} /> SEO Keywords & Hooks
                    </span>
                    <p className="text-xs font-semibold text-foreground">{task.keywords}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Website / Technical Specifications */}
          {isWebsiteTaskType(task.taskType) && (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                💻 Website & Development Architecture
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 rounded-2xl border border-border bg-background space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Website Type</span>
                  <p className="text-sm font-bold text-foreground">{task.websiteType || 'Custom Website'}</p>
                </div>

                <div className="p-4 rounded-2xl border border-border bg-background space-y-1">
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

                <div className="p-4 rounded-2xl border border-border bg-background space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Domain Information</span>
                  <p className="text-sm font-semibold text-foreground">{task.domainDetails || 'Not specified'}</p>
                </div>

                <div className="p-4 rounded-2xl border border-border bg-background space-y-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Hosting & Server</span>
                  <p className="text-sm font-semibold text-foreground">{task.hostingDetails || 'Not specified'}</p>
                </div>
              </div>

              {/* Admin Credentials Card */}
              {task.adminCredentials && (
                <div className="rounded-2xl border border-border bg-secondary/40 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      🔒 Admin Credentials / Access Info
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCredentials(!showCredentials)}
                        className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        {showCredentials ? <EyeOff size={13} /> : <Eye size={13} />}
                        <span>{showCredentials ? 'Hide' : 'Show'}</span>
                      </button>
                      <CopyButton text={task.adminCredentials} label="Copy Credentials" />
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3 text-xs font-mono text-foreground whitespace-pre-wrap">
                    {showCredentials ? task.adminCredentials : '•••••••••••••••••••••••••••••••• (Click Show to view)'}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reference Links & Inspiration */}
          {(task.referenceLink || task.audioReference || task.editorGuide || task.internalNotes) && (
            <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                🔗 Inspiration, Audio & Editorial Guidelines
              </h3>

              <div className="grid gap-3.5 sm:grid-cols-2">
                {task.referenceLink && (
                  <div className="p-4 rounded-2xl border border-border bg-background space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Inspiration Reference Link</span>
                    <a href={task.referenceLink} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary hover:underline flex items-center gap-1 truncate block">
                      <span>{task.referenceLink}</span>
                      <ArrowUpRight size={12} className="shrink-0" />
                    </a>
                  </div>
                )}

                {task.audioReference && (
                  <div className="p-4 rounded-2xl border border-border bg-background space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Audio / Music Reference</span>
                    <a href={task.audioReference} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary hover:underline flex items-center gap-1 truncate block">
                      <span>{task.audioReference}</span>
                      <ArrowUpRight size={12} className="shrink-0" />
                    </a>
                  </div>
                )}

                {task.editorGuide && (
                  <div className="p-4 rounded-2xl border border-border bg-background space-y-1 sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Editor Direction & Guidelines</span>
                    <p className="text-xs text-foreground whitespace-pre-wrap">{task.editorGuide}</p>
                  </div>
                )}

                {task.internalNotes && (
                  <div className="p-4 rounded-2xl border border-amber-200/60 bg-amber-500/5 space-y-1 sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">Internal Agency Notes</span>
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
            <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <UploadCloud size={18} className="text-primary" /> Upload Final Deliverables
              </h3>
              <div className="rounded-2xl border-2 border-dashed border-border bg-secondary/20 p-6 text-center space-y-3">
                <input
                  type="file"
                  multiple
                  id="task-file-upload"
                  className="hidden"
                  onChange={(e) => setCompletedFiles(Array.from(e.target.files || []))}
                />
                <label
                  htmlFor="task-file-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:bg-primary/95 cursor-pointer"
                >
                  <Plus size={14} /> Choose Files
                </label>
                <p className="text-xs text-muted-foreground">Select exported videos, creative banners, docs, or PDFs.</p>
              </div>

              {completedFiles.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-foreground">Selected for Upload:</span>
                  <div className="space-y-1.5">
                    {completedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-xs">
                        <span className="font-semibold text-foreground truncate">{file.name}</span>
                        <span className="text-muted-foreground">{Math.round(file.size / 1024)} KB</span>
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
          <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" /> Completed Deliverables ({(task.completedFiles || []).length})
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
                      className="group flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-border bg-background hover:bg-secondary/40 transition-all shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isImg ? (
                          <img src={fileUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-border shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                            <FileText size={20} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors">
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
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                No completed deliverables uploaded yet.
              </div>
            )}
          </div>

          {/* Brief Attachments */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              📎 Initial Brief Attachments ({(task.attachments || []).length})
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
                      className="group flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-border bg-background hover:bg-secondary/40 transition-all shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isImg ? (
                          <img src={fileUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-border shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground shrink-0">
                            <FileText size={20} />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors">
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
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
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
            <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                ✍️ Log Today&apos;s Work Progress
              </h3>
              <ProgressUpdateForm taskId={task._id} onSuccess={refetch} />
            </div>
          )}

          <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              📈 Progress Timeline ({(task.progressUpdates || []).length})
            </h3>

            {(task.progressUpdates || []).length > 0 ? (
              <div className="space-y-3">
                {task.progressUpdates.slice().reverse().map((update, idx) => (
                  <div key={idx} className="rounded-2xl border border-border bg-background p-4 space-y-2 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-bold text-foreground text-sm">{update.description}</p>
                      <span className="text-xs text-muted-foreground">
                        {update.completedAt ? new Date(update.completedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Recently'}
                      </span>
                    </div>
                    {update.workNotes && (
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{update.workNotes}</p>
                    )}
                    {update.hours ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary px-2 py-0.5 rounded-md bg-primary/10">
                        <Clock size={11} /> {update.hours} hours logged
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                No progress updates logged for this task yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB CONTENT: Client Feedback & Approval ── */}
      {activeTab === 'review' && (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-xs space-y-6">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            💬 Client Approval & Review Status
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="p-4 rounded-2xl border border-border bg-background space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Approval Status</span>
              <p className="text-sm font-bold capitalize text-foreground">{task.approvalStatus || 'Pending Review'}</p>
            </div>

            <div className="p-4 rounded-2xl border border-border bg-background space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Client Response</span>
              <p className="text-sm font-bold capitalize text-foreground">{task.clientResponse || 'Pending'}</p>
            </div>

            <div className="p-4 rounded-2xl border border-border bg-background space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Response Date</span>
              <p className="text-sm font-semibold text-foreground">
                {task.clientResponseDate ? new Date(task.clientResponseDate).toLocaleString() : 'Not submitted yet'}
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-border bg-background space-y-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">Submitted By</span>
              <p className="text-sm font-semibold text-foreground">{task.clientResponseBy?.name || '—'}</p>
            </div>
          </div>

          {task.clientFeedback && (
            <div className="rounded-2xl border border-border bg-background p-4 space-y-1.5">
              <span className="text-xs font-bold text-foreground">Client Feedback Comments:</span>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{task.clientFeedback}</p>
            </div>
          )}

          {task.rejectionReason && (
            <div className="rounded-2xl border border-rose-200 bg-rose-500/10 p-4 space-y-1.5 text-rose-700 dark:text-rose-400">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <AlertCircle size={14} /> Rejection / Rework Reason:
              </span>
              <p className="text-xs whitespace-pre-wrap leading-relaxed">{task.rejectionReason}</p>
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
        <AddTaskModal
          open={showAssignAnotherModal}
          onOpenChange={(open) => {
            setShowAssignAnotherModal(open);
            if (!open) refetch();
          }}
          initialValues={{
            client: task.client?._id || task.client || '',
            project: task.project?._id || task.project || '',
            assignedTo: Array.isArray(task.assignedTo) ? task.assignedTo[0]?._id || task.assignedTo[0] || '' : task.assignedTo || '',
            assignedManager: task.assignedManager?._id || task.assignedManager || '',
            priority: task.priority || 'Medium',
            dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
          }}
        />
      )}
    </div>
  );
};

export default TaskDetails;
