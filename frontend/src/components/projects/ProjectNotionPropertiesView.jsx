import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  GripVertical,
  Building2,
  User,
  Users,
  CheckCircle2,
  Clock,
  Calendar,
  CalendarDays,
  TrendingUp,
  Target,
  IndianRupee,
  FileText,
  Sparkles,
  Flag,
  ArrowUpRight,
  Plus,
  Edit3,
  Tag,
  Paperclip,
  CheckSquare,
  AlertCircle,
  HelpCircle,
  FolderOpen,
} from '@/components/ui/muiIcons';
import { formatINR } from '../../utils/currency';
import { getProjectCategoryMeta } from '../../utils/projectCategories';
import { getAssetUrl } from '../../utils/assetUrl';

/**
 * Format a date nicely (e.g., "November 9, 2026")
 */
function formatDate(dateVal) {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format date & time (e.g., "November 9, 2026, 4:56 PM")
 */
function formatDateTime(dateVal) {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Single Notion-style Property Row
 */
const NotionPropertyRow = ({
  icon: Icon,
  label,
  children,
  onClick,
  isClickable = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`group flex items-start sm:items-center py-2 px-3 rounded-xl transition-colors ${
        isClickable ? 'cursor-pointer hover:bg-secondary/60' : 'hover:bg-secondary/35'
      }`}
    >
      {/* Left: Drag Handle + Icon + Label */}
      <div className="flex items-center gap-2 w-44 sm:w-52 shrink-0 select-none text-muted-foreground group-hover:text-foreground transition-colors">
        <GripVertical
          size={14}
          className="text-muted-foreground/30 group-hover:text-muted-foreground/70 transition-colors shrink-0 -ml-1"
        />
        {Icon && <Icon size={14} className="shrink-0 text-muted-foreground" />}
        <span className="text-xs font-medium truncate">{label}</span>
      </div>

      {/* Right: Property Value */}
      <div className="flex-1 min-w-0 text-xs sm:text-sm font-medium text-foreground flex items-center gap-2 flex-wrap">
        {children ?? <span className="text-muted-foreground/50 text-xs font-normal">Empty</span>}
      </div>
    </div>
  );
};

export const ProjectNotionPropertiesView = ({
  project = {},
  kanban = null,
  deliverables = [],
  invoices = [],
  onEdit = null,
  onNavigateTab = null,
  canEdit = false,
  className = '',
}) => {
  // Category meta
  const catMeta = useMemo(() => getProjectCategoryMeta(project.category), [project.category]);
  const CategoryIcon = catMeta.icon || Target;

  // Task metrics
  const kanbanStats = useMemo(() => {
    if (!kanban) {
      const total = project.totalTasks || 0;
      const completed = project.doneTasks || project.completedTasks || 0;
      const pending = Math.max(0, total - completed);
      return { total, pending, completed };
    }
    const todo = (kanban.todo || []).length;
    const inProgress = (kanban.in_progress || []).length;
    const inReview = (kanban.in_review || []).length;
    const approved = (kanban.approved || []).length;
    const completed = (kanban.completed || []).length;

    const total = todo + inProgress + inReview + approved + completed;
    const done = approved + completed;
    const pending = todo + inProgress + inReview;
    return { total, pending, completed: done };
  }, [kanban, project.totalTasks, project.doneTasks, project.completedTasks]);

  // Project Duration
  const durationText = useMemo(() => {
    if (!project.startDate && !project.dueDate) return null;
    const startStr = formatDate(project.startDate);
    const dueStr = formatDate(project.dueDate);

    if (project.startDate && project.dueDate) {
      const s = new Date(project.startDate);
      const e = new Date(project.dueDate);
      const diffDays = Math.max(1, Math.round((e - s) / (1000 * 60 * 60 * 24)));
      return `${diffDays} Days (${startStr} – ${dueStr})`;
    }
    if (project.startDate) return `Started ${startStr}`;
    if (project.dueDate) return `Due ${dueStr}`;
    return null;
  }, [project.startDate, project.dueDate]);

  // Budget calculations
  const bDetails = project.budgetDetails || {};
  const totalBudget = project.budget || bDetails.totalBudget || 0;
  const amountReceived = bDetails.amountReceived || 0;
  const balancePending = Math.max(0, totalBudget - amountReceived);
  const paymentStatus = bDetails.paymentStatus || (balancePending === 0 && totalBudget > 0 ? 'paid' : 'pending');

  // Status badge styling
  const statusColors = {
    planning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    Planning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    active: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    'In Progress': 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    Active: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    on_hold: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
    'On Hold': 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
    completed: 'bg-primary/15 text-primary border-primary/30',
    Completed: 'bg-primary/15 text-primary border-primary/30',
    cancelled: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    Cancelled: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
  };

  const priorityColors = {
    low: 'bg-secondary text-muted-foreground',
    Low: 'bg-secondary text-muted-foreground',
    medium: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
    Medium: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
    high: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold',
    High: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold',
    urgent: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold',
    Critical: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold',
  };

  // Deliverables summary string
  const deliverablesSummary = useMemo(() => {
    if (!deliverables || deliverables.length === 0) return null;
    return deliverables
      .map((d) => {
        const type = d.contentType || d.deliverableType || d.type || 'Deliverable';
        const count = d.targetQuantity || d.target || 0;
        const done = d.completedQuantity || d.currentCount || 0;
        return `${count} ${type}${count !== 1 ? 's' : ''} (${done}/${count})`;
      })
      .join(', ');
  }, [deliverables]);

  return (
    <div className={`rounded-3xl bg-card p-4 sm:p-6 space-y-1 shadow-xs border border-border/40 ${className}`}>
      {/* Table Header Bar */}
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-border/40 px-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Project Properties
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-foreground tabular-nums">
            {project.name || 'Project Details'}
          </span>
        </div>
        {canEdit && onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold transition-all cursor-pointer"
          >
            <Edit3 size={13} />
            <span>Edit Project</span>
          </button>
        )}
      </div>

      {/* 1. Client */}
      <NotionPropertyRow icon={User} label="Client">
        {project.client ? (
          <Link
            to={`/clients/${project.client._id || project.client}`}
            className="inline-flex items-center gap-1.5 font-semibold text-foreground hover:text-primary transition-colors hover:underline"
          >
            <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground overflow-hidden shrink-0">
              {project.client.logo ? (
                <img src={getAssetUrl(project.client.logo)} alt="" className="w-full h-full object-cover" />
              ) : (
                (project.client.company || project.client.name || 'C').charAt(0)
              )}
            </div>
            <span>{project.client.company || project.client.name}</span>
            <ArrowUpRight size={12} className="text-muted-foreground" />
          </Link>
        ) : null}
      </NotionPropertyRow>

      {/* 2. Status */}
      <NotionPropertyRow icon={Clock} label="Status">
        {project.status ? (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
              statusColors[project.status] || 'bg-secondary text-foreground'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            <span>{project.status}</span>
          </span>
        ) : null}
      </NotionPropertyRow>

      {/* 3. Project Type / Category */}
      <NotionPropertyRow icon={Target} label="Project Type">
        {project.category ? (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-xs font-bold ${
              catMeta.badgeClass || 'bg-secondary text-foreground'
            }`}
          >
            <CategoryIcon size={12} className="shrink-0" />
            <span>{catMeta.label}</span>
          </span>
        ) : null}
      </NotionPropertyRow>

      {/* 4. Responsible (Project Manager) */}
      <NotionPropertyRow icon={User} label="Responsible">
        {project.manager ? (
          <div className="inline-flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold overflow-hidden shrink-0">
              {project.manager.avatar ? (
                <img src={getAssetUrl(project.manager.avatar)} alt="" className="w-full h-full object-cover" />
              ) : (
                (project.manager.name || 'M').charAt(0)
              )}
            </div>
            <span className="font-semibold">{project.manager.name}</span>
          </div>
        ) : null}
      </NotionPropertyRow>

      {/* 5. Team Members */}
      <NotionPropertyRow icon={Users} label="Team">
        {project.team && project.team.length > 0 ? (
          <div className="flex items-center gap-2 flex-wrap">
            {project.team.map((member) => (
              <span
                key={member._id || member}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-secondary text-xs font-medium"
              >
                <div className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold">
                  {(member.name || 'T').charAt(0)}
                </div>
                <span>{member.name}</span>
              </span>
            ))}
          </div>
        ) : null}
      </NotionPropertyRow>

      {/* 6. Total Tasks */}
      <NotionPropertyRow icon={CheckSquare} label="Total Tasks">
        <span className="tabular-nums font-bold text-foreground">
          {kanbanStats.total} {kanbanStats.total === 1 ? 'Task' : 'Tasks'}
        </span>
      </NotionPropertyRow>

      {/* 7. Pending */}
      <NotionPropertyRow icon={Clock} label="Pending">
        <span className="tabular-nums font-semibold text-amber-600 dark:text-amber-400">
          {kanbanStats.pending} Pending
        </span>
      </NotionPropertyRow>

      {/* 8. Completed Tasks */}
      <NotionPropertyRow icon={CheckCircle2} label="Completed Tasks">
        <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
          {kanbanStats.completed} Completed
        </span>
      </NotionPropertyRow>

      {/* 9. Progress */}
      <NotionPropertyRow icon={TrendingUp} label="Progress">
        <div className="flex items-center gap-3 w-full max-w-xs">
          <div className="h-2 flex-1 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, project.progress || 0))}%` }}
            />
          </div>
          <span className="tabular-nums font-bold text-xs shrink-0">
            {Math.round(project.progress || 0)}%
          </span>
        </div>
      </NotionPropertyRow>

      {/* 10. Tasks View Action */}
      <NotionPropertyRow icon={ArrowUpRight} label="Tasks">
        {onNavigateTab ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateTab('board')}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
            >
              <span>Task Board</span>
              <ArrowUpRight size={11} />
            </button>
            <span className="text-muted-foreground/40">•</span>
            <button
              type="button"
              onClick={() => onNavigateTab('list')}
              className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline cursor-pointer"
            >
              <span>List View</span>
              <ArrowUpRight size={11} />
            </button>
          </div>
        ) : null}
      </NotionPropertyRow>

      {/* 11. Created */}
      <NotionPropertyRow icon={Clock} label="Created">
        {project.createdAt ? (
          <span className="tabular-nums text-muted-foreground">
            {formatDateTime(project.createdAt)}
          </span>
        ) : null}
      </NotionPropertyRow>

      {/* 12. Edited */}
      <NotionPropertyRow icon={Clock} label="Edited">
        {project.updatedAt ? (
          <span className="tabular-nums text-muted-foreground">
            {formatDateTime(project.updatedAt)}
          </span>
        ) : null}
      </NotionPropertyRow>

      {/* 13. Date Completed */}
      <NotionPropertyRow icon={CheckCircle2} label="Date Completed">
        {project.completedAt ? (
          <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
            {formatDate(project.completedAt)}
          </span>
        ) : null}
      </NotionPropertyRow>

      {/* 14. Project Duration */}
      <NotionPropertyRow icon={CalendarDays} label="Project Duration">
        {durationText ? <span className="tabular-nums font-medium">{durationText}</span> : null}
      </NotionPropertyRow>

      {/* 15. Related to Actions (Monthly Deliverables) */}
      <NotionPropertyRow icon={Sparkles} label="Related to Actions">
        {deliverablesSummary ? (
          <span className="font-medium text-foreground">{deliverablesSummary}</span>
        ) : null}
      </NotionPropertyRow>

      {/* 16. Budget */}
      <NotionPropertyRow icon={IndianRupee} label="Budget">
        {totalBudget > 0 ? (
          <span className="tabular-nums font-bold text-foreground">
            {formatINR(totalBudget)}
          </span>
        ) : null}
      </NotionPropertyRow>

      {/* 17. Invoice Pending */}
      <NotionPropertyRow icon={IndianRupee} label="Invoice Pending">
        <div className="flex items-center gap-2 tabular-nums">
          <span className={`font-bold ${balancePending > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
            {formatINR(balancePending)}
          </span>
          {paymentStatus && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-secondary text-muted-foreground">
              {paymentStatus}
            </span>
          )}
        </div>
      </NotionPropertyRow>

      {/* 18. Invoices */}
      <NotionPropertyRow icon={FileText} label="Invoices">
        {invoices && invoices.length > 0 ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold tabular-nums">{invoices.length} {invoices.length === 1 ? 'Invoice' : 'Invoices'}</span>
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('budget')}
                className="text-xs text-primary hover:underline font-semibold cursor-pointer"
              >
                View Finance & Invoices →
              </button>
            )}
          </div>
        ) : null}
      </NotionPropertyRow>

      {/* 19. Priority Level */}
      <NotionPropertyRow icon={Flag} label="Priority Level">
        {project.priority ? (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold ${
              priorityColors[project.priority] || 'bg-secondary text-foreground'
            }`}
          >
            {project.priority}
          </span>
        ) : null}
      </NotionPropertyRow>

      {/* 20. Project Description */}
      <NotionPropertyRow icon={FileText} label="Project Description">
        {project.description ? (
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap max-w-xl">
            {project.description}
          </p>
        ) : null}
      </NotionPropertyRow>

      {/* 21. Start Date */}
      <NotionPropertyRow icon={Calendar} label="Start Date">
        {project.startDate ? (
          <span className="tabular-nums font-medium">{formatDate(project.startDate)}</span>
        ) : null}
      </NotionPropertyRow>

      {/* 22. Due Date */}
      <NotionPropertyRow icon={Calendar} label="Due Date">
        {project.dueDate ? (
          <span className="tabular-nums font-medium">{formatDate(project.dueDate)}</span>
        ) : null}
      </NotionPropertyRow>

      {/* 23. Milestones */}
      <NotionPropertyRow icon={Flag} label="Milestones">
        {project.milestones && project.milestones.length > 0 ? (
          <span className="tabular-nums font-semibold">
            {project.milestones.filter((m) => m.isCompleted).length} / {project.milestones.length} Completed
          </span>
        ) : null}
      </NotionPropertyRow>

      {/* 24. Accepted Proposal */}
      <NotionPropertyRow icon={FileText} label="Proposal">
        {project.acceptedProposalId ? (
          <Link
            to={`/proposals/${project.acceptedProposalId._id || project.acceptedProposalId}`}
            className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
          >
            <span>{project.acceptedProposalId.title || project.acceptedProposalId.proposalNumber || 'View Proposal'}</span>
            <ArrowUpRight size={12} />
          </Link>
        ) : null}
      </NotionPropertyRow>

      {/* 25. Tags */}
      <NotionPropertyRow icon={Tag} label="Tags">
        {project.tags && project.tags.length > 0 ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            {project.tags.map((tag, idx) => (
              <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-secondary text-muted-foreground">
                #{tag}
              </span>
            ))}
          </div>
        ) : null}
      </NotionPropertyRow>

      {/* Bottom Footer: + Add / Edit a property */}
      {canEdit && onEdit && (
        <div className="pt-2 pl-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors cursor-pointer"
          >
            <Plus size={14} />
            <span>Add / Edit properties</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectNotionPropertiesView;
