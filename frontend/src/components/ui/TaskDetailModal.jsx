import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProgressUpdateForm } from './ProgressUpdateForm';
import { useAddCompletedFiles, useTask, useUpdateTaskStatus } from '../../hooks/useTasks';
import { AddTaskModal } from '../modals/AddTaskModal';
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
} from 'lucide-react';
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
  if (t.includes('reel') || t.includes('video') || t.includes('youtube')) return <Film className="text-purple-500" size={18} />;
  if (t.includes('poster') || t.includes('design') || t.includes('carousel')) return <Sparkles className="text-amber-500" size={18} />;
  if (t.includes('website') || t.includes('landing')) return <Globe className="text-blue-500" size={18} />;
  if (cat.includes('content')) return <FileText className="text-emerald-500" size={18} />;
  return <Layers className="text-primary" size={18} />;
};

const NotionPropertyRow = ({ icon: Icon, label, children }) => (
  <div className="flex items-start gap-3 py-2 px-2.5 rounded-xl hover:bg-secondary/40 transition-colors">
    <div className="flex items-center gap-2 w-32 sm:w-40 shrink-0 text-xs font-semibold text-muted-foreground select-none">
      <Icon size={13} className="shrink-0 text-muted-foreground/70" />
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
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/60 transition-all active:scale-95 cursor-pointer select-none"
      title={`Copy ${label}`}
    >
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
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
  const [showCredentials, setShowCredentials] = useState(false);

  const isEmployee = user?.role === 'employee';
  const isClient = user?.role === 'client';
  const canEdit = ['superAdmin', 'manager'].includes(user?.role);
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
    task?.voiceScriptText ||
    task?.videographerContentNeeded ||
    task?.shootDate ||
    (task?.postingPlatforms && task.postingPlatforms.length > 0)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" noPadding className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-l border-border shadow-2xl">
        {/* ── Sticky Pinned Header ── */}
        <DialogHeader className="px-6 py-4 border-b border-border bg-card/95 backdrop-blur-md shrink-0 pr-24 select-none">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/80 border border-border shrink-0">
                {task ? getCategoryIcon(task.taskCategory, task.taskType) : <CheckSquare size={17} />}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg font-black text-foreground truncate">
                  {isLoading ? 'Loading task...' : task?.taskTitle || task?.title || 'Task Details'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1.5">
                  {task?.client?.name && (
                    <span className="font-semibold text-foreground">{task.client.name}</span>
                  )}
                  {task?.project?.name && (
                    <>
                      <span>•</span>
                      <span>{task.project.name}</span>
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-2 shrink-0">
              {task?.isOverTarget && (
                <span className="rounded-lg bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[11px] font-extrabold uppercase text-rose-600 dark:text-rose-400">
                  🔴 Over Task
                </span>
              )}
              {task?.priority && (
                <span className={`px-2 py-0.5 rounded-lg border text-[11px] font-semibold ${PRIORITY_TONES[task.priority] || PRIORITY_TONES.Medium}`}>
                  {task.priority}
                </span>
              )}
              {canEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(true)}
                  className="h-8 px-2.5 rounded-xl border-border text-xs font-bold hover:bg-secondary flex items-center gap-1.5"
                >
                  <Edit size={12} />
                  <span>Edit</span>
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6 pb-12 custom-scrollbar space-y-5">
          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-32 rounded-3xl bg-secondary/50 border border-border" />
              <div className="h-64 rounded-3xl bg-secondary/50 border border-border" />
            </div>
          ) : task ? (
            <>
              {task?.isOverTarget && (
                <div className="flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-bold text-rose-600 dark:text-rose-400">
                  <span>🔴 Over Target Task — This deliverable exceeded the configured monthly quota.</span>
                </div>
              )}

              {/* ── Notion Property Matrix Card ── */}
              <div className="rounded-2xl border border-border bg-background/70 p-4 shadow-2xs space-y-1">
                {!isClient && (
                  <NotionPropertyRow icon={ShieldCheck} label="Status">
                    <div className="flex items-center gap-2">
                      <select
                        value={normalizedStatus}
                        onChange={(e) => updateStatus.mutate({ id: task._id, status: e.target.value })}
                        className="bg-transparent text-xs sm:text-sm font-bold text-foreground border-b border-border/80 pb-0.5 outline-none hover:border-primary focus:border-primary transition-colors cursor-pointer"
                      >
                        {allowedStatusOptions.map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${STATUS_TONES[normalizedStatus] || STATUS_TONES['To Do']}`}>
                        {normalizedStatus}
                      </span>
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
                          <span key={idx} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-card border border-border text-xs font-semibold">
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
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-card border border-border text-xs font-semibold">
                      {task.assignedManager.avatar ? (
                        <img src={getAssetUrl(task.assignedManager.avatar)} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                      ) : (
                        <User size={11} className="text-primary" />
                      )}
                      <span>{task.assignedManager.name || 'Manager'}</span>
                    </span>
                  </NotionPropertyRow>
                )}

                <NotionPropertyRow icon={Tag} label="Task Type">
                  <span className="font-semibold text-foreground text-xs">{formatTaskTypeLabel(task.taskType)}</span>
                </NotionPropertyRow>

                <NotionPropertyRow icon={Clock} label="Due Date">
                  <span className="text-foreground font-semibold text-xs">
                    {task.dueDate ? new Date(task.dueDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Not set'}
                  </span>
                </NotionPropertyRow>

                <NotionPropertyRow icon={CheckCircle2} label="Client Approval">
                  <span className="capitalize font-semibold text-foreground text-xs">
                    {task.approvalStatus || task.clientResponse || 'Pending'}
                  </span>
                </NotionPropertyRow>
              </div>

              {/* ── Production Pipeline Workflow ── */}
              {hasPipeline && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <Flame size={14} className="text-primary" /> Multi-Role Sub-Assignments
                    </span>
                    {task.postingScheduleDate && (
                      <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10">
                        Post: {new Date(task.postingScheduleDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>

                  <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-5">
                    <div className="p-2.5 rounded-xl bg-card border border-border space-y-1">
                      <span className="text-[9px] font-bold uppercase text-muted-foreground block">✍️ Script</span>
                      <p className="font-bold text-foreground text-xs truncate">
                        {task.scriptWriterAssigned?.name || task.scriptWriterName || 'Unassigned'}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-card border border-border space-y-1">
                      <span className="text-[9px] font-bold uppercase text-muted-foreground block">🎙️ RJ / Voice</span>
                      <p className="font-bold text-foreground text-xs truncate">
                        {task.voiceArtistAssigned?.name || task.voiceArtistName || 'Unassigned'}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-card border border-border space-y-1">
                      <span className="text-[9px] font-bold uppercase text-muted-foreground block">🎥 Shoot</span>
                      <p className="font-bold text-foreground text-xs truncate">
                        {task.videographerAssigned?.name || task.videographerName || 'Unassigned'}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-card border border-border space-y-1">
                      <span className="text-[9px] font-bold uppercase text-muted-foreground block">✂️ Edit</span>
                      <p className="font-bold text-foreground text-xs truncate">
                        {task.editorAssigned?.name || task.editorName || 'Unassigned'}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-card border border-border space-y-1">
                      <span className="text-[9px] font-bold uppercase text-muted-foreground block">📱 Post</span>
                      <p className="font-bold text-foreground text-xs truncate">
                        {task.publisherAssigned?.name || task.publisherName || 'Unassigned'}
                      </p>
                    </div>
                  </div>

                  {task.rawFootageLink && (
                    <div className="pt-1 text-xs flex items-center justify-between">
                      <span className="text-muted-foreground font-semibold">Raw Footage:</span>
                      <a href={task.rawFootageLink} target="_blank" rel="noreferrer" className="font-bold text-primary hover:underline flex items-center gap-1">
                        <span>Open Drive</span>
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* ── Drawer Tabs ── */}
              <div className="flex items-center gap-2 border-b border-border">
                {[
                  { id: 'brief', label: 'Brief & Scope', icon: FileText },
                  { id: 'deliverables', label: `Files (${(task.attachments?.length || 0) + (task.completedFiles?.length || 0)})`, icon: FolderArchive },
                  { id: 'progress', label: `Logs (${task.progressUpdates?.length || 0})`, icon: Clock },
                  { id: 'review', label: 'Review', icon: MessageSquare },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer select-none ${
                      activeTab === tab.id
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <tab.icon size={13} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* ── BRIEF & CONTENT TAB ── */}
              {activeTab === 'brief' && (
                <div className="space-y-4">
                  {/* Description / Requirements */}
                  <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">📋 Brief & Requirements</span>
                      {task.description && <CopyButton text={task.description} label="Copy" />}
                    </div>
                    <div className="rounded-xl border border-border/70 bg-background/60 p-3 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                      {task.description || 'No description provided.'}
                    </div>
                  </div>

                  {/* Script */}
                  {task.taskCategory === 'content' && (
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground uppercase tracking-wider">📜 Script</span>
                        {task.scriptText && <CopyButton text={task.scriptText} label="Copy Script" />}
                      </div>
                      {task.scriptText ? (
                        <div className="rounded-xl border border-border bg-background p-3 text-xs font-mono text-foreground whitespace-pre-wrap leading-relaxed">
                          {task.scriptText}
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                          No script provided.
                        </div>
                      )}
                      {task.scriptLink && (
                        <a href={task.scriptLink} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary hover:underline flex items-center gap-1 pt-1">
                          <span>Open Google Docs Script</span>
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  )}

                  {/* 🎙️ RJ / Voice-Over Script & Instructions */}
                  {task.taskCategory === 'content' && (task.voiceScriptText || task.voiceInstructions) && (
                    <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-4 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                          🎙️ RJ / Voice-Over Script & Brief
                        </span>
                        {task.voiceScriptText && <CopyButton text={task.voiceScriptText} label="Copy Script" />}
                      </div>
                      {task.voiceScriptText && (
                        <div className="rounded-xl border border-border bg-background p-3 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
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

                  {/* 🎥 Videographer Content Requirements */}
                  {task.videographerContentNeeded && (
                    <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4 shadow-2xs space-y-2">
                      <span className="text-xs font-bold text-sky-700 dark:text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                        🎥 What Content / Shots Needed for Videographer
                      </span>
                      <div className="rounded-xl border border-border bg-background p-3 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                        {task.videographerContentNeeded}
                      </div>
                    </div>
                  )}

                  {/* Caption & Tags */}
                  {task.taskCategory === 'content' && (
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground uppercase tracking-wider">💬 Social Caption</span>
                        {task.caption && <CopyButton text={`${task.caption}\n\n${task.hashtags || ''}`} label="Copy Caption" />}
                      </div>
                      <div className="rounded-xl border border-border bg-background p-3 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                        {task.caption || 'No caption drafted yet.'}
                      </div>
                      {task.hashtags && (
                        <p className="text-[11px] font-semibold text-primary break-all pt-1">
                          {task.hashtags}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Website Technical Specs */}
                  {isWebsiteTaskType(task.taskType) && (
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs space-y-3">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">💻 Website Specifications</span>
                      <div className="grid gap-2 sm:grid-cols-2 text-xs">
                        <div className="p-2.5 rounded-xl border border-border bg-background">
                          <span className="text-[10px] text-muted-foreground uppercase block font-bold">Website Type</span>
                          <span className="font-semibold">{task.websiteType || 'Custom Website'}</span>
                        </div>
                        <div className="p-2.5 rounded-xl border border-border bg-background">
                          <span className="text-[10px] text-muted-foreground uppercase block font-bold">Domain & Hosting</span>
                          <span className="font-semibold">{[task.domainDetails, task.hostingDetails].filter(Boolean).join(' • ') || 'Not specified'}</span>
                        </div>
                      </div>

                      {task.adminCredentials && (
                        <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold">Admin Credentials:</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setShowCredentials(!showCredentials)}
                                className="font-semibold text-muted-foreground hover:text-foreground text-[11px] flex items-center gap-1"
                              >
                                {showCredentials ? <EyeOff size={11} /> : <Eye size={11} />}
                                <span>{showCredentials ? 'Hide' : 'Show'}</span>
                              </button>
                              <CopyButton text={task.adminCredentials} label="Copy" />
                            </div>
                          </div>
                          <div className="text-xs font-mono bg-background p-2 rounded-lg border border-border">
                            {showCredentials ? task.adminCredentials : '••••••••••••••••••••'}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reference Links */}
                  {(task.referenceLink || task.audioReference || task.editorGuide || task.internalNotes) && (
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-2xs space-y-2">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">🔗 References & Direction</span>
                      <div className="space-y-2 text-xs">
                        {task.referenceLink && (
                          <div className="flex items-center justify-between p-2 rounded-xl border border-border bg-background">
                            <span className="text-muted-foreground">Inspiration Link:</span>
                            <a href={task.referenceLink} target="_blank" rel="noreferrer" className="font-bold text-primary hover:underline flex items-center gap-1 truncate max-w-[200px]">
                              <span>{task.referenceLink}</span>
                              <ArrowUpRight size={11} />
                            </a>
                          </div>
                        )}
                        {task.audioReference && (
                          <div className="flex items-center justify-between p-2 rounded-xl border border-border bg-background">
                            <span className="text-muted-foreground">Audio Reference:</span>
                            <a href={task.audioReference} target="_blank" rel="noreferrer" className="font-bold text-primary hover:underline flex items-center gap-1 truncate max-w-[200px]">
                              <span>{task.audioReference}</span>
                              <ArrowUpRight size={11} />
                            </a>
                          </div>
                        )}
                        {task.editorGuide && (
                          <div className="p-2.5 rounded-xl border border-border bg-background space-y-1">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Editor Guide:</span>
                            <p className="text-xs whitespace-pre-wrap">{task.editorGuide}</p>
                          </div>
                        )}
                        {task.internalNotes && (
                          <div className="p-2.5 rounded-xl border border-amber-200/60 bg-amber-500/5 space-y-1">
                            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">Internal Notes:</span>
                            <p className="text-xs whitespace-pre-wrap">{task.internalNotes}</p>
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
                    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
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
                  <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
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
                            className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border bg-background hover:bg-secondary/40 text-xs"
                          >
                            <span className="font-bold text-foreground truncate">{file.name || 'Deliverable'}</span>
                            <Download size={13} className="text-muted-foreground shrink-0" />
                          </a>
                        ))
                      ) : (
                        <div className="text-xs text-muted-foreground p-4 text-center border border-dashed border-border rounded-xl">
                          No completed deliverables uploaded.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Initial Attachments */}
                  <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
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
                            className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border bg-background hover:bg-secondary/40 text-xs"
                          >
                            <span className="font-bold text-foreground truncate">{file.name || 'Attachment'}</span>
                            <Download size={13} className="text-muted-foreground shrink-0" />
                          </a>
                        ))
                      ) : (
                        <div className="text-xs text-muted-foreground p-4 text-center border border-dashed border-border rounded-xl">
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
                    <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">Log Today&apos;s Work</span>
                      <ProgressUpdateForm taskId={taskId} onSuccess={refetch} />
                    </div>
                  )}

                  <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Work Progress History ({(task.progressUpdates || []).length})
                    </span>
                    <div className="space-y-2">
                      {(task.progressUpdates || []).length > 0 ? (
                        task.progressUpdates.slice().reverse().map((update, idx) => (
                          <div key={idx} className="p-3 rounded-xl border border-border bg-background space-y-1 text-xs">
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
                        <div className="text-xs text-muted-foreground p-4 text-center border border-dashed border-border rounded-xl">
                          No progress updates logged yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── CLIENT REVIEW TAB ── */}
              {activeTab === 'review' && (
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">Client Approval & Feedback</span>
                  <div className="grid gap-2 sm:grid-cols-2 text-xs">
                    <div className="p-2.5 rounded-xl border border-border bg-background">
                      <span className="text-[10px] text-muted-foreground uppercase block font-bold">Approval Status</span>
                      <span className="font-bold capitalize">{task.approvalStatus || 'Pending'}</span>
                    </div>
                    <div className="p-2.5 rounded-xl border border-border bg-background">
                      <span className="text-[10px] text-muted-foreground uppercase block font-bold">Client Response</span>
                      <span className="font-bold capitalize">{task.clientResponse || 'Pending'}</span>
                    </div>
                  </div>

                  {task.clientFeedback && (
                    <div className="p-3 rounded-xl border border-border bg-background text-xs space-y-1">
                      <span className="font-bold text-foreground">Client Feedback:</span>
                      <p className="text-muted-foreground whitespace-pre-wrap">{task.clientFeedback}</p>
                    </div>
                  )}

                  {task.rejectionReason && (
                    <div className="p-3 rounded-xl border border-rose-200 bg-rose-500/10 text-rose-700 dark:text-rose-400 text-xs space-y-1">
                      <span className="font-bold">Rework Reason:</span>
                      <p className="whitespace-pre-wrap">{task.rejectionReason}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-xs text-muted-foreground">
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
          <AddTaskModal
            open={showAssignAnotherModal}
            onOpenChange={(val) => {
              setShowAssignAnotherModal(val);
              if (!val) refetch();
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
      </DialogContent>
    </Dialog>
  );
};
