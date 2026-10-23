import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Code2,
  Download,
  ExternalLink,
  Eye,
  FileCode,
  FileSpreadsheet,
  FileText,
  Film,
  FolderKanban,
  Globe,
  Image as ImageIcon,
  Layers,
  MessageSquare,
  MessageSquareQuote,
  Palette,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  User2,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../../api';
import { ClientTaskResponsePanel } from '../../../components/tasks/ClientTaskResponsePanel';
import {
  formatTaskTypeLabel,
  getClientTaskStatusMeta,
  normalizeTaskStatusLabel,
  canClientRespondToTask,
} from '../../../utils/taskFields';
import { getAssetUrl } from '../../../utils/assetUrl';
import { CardSkeleton } from '../../../components/ui/Skeleton';
import { Button } from '../../../components/ui/button';

// Helper to format file sizes cleanly
const formatBytes = (bytes) => {
  if (!bytes || isNaN(bytes)) return '';
  const num = Number(bytes);
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
};

// Extract any valid URLs from text for quick live preview button
const extractUrls = (text) => {
  if (!text || typeof text !== 'string') return [];
  const matches = text.match(/(https?:\/\/[^\s]+)/g);
  return matches ? [...new Set(matches)] : [];
};

// 4-stage pipeline milestone calculator
const getTaskMilestoneStage = (status) => {
  const s = normalizeTaskStatusLabel(status);
  if (['Approved'].includes(s)) {
    return { step: 3, percent: 100, label: 'Approved & Signed Off', color: '#10b981' };
  }
  if (['Completed'].includes(s)) {
    return { step: 3, percent: 95, label: 'Completed — Ready for Sign-off', color: '#10b981' };
  }
  if (['Review Required', 'Waiting for Client', 'Rework Completed'].includes(s)) {
    return { step: 2, percent: 75, label: 'Awaiting Your Review', color: '#f59e0b' };
  }
  if (['On Process', 'Rework'].includes(s)) {
    return { step: 1, percent: 50, label: 'In Production', color: '#6366f1' };
  }
  return { step: 0, percent: 25, label: 'Brief Received', color: '#64748b' };
};

// Get clean category icon
const getTaskCategoryIcon = (category, type) => {
  const t = String(type || '').toLowerCase();
  if (t.includes('web') || t.includes('landing') || t.includes('domain')) return Globe;
  if (t.includes('code') || t.includes('dev')) return Code2;
  if (t.includes('reel') || t.includes('video') || t.includes('shoot')) return Film;
  if (t.includes('post') || t.includes('design') || t.includes('creative')) return Palette;
  if (category === 'non_content') return Globe;
  return Sparkles;
};

// File Lightbox Modal for Full Image Previews
const ImagePreviewModal = ({ file, onClose }) => {
  if (!file) return null;
  const fileUrl = getAssetUrl(file.url);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative max-h-[90dvh] w-[calc(100vw-24px)] max-w-4xl flex flex-col rounded-3xl border border-white/10 bg-card overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-card/90">
            <div className="flex items-center gap-2.5 truncate">
              <ImageIcon size={18} className="text-primary shrink-0" />
              <span className="font-semibold text-sm text-foreground truncate">{file.name || 'Deliverable Preview'}</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={fileUrl}
                download={file.name || 'deliverable'}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-secondary/80 text-foreground text-xs font-medium hover:bg-secondary transition-all"
              >
                <Download size={14} />
                <span>Download</span>
              </a>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Image Container */}
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/40 min-h-[300px]">
            <img
              src={fileUrl}
              alt={file.name || 'Preview'}
              className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-md"
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// File Card Component
const DeliverableFileCard = ({ file, onPreviewImage, isDeliverable = true }) => {
  const fileUrl = getAssetUrl(file.url);
  const isImage = file.type?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.url || file.name || '');
  const isVideo = file.type?.startsWith('video/') || /\.(mp4|mov|webm|mkv)$/i.test(file.url || file.name || '');
  const isZip = /\.(zip|rar|tar|gz|7z)$/i.test(file.url || file.name || '');
  const isCode = /\.(html|css|js|jsx|ts|tsx|json|py)$/i.test(file.url || file.name || '');

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-background/90 p-3 hover:border-primary/40 hover:shadow-md transition-all">
      <div className="flex items-start gap-3">
        {/* Preview Thumbnail or Format Icon */}
        {isImage ? (
          <div
            onClick={() => onPreviewImage(file)}
            className="relative h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-border bg-muted/30"
          >
            <img
              src={fileUrl}
              alt={file.name || 'Deliverable'}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
              <Eye size={16} className="text-white" />
            </div>
          </div>
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border bg-primary/5 text-primary">
            {isVideo ? (
              <Film size={22} />
            ) : isZip ? (
              <FolderKanban size={22} />
            ) : isCode ? (
              <FileCode size={22} />
            ) : (
              <FileText size={22} />
            )}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors" title={file.name || 'Deliverable file'}>
            {file.name || 'Deliverable File'}
          </p>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">
              {file.type ? file.type.split('/')[1] || file.type : isImage ? 'IMAGE' : isVideo ? 'VIDEO' : 'FILE'}
            </span>
            {file.size ? <span>{formatBytes(file.size)}</span> : null}
          </div>
          {isDeliverable && (
            <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={11} /> Verified Output
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-border/40 pt-2.5">
        {isImage && (
          <button
            type="button"
            onClick={() => onPreviewImage(file)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Eye size={13} />
            <span>Preview</span>
          </button>
        )}
        <a
          href={fileUrl}
          download={file.name || 'file'}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition-all shadow-xs"
        >
          <Download size={13} />
          <span>Download</span>
        </a>
      </div>
    </div>
  );
};

export default function PortalTasks() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'needs_review', 'in_progress', 'completed'
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all', 'website', 'content'
  const [previewImage, setPreviewImage] = useState(null);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['portal-tasks'],
    queryFn: async () => {
      const response = await api.get('/portal/tasks');
      return response.data.tasks || [];
    },
  });

  const tasks = data || [];

  // Summary Metrics calculations
  const metrics = useMemo(() => {
    let total = tasks.length;
    let completed = 0;
    let inProgress = 0;
    let needsReview = 0;

    tasks.forEach((task) => {
      const norm = normalizeTaskStatusLabel(task.status);
      const isApproved = norm === 'Approved' || task.clientResponse === 'yes';
      const isDone = norm === 'Completed';

      if (isApproved || isDone) {
        completed += 1;
      }
      if (canClientRespondToTask(task) || norm === 'Review Required' || norm === 'Waiting for Client') {
        needsReview += 1;
      }
      if (['On Process', 'To Do', 'Rework'].includes(norm)) {
        inProgress += 1;
      }
    });

    return { total, completed, inProgress, needsReview };
  }, [tasks]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const norm = normalizeTaskStatusLabel(task.status);
      const isReviewNeeded = canClientRespondToTask(task) || norm === 'Review Required' || norm === 'Waiting for Client';
      const isDone = norm === 'Completed' || norm === 'Approved' || task.clientResponse === 'yes';
      const isProgress = ['On Process', 'To Do', 'Rework'].includes(norm);

      // Status filter
      if (statusFilter === 'needs_review' && !isReviewNeeded) return false;
      if (statusFilter === 'in_progress' && !isProgress) return false;
      if (statusFilter === 'completed' && !isDone) return false;

      // Category filter
      const isWeb = task.taskCategory === 'non_content' || String(task.taskType).toLowerCase().includes('web');
      if (categoryFilter === 'website' && !isWeb) return false;
      if (categoryFilter === 'content' && isWeb) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = (task.taskTitle || task.title || '').toLowerCase();
        const type = (task.taskType || '').toLowerCase();
        const assignee = (task.assignedPersonName || task.assignedTo?.map((u) => u.name).join(' ') || '').toLowerCase();
        const desc = (task.description || task.websiteRequirements || '').toLowerCase();
        const projectName = (task.project?.name || '').toLowerCase();

        return title.includes(q) || type.includes(q) || assignee.includes(q) || desc.includes(q) || projectName.includes(q);
      }

      return true;
    });
  }, [tasks, statusFilter, categoryFilter, searchQuery]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Lightbox Modal */}
      {previewImage && <ImagePreviewModal file={previewImage} onClose={() => setPreviewImage(null)} />}

      {/* Top Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Client Deliverables OS
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">• Live Real-Time Tracking</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Tasks & Deliverables
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Track real-time progress, review creative & development milestones, inspect deliverable files, and confirm approvals.
          </p>
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              toast.success('Deliverables synced with live production');
            }}
            disabled={isRefetching}
            className="gap-2 rounded-xl border-border bg-card shadow-xs text-xs font-semibold h-9 px-3.5 hover:bg-secondary"
          >
            <RefreshCw size={14} className={isRefetching ? 'animate-spin text-primary' : 'text-muted-foreground'} />
            <span className="hidden sm:inline">{isRefetching ? 'Syncing...' : 'Sync Pipeline'}</span>
          </Button>
        </div>
      </div>

      {/* Executive KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {/* Total Deliverables */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => setStatusFilter('all')}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
            statusFilter === 'all'
              ? 'border-primary bg-primary/[0.04] shadow-sm'
              : 'border-border bg-card/70 hover:border-primary/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Milestones</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Layers size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-foreground">{metrics.total}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Scheduled deliverables</p>
        </motion.div>

        {/* In Production */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => setStatusFilter('in_progress')}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
            statusFilter === 'in_progress'
              ? 'border-indigo-500 bg-indigo-500/[0.04] shadow-sm'
              : 'border-border bg-card/70 hover:border-indigo-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">In Production</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
              <Activity size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-foreground">{metrics.inProgress}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Active development & creative</p>
        </motion.div>

        {/* Needs Your Review */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => setStatusFilter('needs_review')}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
            statusFilter === 'needs_review'
              ? 'border-amber-500 bg-amber-500/[0.06] shadow-sm'
              : metrics.needsReview > 0
              ? 'border-amber-500/40 bg-amber-500/[0.02]'
              : 'border-border bg-card/70 hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Needs Review</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-2xl font-black text-foreground">{metrics.needsReview}</p>
            {metrics.needsReview > 0 && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 animate-pulse">
                Action Required
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Ready for your sign-off</p>
        </motion.div>

        {/* Completed & Approved */}
        <motion.div
          whileHover={{ y: -2 }}
          onClick={() => setStatusFilter('completed')}
          className={`cursor-pointer rounded-2xl border p-4 transition-all ${
            statusFilter === 'completed'
              ? 'border-emerald-500 bg-emerald-500/[0.04] shadow-sm'
              : 'border-border bg-card/70 hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Completed & Delivered</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-foreground">{metrics.completed}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Approved milestones</p>
        </motion.div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card p-3 sm:flex-row sm:items-center sm:justify-between shadow-xs">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto responsive-table-container pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Tasks', count: metrics.total },
            { id: 'needs_review', label: 'Needs Review', count: metrics.needsReview, alert: metrics.needsReview > 0 },
            { id: 'in_progress', label: 'In Production', count: metrics.inProgress },
            { id: 'completed', label: 'Completed', count: metrics.completed },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold shrink-0 min-h-[36px] transition-all ${
                statusFilter === tab.id
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  statusFilter === tab.id
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : tab.alert
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-extrabold'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Toggle */}
          <div className="flex items-center rounded-xl border border-border bg-background p-0.5 text-xs">
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium min-h-[32px] transition-all ${
                categoryFilter === 'all' ? 'bg-secondary text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setCategoryFilter('website')}
              className={`px-2.5 py-1 rounded-lg font-medium min-h-[32px] transition-all ${
                categoryFilter === 'website' ? 'bg-secondary text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Web
            </button>
            <button
              onClick={() => setCategoryFilter('content')}
              className={`px-2.5 py-1 rounded-lg font-medium min-h-[32px] transition-all ${
                categoryFilter === 'content' ? 'bg-secondary text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Content
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:w-56 min-w-[160px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search deliverables..."
              className="w-full rounded-xl border border-border bg-background py-1.5 pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 min-h-[34px]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading Skeleton State */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="h-64 animate-pulse rounded-3xl border border-border bg-card/60" />
          <div className="h-64 animate-pulse rounded-3xl border border-border bg-card/60" />
        </div>
      ) : filteredTasks.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-card/40 py-16 px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
            <Layers size={28} />
          </div>
          <h3 className="text-base font-bold text-foreground">No deliverables found</h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm">
            {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
              ? 'No deliverables match your active search or filter criteria. Try clearing filters.'
              : 'No project tasks or deliverables have been assigned yet. Your deliverables will appear here as soon as scheduled.'}
          </p>
          {(searchQuery || statusFilter !== 'all' || categoryFilter !== 'all') && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setCategoryFilter('all');
              }}
              className="mt-4 rounded-xl text-xs font-semibold"
            >
              Reset All Filters
            </Button>
          )}
        </div>
      ) : (
        /* Task Cards List */
        <div className="space-y-6">
          {filteredTasks.map((task) => {
            const normalizedStatus = normalizeTaskStatusLabel(task.status);
            const statusMeta = getClientTaskStatusMeta(normalizedStatus);
            const milestone = getTaskMilestoneStage(task.status);
            const CategoryIcon = getTaskCategoryIcon(task.taskCategory, task.taskType);

            // Detect any URLs for quick live preview button
            const detectedUrls = [
              ...extractUrls(task.websiteRequirements),
              ...extractUrls(task.description),
              ...extractUrls(task.scriptLink),
              ...extractUrls(task.domainDetails),
            ];

            const completedFiles = task.completedFiles || [];
            const attachments = task.attachments || [];
            const hasFiles = completedFiles.length > 0;
            const hasAttachments = attachments.length > 0;
            const needsReview = canClientRespondToTask(task);
            const isApproved = normalizedStatus === 'Approved' || task.clientResponse === 'yes';

            // Clean specialist assignee name & avatar
            const assigneeName = task.assignedPersonName || task.assignedTo?.map((u) => u.name).join(', ') || 'RiseWithMedia Lead';
            const assigneeInitials = assigneeName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .substring(0, 2)
              .toUpperCase();

            return (
              <motion.div
                key={task._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`relative overflow-hidden rounded-3xl border bg-card transition-all shadow-xs hover:shadow-md ${
                  needsReview
                    ? 'border-amber-500/40 ring-1 ring-amber-500/20'
                    : isApproved
                    ? 'border-emerald-500/30'
                    : 'border-border'
                }`}
              >
                {/* Status Accent Line on Top */}
                <div
                  className="h-1.5 w-full"
                  style={{
                    background: isApproved
                      ? 'linear-gradient(90deg, #10b981, #059669)'
                      : needsReview
                      ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                      : milestone.step === 1
                      ? 'linear-gradient(90deg, #6366f1, #4f46e5)'
                      : 'linear-gradient(90deg, #64748b, #475569)',
                  }}
                />

                <div className="p-5 sm:p-6 space-y-6">
                  {/* Top Row: Category Tags, Project Badge & Status Badge */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Category Badge */}
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        <CategoryIcon size={13} />
                        <span>{formatTaskTypeLabel(task.taskType)}</span>
                      </span>

                      {/* Project Tag if available */}
                      {task.project?.name && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-foreground">
                          <FolderKanban size={12} className="text-muted-foreground" />
                          <span>{task.project.name}</span>
                        </span>
                      )}

                      {/* Priority Tag */}
                      {task.priority && ['High', 'Urgent'].includes(task.priority) && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-[11px] font-bold text-red-600 dark:text-red-400">
                          <Zap size={11} />
                          <span>{task.priority} Priority</span>
                        </span>
                      )}
                    </div>

                    {/* Status Pill */}
                    <div className="shrink-0">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold ${
                          isApproved
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : normalizedStatus === 'Completed'
                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : needsReview
                            ? 'border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400 animate-pulse'
                            : normalizedStatus === 'On Process'
                            ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                            : 'border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {isApproved ? (
                          <>
                            <CheckCircle2 size={14} />
                            <span>Approved & Signed Off</span>
                          </>
                        ) : normalizedStatus === 'Completed' ? (
                          <>
                            <Check size={14} />
                            <span>Completed & Delivered</span>
                          </>
                        ) : needsReview ? (
                          <>
                            <Sparkles size={14} />
                            <span>Awaiting Your Review</span>
                          </>
                        ) : normalizedStatus === 'On Process' ? (
                          <>
                            <Activity size={14} />
                            <span>In Production</span>
                          </>
                        ) : (
                          <>
                            <Clock size={14} />
                            <span>{statusMeta.label}</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Task Title and Lead Specialist */}
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                      {task.taskTitle || task.title || 'Deliverable Milestone'}
                    </h2>
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                      {/* Specialist */}
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                          {assigneeInitials}
                        </div>
                        <span className="font-medium text-foreground">{assigneeName}</span>
                        <span className="text-[11px] text-muted-foreground">(Lead Specialist)</span>
                      </div>

                      {/* Due Date */}
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-muted-foreground" />
                        <span>
                          {task.dueDate
                            ? `Delivery Target: ${new Date(task.dueDate).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}`
                            : 'Standard Timeline'}
                        </span>
                      </div>

                      {/* Live Staging Link quick button if detected */}
                      {detectedUrls.length > 0 && (
                        <a
                          href={detectedUrls[0]}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                        >
                          <ExternalLink size={12} />
                          <span>View Live Preview</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* 4-Stage Visual Delivery Roadmap */}
                  <div className="rounded-2xl border border-border/80 bg-background/60 p-4">
                    <div className="flex items-center justify-between text-xs font-semibold mb-2.5">
                      <span className="text-foreground">Production Pipeline</span>
                      <span className="text-muted-foreground font-mono text-[11px]">{milestone.percent}% Completed</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${milestone.percent}%`,
                          background: milestone.color,
                        }}
                      />
                    </div>

                    {/* Milestone Steps */}
                    <div className="mt-3.5 grid grid-cols-4 gap-1 text-center">
                      {[
                        { title: '1. Scope & Brief', stepIdx: 0 },
                        { title: '2. In Production', stepIdx: 1 },
                        { title: '3. Quality Review', stepIdx: 2 },
                        { title: '4. Delivered & Approved', stepIdx: 3 },
                      ].map((st, i) => {
                        const isDoneStep = milestone.step > st.stepIdx || isApproved;
                        const isCurrent = milestone.step === st.stepIdx && !isApproved;

                        return (
                          <div key={st.title} className="flex flex-col items-center">
                            <span
                              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all ${
                                isDoneStep
                                  ? 'bg-emerald-500 text-white shadow-xs'
                                  : isCurrent
                                  ? 'bg-primary text-white ring-2 ring-primary/30'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {isDoneStep ? <Check size={12} /> : i + 1}
                            </span>
                            <span
                              className={`mt-1.5 text-[11px] truncate max-w-[95%] hidden sm:block ${
                                isDoneStep || isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground'
                              }`}
                            >
                              {st.title}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Interactive Client Review & Approval Panel */}
                  <ClientTaskResponsePanel task={task} onSubmitted={refetch} />

                  {/* Deliverable Outputs & Completed Files */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-primary" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                          Completed Deliverables & Outputs
                        </h3>
                      </div>
                      {hasFiles && (
                        <span className="text-xs font-semibold text-muted-foreground">
                          {completedFiles.length} {completedFiles.length === 1 ? 'file' : 'files'} available
                        </span>
                      )}
                    </div>

                    {hasFiles ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {completedFiles.map((file, idx) => (
                          <DeliverableFileCard
                            key={`${file.url || file.name}-${idx}`}
                            file={file}
                            onPreviewImage={(f) => setPreviewImage(f)}
                            isDeliverable
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border bg-background/50 p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                          {normalizedStatus === 'Completed' || isApproved
                            ? 'Milestone completed and verified. Any deliverables or links will be shared by your team.'
                            : 'Production deliverables and preview files will appear here once ready for your review.'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Requirements & Specifications (Unified & Non-Redundant) */}
                  {(task.description || task.websiteRequirements || task.requiredFeatures || task.caption || task.scriptText) && (
                    <div className="rounded-2xl border border-border/80 bg-background/60 p-4 sm:p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <FileText size={16} className="text-muted-foreground" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Scope & Specifications
                        </h3>
                      </div>

                      {/* Main Brief / Description */}
                      <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                        {task.description || task.websiteRequirements || task.requiredFeatures || 'Standard scope specifications applied.'}
                      </p>

                      {/* Content specific fields (Caption / Script) */}
                      {task.taskCategory !== 'non_content' && (task.caption || task.scriptText || task.scriptLink) && (
                        <div className="mt-4 pt-3 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {task.scriptText && (
                            <div>
                              <p className="text-[11px] font-semibold text-muted-foreground mb-1">Script:</p>
                              <p className="text-xs text-foreground whitespace-pre-wrap">{task.scriptText}</p>
                            </div>
                          )}
                          {task.caption && (
                            <div>
                              <p className="text-[11px] font-semibold text-muted-foreground mb-1">Caption / Copy:</p>
                              <p className="text-xs text-foreground whitespace-pre-wrap">{task.caption}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Website/Technical details if present */}
                      {(task.domainDetails || task.hostingDetails) && (
                        <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap gap-2 text-xs">
                          {task.domainDetails && (
                            <span className="rounded-lg bg-secondary px-2.5 py-1 text-muted-foreground">
                              <span className="font-semibold text-foreground">Domain: </span> {task.domainDetails}
                            </span>
                          )}
                          {task.hostingDetails && (
                            <span className="rounded-lg bg-secondary px-2.5 py-1 text-muted-foreground">
                              <span className="font-semibold text-foreground">Hosting: </span> {task.hostingDetails}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Team Note to You (Only shown if team added notes!) */}
                  {task.clientVisibleNotes && (
                    <div className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <MessageSquareQuote size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-primary">Note from Your Team</p>
                          <p className="mt-1 text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            {task.clientVisibleNotes}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Source Brief Attachments (Only shown if attachments exist!) */}
                  {hasAttachments && (
                    <div>
                      <div className="flex items-center gap-2 mb-2.5">
                        <FolderKanban size={15} className="text-muted-foreground" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Brief & Source Assets ({attachments.length})
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {attachments.map((file, idx) => (
                          <DeliverableFileCard
                            key={`attachment-${file.url || file.name}-${idx}`}
                            file={file}
                            onPreviewImage={(f) => setPreviewImage(f)}
                            isDeliverable={false}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
