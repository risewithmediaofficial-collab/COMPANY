import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Download,
  LayoutGrid,
  List,
  PanelTop,
  Plus,
  Rows3,
  TimerReset,
  X,
  Palette,
} from 'lucide-react';
import { AddTaskModal } from '../../components/modals/AddTaskModal';
import { ClientTaskResponsePanel } from '../../components/tasks/ClientTaskResponsePanel';
import { DailyCalendarTaskDialog } from '../../components/tasks/DailyCalendarTaskDialog';
import { DailyTaskUpdateDialog } from '../../components/tasks/DailyTaskUpdateDialog';
import { CollapsibleFilterBar } from '../../components/ui/CollapsibleFilterBar';
import { TaskDetailModal } from '../../components/ui/TaskDetailModal';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  EmptyState,
  MetricCard,
  MetricGrid,
  PageHeader,
  PageToolbar,
  SearchField,
  SectionCard,
  StatusBadge,
} from '../../components/ui/page';
import { useClients } from '../../hooks/useClients';
import { useProjects } from '../../hooks/useProjects';
import { useTaskCalendar, useTasks, useWeeklyTaskReport } from '../../hooks/useTasks';
import { useUsers } from '../../hooks/useUsers';
import {
  CONTENT_TASK_TYPE_OPTIONS,
  NON_CONTENT_TASK_TYPE_OPTIONS,
  PRIORITY_OPTIONS,
  TASK_CATEGORY_OPTIONS,
  TASK_STATUS_OPTIONS,
  formatTaskTypeLabel,
  getClientTaskStatusMeta,
  normalizeTaskStatusLabel,
} from '../../utils/taskFields';
import { cn } from '../../utils/cn';
import { getAssetUrl } from '../../utils/assetUrl';
import jsPDF from 'jspdf';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const VIEW_OPTIONS = [
  { value: 'month', label: 'Monthly', icon: LayoutGrid },
  { value: 'week', label: 'Weekly', icon: Rows3 },
  { value: 'day', label: 'Daily', icon: PanelTop },
  { value: 'list', label: 'Cards', icon: List },
  { value: 'agenda', label: 'List', icon: CalendarDays },
];

export const TASK_STATUS_COLORS = {
  'To Do': {
    label: 'To Do / Scheduled',
    dot: 'bg-slate-400',
    border: 'border-slate-300 dark:border-slate-700',
    bg: 'bg-slate-500/10 hover:bg-slate-500/20 text-slate-800 dark:text-slate-200',
    badge: 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700',
    sign: '⚪ To Do',
  },
  'On Process': {
    label: 'In Process / Active',
    dot: 'bg-blue-500',
    border: 'border-blue-400/70 dark:border-blue-600/70',
    bg: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-900 dark:text-blue-200',
    badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-400/40',
    sign: '🔵 In Process',
  },
  'Waiting for Client': {
    label: 'Waiting for Client',
    dot: 'bg-amber-500',
    border: 'border-amber-400/70 dark:border-amber-600/70',
    bg: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200',
    badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/40',
    sign: '🟡 Waiting Client',
  },
  'Review Required': {
    label: 'Review Required',
    dot: 'bg-purple-500',
    border: 'border-purple-400/70 dark:border-purple-600/70',
    bg: 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-900 dark:text-purple-200',
    badge: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-400/40',
    sign: '🟣 Review Needed',
  },
  'Rework': {
    label: 'Rework Required',
    dot: 'bg-rose-500',
    border: 'border-rose-400/70 dark:border-rose-600/70',
    bg: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-900 dark:text-rose-200',
    badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-400/40',
    sign: '🟠 Rework',
  },
  'Completed': {
    label: 'Completed / Approved',
    dot: 'bg-emerald-500',
    border: 'border-emerald-400/70 dark:border-emerald-600/70',
    bg: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-900 dark:text-emerald-200',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/40',
    sign: '🟢 Completed',
  },
  'Approved': {
    label: 'Approved',
    dot: 'bg-emerald-500',
    border: 'border-emerald-400/70 dark:border-emerald-600/70',
    bg: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-900 dark:text-emerald-200',
    badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/40',
    sign: '🟢 Approved',
  },
};

export const TASK_PRIORITY_COLORS = {
  Urgent: {
    label: 'Urgent',
    dot: 'bg-rose-500',
    badge: 'bg-rose-500 text-white font-black shadow-xs ring-1 ring-rose-600',
    pill: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-400/40',
    sign: '🔴 Urgent',
    borderLeft: 'border-l-4 border-l-rose-500',
  },
  High: {
    label: 'High',
    dot: 'bg-amber-500',
    badge: 'bg-amber-500 text-white font-bold',
    pill: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/40',
    sign: '🟠 High',
    borderLeft: 'border-l-3 border-l-amber-500',
  },
  Medium: {
    label: 'Medium',
    dot: 'bg-blue-500',
    badge: 'bg-blue-500 text-white font-semibold',
    pill: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-400/40',
    sign: '🔵 Medium',
    borderLeft: '',
  },
  Low: {
    label: 'Low',
    dot: 'bg-slate-400',
    badge: 'bg-slate-500 text-white font-medium',
    pill: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-400/40',
    sign: '🟢 Low',
    borderLeft: '',
  },
};

const statusTone = {
  'To Do': 'neutral',
  'On Process': 'info',
  'Waiting for Client': 'warning',
  Completed: 'success',
  Rework: 'danger',
  Approved: 'success',
  'Rework Completed': 'info',
  'Review Required': 'warning',
};

const priorityTone = {
  Low: 'neutral',
  Medium: 'info',
  High: 'warning',
  Urgent: 'danger',
};

const categoryTone = {
  content: 'info',
  non_content: 'warning',
};

const ALL_TASK_TYPES = [...CONTENT_TASK_TYPE_OPTIONS, ...NON_CONTENT_TASK_TYPE_OPTIONS];
const EMPLOYEE_ROLES = ['employee', 'intern', 'editor', 'designer', 'adsManager'];

const DEFAULT_DOS = [
  'Confirm the brief, due time, and assignee before starting work.',
  'Check attachments, reference links, and client-visible notes first.',
  'Update status as work moves from received to in progress to review.',
];

const DEFAULT_DONTS = [
  'Do not start production without reviewing the latest requirement.',
  'Do not deliver files without checking quality and required formats.',
  'Do not close the task without updating notes or response status.',
];

const DEFAULT_PROCESS = [
  'Review task scope and required files.',
  'Start execution with status update.',
  'Upload work progress or completed files.',
  'Move task to review, waiting for client, or approved state.',
];

const CONTENT_DOS = [
  'Follow brand tone, caption style, and editing guide exactly.',
  'Validate script, CTA, duration, and format before editing.',
  'Keep export names and platform dimensions organized.',
];

const CONTENT_DONTS = [
  'Do not ignore editor guide, music direction, or logo placement notes.',
  'Do not publish or mark complete before caption and creative review.',
  'Do not use unapproved inspiration assets in final delivery.',
];

const CONTENT_PROCESS = [
  'Review script, caption, reference, and attachments.',
  'Draft content and prepare edit flow.',
  'Upload preview or final files for review.',
  'Collect client response and close or rework the task.',
];

const WEBSITE_DOS = [
  'Validate page scope, features, and credentials before development.',
  'Check hosting, domain, branding, and content availability early.',
  'Keep login, dashboard, and integration requirements documented.',
];

const WEBSITE_DONTS = [
  'Do not change approved page scope without confirmation.',
  'Do not deploy without checking forms, buttons, and responsive layout.',
  'Do not share admin credentials in client-visible notes.',
];

const WEBSITE_PROCESS = [
  'Review website requirements, pages, and credentials.',
  'Build or update the required pages and features.',
  'Run QA for forms, responsiveness, and integrations.',
  'Send for review and collect approval or rework.',
];

const OPERATIONS_DOS = [
  'Confirm the exact operational outcome expected from the task.',
  'Keep communication and status updates clear for the client.',
  'Attach proof of work, reports, or final documents when done.',
];

const OPERATIONS_DONTS = [
  'Do not leave the task without notes when external follow-up is needed.',
  'Do not mark completed if client action is still pending.',
  'Do not skip evidence files for reports, setup, or support work.',
];

const OPERATIONS_PROCESS = [
  'Review task description and external dependencies.',
  'Complete the setup, support, or follow-up action.',
  'Attach supporting files or notes.',
  'Move the task to completed, waiting for client, or approved.',
];

const getRangeForView = (date, view) => {
  if (view === 'week') {
    return {
      start: startOfWeek(date, { weekStartsOn: 0 }),
      end: endOfWeek(date, { weekStartsOn: 0 }),
    };
  }

  if (view === 'day') {
    return {
      start: startOfDay(date),
      end: endOfDay(date),
    };
  }

  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
};

const shiftDateByView = (date, view, direction) => {
  if (view === 'week') return direction > 0 ? addWeeks(date, 1) : subWeeks(date, 1);
  if (view === 'day') return direction > 0 ? addDays(date, 1) : subDays(date, 1);
  return direction > 0 ? addMonths(date, 1) : subMonths(date, 1);
};

const buildGuidanceForDate = (tasksForDate = []) => {
  if (!tasksForDate.length) {
    return {
      dos: DEFAULT_DOS,
      donts: DEFAULT_DONTS,
      process: DEFAULT_PROCESS,
    };
  }

  const hasContent = tasksForDate.some((task) => task.taskCategory !== 'non_content');
  const hasWebsite = tasksForDate.some((task) => ['website_development', 'website_update', 'landing_page'].includes(task.taskType));

  if (hasWebsite) {
    return {
      dos: WEBSITE_DOS,
      donts: WEBSITE_DONTS,
      process: WEBSITE_PROCESS,
    };
  }

  if (hasContent) {
    return {
      dos: CONTENT_DOS,
      donts: CONTENT_DONTS,
      process: CONTENT_PROCESS,
    };
  }

  return {
    dos: OPERATIONS_DOS,
    donts: OPERATIONS_DONTS,
    process: OPERATIONS_PROCESS,
  };
};

const downloadWeeklyReportPdf = ({ report, range, employeeName }) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (height = 8) => {
    if (y + height <= pageHeight - margin) return;
    doc.addPage();
    y = margin;
  };

  const addWrappedText = (text, indent = 0) => {
    const lines = doc.splitTextToSize(text || '-', contentWidth - indent);
    lines.forEach((line) => {
      ensureSpace(6);
      doc.text(line, margin + indent, y);
      y += 5;
    });
  };

  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59);
  doc.text('Weekly Task Report', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`${employeeName} • ${format(range.start, 'MMM d, yyyy')} to ${format(range.end, 'MMM d, yyyy')}`, margin, y);
  y += 10;

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 24, 4, 4, 'F');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text(`Updates: ${report.summary?.totalUpdates || 0}`, margin + 4, y + 8);
  doc.text(`Hours: ${Number(report.summary?.totalHours || 0).toFixed(2)}`, margin + 4, y + 15);
  doc.text(`Tasks: ${report.summary?.uniqueTasks || 0}`, margin + contentWidth / 2, y + 8);
  doc.text(`Employees: ${report.summary?.uniqueEmployees || 0}`, margin + contentWidth / 2, y + 15);
  y += 32;

  (report.rows || []).forEach((row, index) => {
    ensureSpace(28);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 24, 3, 3);
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`${index + 1}. ${row.taskTitle}`, margin + 4, y + 7);
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`${format(new Date(row.workDate), 'EEE, MMM d')} • ${row.employeeName} • ${Number(row.hours || 0).toFixed(2)}h`, margin + 4, y + 13);
    doc.text(`${row.clientName || 'No client'} • ${row.projectName || 'No project'}`, margin + 4, y + 18);
    y += 24;
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    addWrappedText(row.description);
    if (row.workNotes) {
      doc.setTextColor(100, 116, 139);
      addWrappedText(`Notes: ${row.workNotes}`, 2);
    }
    y += 3;
  });

  const filename = `weekly-task-report-${format(range.start, 'yyyy-MM-dd')}-to-${format(range.end, 'yyyy-MM-dd')}.pdf`;
  doc.save(filename);
};

const FileLinks = ({ files = [], emptyMessage = 'No files available.' }) => {
  if (!files.length) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2">
      {files.map((file, index) => {
        const fileUrl = getAssetUrl(file.url);
        const isImage = file.type?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.url || file.name || '');

        return (
        <a
          key={`${file.url || file.name}-${index}`}
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-secondary/40"
        >
          <span className="flex min-w-0 items-center gap-3">
            {isImage ? (
              <img
                src={fileUrl}
                alt={file.name || 'Attachment preview'}
                className="h-12 w-12 shrink-0 rounded-xl border border-border object-cover"
                loading="lazy"
              />
            ) : null}
            <span className="truncate">{file.name || 'File'}</span>
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">{file.type || 'Attachment'}</span>
        </a>
      );
      })}
    </div>
  );
};

const ClientTaskDialog = ({ task, open, onOpenChange, onSubmitted }) => {
  const statusMeta = getClientTaskStatusMeta(task?.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task?.taskTitle || task?.title || 'Task details'}</DialogTitle>
          <DialogDescription>
            Review task details, delivery files, and confirm your response when action is needed.
          </DialogDescription>
        </DialogHeader>

        {task ? (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Task Category</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {task.taskCategory === 'non_content' ? 'Non-Content Task' : 'Content Task'}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Task Type</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{formatTaskTypeLabel(task.taskType)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Assigned Person</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {task.assignedPersonName || task.assignedTo?.map((item) => item.name).join(', ') || 'Unassigned'}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Current Status</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{statusMeta.label}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background p-4 text-sm text-foreground">
              <p className="font-semibold">Progress Alert</p>
              <p className="mt-2 text-muted-foreground">{statusMeta.alert}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Requirements</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                  {task.description || task.websiteRequirements || 'No requirements shared yet.'}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Notes Visible To You</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                  {task.clientVisibleNotes || 'No client-visible notes available.'}
                </p>
              </div>
            </div>

            {task.taskCategory !== 'non_content' ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Script / Script Link</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                    {task.scriptText || task.scriptLink || 'No script shared.'}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Caption / Editor Guide</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{task.caption || 'No caption shared.'}</p>
                  {task.editorGuide ? <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{task.editorGuide}</p> : null}
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Attachments</p>
                <FileLinks files={task.attachments || []} />
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Completed Files</p>
                <FileLinks files={task.completedFiles || []} />
              </div>
            </div>

            <ClientTaskResponsePanel task={task} onSubmitted={onSubmitted} compact />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

const TaskSummaryCard = ({ task, onOpen }) => {
  const normalizedStatus = normalizeTaskStatusLabel(task.status);
  const statusTheme = TASK_STATUS_COLORS[normalizedStatus] || TASK_STATUS_COLORS['To Do'];
  const priorityTheme = TASK_PRIORITY_COLORS[task.priority] || TASK_PRIORITY_COLORS['Medium'];
  const isUrgent = task.priority === 'Urgent';
  const isHigh = task.priority === 'High';

  return (
    <button
      type="button"
      onClick={() => onOpen(task)}
      className={cn(
        "w-full rounded-[24px] border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md relative overflow-hidden",
        statusTheme.border,
        statusTheme.bg,
        isUrgent && "ring-2 ring-rose-500/50 border-l-6 border-l-rose-500 bg-rose-500/10 shadow-rose-500/10",
        isHigh && !isUrgent && "border-l-4 border-l-amber-500",
        task.isOverdue && "border-rose-500 bg-rose-500/15"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn('px-2.5 py-0.5 rounded-lg text-[11px] font-bold border flex items-center gap-1', statusTheme.badge)}>
              <span className={cn('h-2 w-2 rounded-full', statusTheme.dot)} />
              <span>{normalizedStatus}</span>
            </span>

            {isUrgent ? (
              <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-rose-500 text-white shadow-xs animate-pulse flex items-center gap-1">
                <span>🔴</span>
                <span>URGENT PRIORITY</span>
              </span>
            ) : isHigh ? (
              <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                🟠 High Priority
              </span>
            ) : task.priority ? (
              <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-secondary text-muted-foreground border border-border">
                {priorityTheme.sign || task.priority}
              </span>
            ) : null}

            <StatusBadge tone={categoryTone[task.taskCategory] || 'neutral'}>
              {task.taskCategory === 'non_content' ? 'Non-Content' : 'Content'}
            </StatusBadge>

            {task.isOverdue ? <StatusBadge tone="danger">Overdue</StatusBadge> : null}
          </div>

          <h3 className="mt-3 text-base font-bold text-foreground hover:text-primary transition-colors">
            {task.taskTitle || task.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {task.description || task.websiteRequirements || task.scriptText || 'No requirements added yet.'}
          </p>
        </div>

        <div className="rounded-2xl bg-card border border-border px-3 py-2 text-right shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Due Date</p>
          <p className="mt-0.5 text-xs font-black text-foreground">
            {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'No date'}
          </p>
        </div>
      </div>

      <div className="mt-3.5 grid gap-2.5 md:grid-cols-3">
        <div className="rounded-xl border border-border/80 bg-background/80 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Client</p>
          <p className="mt-0.5 text-xs font-semibold text-foreground truncate">{task.client?.name || task.client?.company || task.clientName || 'No client linked'}</p>
        </div>
        <div className="rounded-xl border border-border/80 bg-background/80 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assigned To</p>
          <p className="mt-0.5 text-xs font-semibold text-foreground truncate">
            {task.assignedPersonName || task.assignedTo?.map((item) => item.name).join(', ') || 'Unassigned'}
          </p>
        </div>
        <div className="rounded-xl border border-border/80 bg-background/80 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Project</p>
          <p className="mt-0.5 text-xs font-semibold text-foreground truncate">{task.project?.name || task.projectName || 'No project linked'}</p>
        </div>
      </div>
    </button>
  );
};

const ContentCalendar = ({ embedded = false, defaultView = 'month' }) => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState(defaultView);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    client: '',
    assignedTo: '',
    taskCategory: '',
    taskType: '',
    status: '',
    priority: '',
    project: '',
    startDate: '',
    endDate: '',
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [draftDueDate, setDraftDueDate] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [showClientDetail, setShowClientDetail] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDayDialog, setShowDayDialog] = useState(false);
  const [showDailyUpdateDialog, setShowDailyUpdateDialog] = useState(false);
  const [showDailyTaskDialog, setShowDailyTaskDialog] = useState(false);

  const isClient = user?.role === 'client';
  const canManageCalendar = ['superAdmin', 'manager'].includes(user?.role);
  const canFilterAssignee = ['superAdmin', 'manager'].includes(user?.role);
  const canFilterClientProject = ['superAdmin', 'manager', 'employee'].includes(user?.role);
  const canLogDailyUpdates = EMPLOYEE_ROLES.includes(user?.role);
  const canDownloadWeeklyReport = canLogDailyUpdates || canManageCalendar;

  const visibleRange = useMemo(() => getRangeForView(currentDate, view), [currentDate, view]);

  const queryFilters = useMemo(() => ({
    ...filters,
    search,
    parent: 'all',
    startDate: filters.startDate || format(visibleRange.start, 'yyyy-MM-dd'),
    endDate: filters.endDate || format(visibleRange.end, 'yyyy-MM-dd'),
  }), [filters, search, visibleRange]);

  const { data: calendarData, isLoading, refetch } = useTaskCalendar(queryFilters);
  const { data: employeeTasks = [] } = useTasks(
    { assignedTo: user?._id, parent: 'all', limit: 300 },
    { enabled: canLogDailyUpdates && !!user?._id },
  );
  const { data: clients = [] } = useClients({}, { enabled: canFilterClientProject });
  const { data: projects = [] } = useProjects({}, { enabled: canFilterClientProject });
  const { data: users = [] } = useUsers({ enabled: canFilterAssignee });

  const tasks = useMemo(
    () => (calendarData?.tasks || []).map((task) => ({ ...task, status: normalizeTaskStatusLabel(task.status) })),
    [calendarData],
  );

  const summary = calendarData?.summary || {
    total: tasks.length,
    overdue: tasks.filter((task) => task.isOverdue).length,
    waitingForClient: tasks.filter((task) => task.status === 'Waiting for Client').length,
    completed: tasks.filter((task) => ['Completed', 'Approved'].includes(task.status)).length,
  };

  const weeklyRange = useMemo(() => ({
    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  }), [currentDate]);

  const weeklyReportFilters = useMemo(() => ({
    startDate: format(weeklyRange.start, 'yyyy-MM-dd'),
    endDate: format(weeklyRange.end, 'yyyy-MM-dd'),
    assignedTo: canManageCalendar ? filters.assignedTo || undefined : user?._id,
  }), [weeklyRange, canManageCalendar, filters.assignedTo, user?._id]);

  const { data: weeklyReport, isFetching: isWeeklyReportLoading } = useWeeklyTaskReport(
    weeklyReportFilters,
    { enabled: canDownloadWeeklyReport && (!!user?._id || !!filters.assignedTo) },
  );

  const daysInView = useMemo(() => {
    if (view === 'week') {
      return eachDayOfInterval({ start: visibleRange.start, end: visibleRange.end });
    }

    if (view === 'day') {
      return [visibleRange.start];
    }

    const calendarStart = startOfWeek(visibleRange.start, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(visibleRange.end, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [view, visibleRange]);

  const tasksByDate = useMemo(() => {
    const map = new Map();
    tasks.forEach((task) => {
      if (!task.dueDate) return;
      const key = format(new Date(task.dueDate), 'yyyy-MM-dd');
      const current = map.get(key) || [];
      current.push(task);
      map.set(key, current);
    });
    return map;
  }, [tasks]);

  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    return tasksByDate.get(format(selectedDate, 'yyyy-MM-dd')) || [];
  }, [selectedDate, tasksByDate]);

  const selectedDateGuidance = useMemo(
    () => buildGuidanceForDate(selectedDateTasks),
    [selectedDateTasks],
  );

  const assignableUsers = useMemo(
    () => users.filter((person) => ['superAdmin', 'manager', 'employee'].includes(person.role)),
    [users],
  );

  const listTasks = useMemo(
    () => [...tasks].sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0)),
    [tasks],
  );

  const dailyUpdateTasks = useMemo(
    () => (canLogDailyUpdates ? employeeTasks : []),
    [canLogDailyUpdates, employeeTasks],
  );

  const weeklyReportOwnerLabel = canManageCalendar
    ? (assignableUsers.find((person) => person._id === filters.assignedTo)?.name || 'All visible team members')
    : (user?.name || 'Employee');

  const toolbarTitle = useMemo(() => {
    if (view === 'week') {
      return `${format(visibleRange.start, 'MMM d')} - ${format(visibleRange.end, 'MMM d, yyyy')}`;
    }
    if (view === 'day') {
      return format(visibleRange.start, 'EEEE, MMM d, yyyy');
    }
    return format(currentDate, 'MMMM yyyy');
  }, [currentDate, view, visibleRange]);

  const handleDownloadWeeklyReport = () => {
    if (!weeklyReport?.rows?.length) return;
    downloadWeeklyReportPdf({
      report: weeklyReport,
      range: weeklyRange,
      employeeName: weeklyReportOwnerLabel,
    });
  };

  const handleOpenTask = (task) => {
    if (isClient) {
      setActiveTask(task);
      setShowClientDetail(true);
      return;
    }

    setSelectedTaskId(task._id);
    setShowTaskDetail(true);
  };

  const openDateDetails = (date) => {
    const key = format(date, 'yyyy-MM-dd');
    const dayTasks = tasksByDate.get(key) || [];

    if (!dayTasks.length) {
      if (canManageCalendar) {
        setSelectedTask(null);
        setDraftDueDate(format(date, 'yyyy-MM-dd'));
        setShowAddModal(true);
        return;
      }

      if (canLogDailyUpdates) {
        setSelectedDate(date);
        setShowDailyTaskDialog(true);
        return;
      }
    }

    setSelectedDate(date);
    setShowDayDialog(true);
  };

  const renderMonthView = () => (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-xs">
      <div className="min-w-[680px]">
        <div className="grid grid-cols-7 border-b border-border bg-secondary/40">
          {DAY_NAMES.map((day) => (
            <div key={day} className="py-1.5 px-1 text-center text-[11px] font-black uppercase tracking-wider text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {daysInView.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDate.get(key) || [];
            const inCurrentMonth = isSameMonth(day, currentDate);
            const isDayToday = isToday(day);

            return (
              <button
                key={key}
                type="button"
                onClick={() => openDateDetails(day)}
                className={cn(
                  'min-h-[72px] sm:min-h-[80px] max-h-[105px] overflow-hidden border-b border-r border-border/70 p-1 sm:p-1.5 text-left align-top transition-colors focus:outline-none focus:ring-1 focus:ring-primary/30',
                  !inCurrentMonth && 'bg-secondary/15 opacity-55',
                  isDayToday && 'bg-primary/5 ring-1 ring-inset ring-primary/25',
                  dayTasks.length ? 'hover:bg-secondary/35' : 'hover:bg-secondary/15',
                )}
              >
                <div className="flex items-center justify-between gap-1 leading-none">
                  <div
                    className={cn(
                      'flex h-6 w-6 sm:h-6 sm:w-6 items-center justify-center rounded-full text-xs sm:text-sm font-black tracking-tight',
                      isDayToday
                        ? 'bg-primary text-primary-foreground font-black shadow-xs ring-1 ring-primary/40'
                        : inCurrentMonth
                        ? 'text-foreground font-black'
                        : 'text-muted-foreground font-bold',
                    )}
                  >
                    {format(day, 'd')}
                  </div>
                  {dayTasks.length ? (
                    <span className="rounded-full bg-primary/10 border border-primary/20 px-1.5 py-0.2 text-[10px] font-black text-primary leading-none">
                      {dayTasks.length}
                    </span>
                  ) : null}
                </div>

                <div className="mt-1 space-y-1">
                  {dayTasks.slice(0, 2).map((task) => {
                    const normalizedStatus = normalizeTaskStatusLabel(task.status);
                    const statusTheme = TASK_STATUS_COLORS[normalizedStatus] || TASK_STATUS_COLORS['To Do'];
                    const isUrgent = task.priority === 'Urgent';
                    const isHigh = task.priority === 'High';

                    return (
                      <div
                        key={task._id}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpenTask(task);
                        }}
                        className={cn(
                          'group/task relative rounded-md border px-1.5 py-0.5 text-left shadow-2xs transition-all hover:scale-[1.01] hover:shadow-xs cursor-pointer',
                          statusTheme.border,
                          statusTheme.bg,
                          isUrgent && 'border-l-[3px] border-l-rose-500 ring-1 ring-rose-500/50 bg-rose-500/10',
                          isHigh && !isUrgent && 'border-l-[3px] border-l-amber-500',
                          task.isOverdue && 'border-rose-500/80 bg-rose-500/15',
                        )}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', statusTheme.dot, isUrgent && 'animate-pulse')} />
                            <p className="truncate text-[10px] font-bold text-foreground group-hover/task:text-primary transition-colors leading-tight">
                              {task.taskTitle || task.title}
                            </p>
                          </div>
                          {isUrgent ? (
                            <span className="shrink-0 px-1 py-0.2 rounded text-[7px] font-black bg-rose-500 text-white leading-none">
                              !
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}

                  {dayTasks.length > 2 ? (
                    <div className="text-[9px] font-black text-primary px-0.5 leading-none">
                      +{dayTasks.length - 2} more
                    </div>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderAgendaView = () => {
    // Group tasks by due date
    const grouped = new Map();
    listTasks.forEach((task) => {
      const key = task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : 'no-date';
      const label = task.dueDate ? format(new Date(task.dueDate), 'EEEE, MMMM d, yyyy') : 'No Due Date';
      if (!grouped.has(key)) grouped.set(key, { label, tasks: [] });
      grouped.get(key).tasks.push(task);
    });

    const groups = Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));

    if (!groups.length) {
      return (
        <EmptyState
          title="No tasks found"
          description="Adjust your filters or date range to see tasks."
          action={canManageCalendar ? (
            <Button onClick={() => navigate('/tasks/new')}>
              <Plus size={16} className="mr-2" />
              Create Task
            </Button>
          ) : null}
        />
      );
    }

    return (
      <div className="space-y-1 rounded-[20px] overflow-hidden border border-border">
        {/* Header Row */}
        <div className="grid items-center gap-2 bg-secondary/60 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
          style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 100px' }}>
          <span>Task</span>
          <span>Client</span>
          <span>Assigned To</span>
          <span>Status</span>
          <span>Priority</span>
          <span className="text-right">Due Date</span>
        </div>

        {groups.map(([dateKey, { label, tasks: dateTasks }]) => (
          <div key={dateKey}>
            {/* Date Group Header */}
            <div className={cn(
              'sticky top-0 z-10 flex items-center gap-3 border-y border-border bg-card/95 px-4 py-2 backdrop-blur-sm',
              dateKey !== 'no-date' && isToday(new Date(dateKey)) && 'bg-primary/5 border-primary/20',
            )}>
              <div className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black',
                dateKey !== 'no-date' && isToday(new Date(dateKey))
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-foreground',
              )}>
                {dateKey !== 'no-date' ? format(new Date(dateKey), 'd') : '—'}
              </div>
              <p className="text-xs font-bold text-foreground">{label}</p>
              <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {dateTasks.length} {dateTasks.length === 1 ? 'task' : 'tasks'}
              </span>
            </div>

            {/* Task Rows */}
            {dateTasks.map((task, idx) => {
              const normalizedStatus = normalizeTaskStatusLabel(task.status);
              const assignees = task.assignedTo?.map((a) => a.name).join(', ') || task.assignedPersonName || 'Unassigned';
              return (
                <button
                  key={task._id}
                  type="button"
                  onClick={() => handleOpenTask(task)}
                  className={cn(
                    'w-full grid items-center gap-2 border-b border-border/50 px-4 py-3 text-left transition-all hover:bg-secondary/30',
                    idx % 2 === 0 ? 'bg-background' : 'bg-secondary/10',
                    task.isOverdue && 'border-l-2 border-l-rose-500',
                  )}
                  style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 100px' }}
                >
                  {/* Title + Category */}
                  <div className="min-w-0 flex items-center gap-2">
                    <span className={cn(
                      'h-2 w-2 shrink-0 rounded-full',
                      task.taskCategory === 'content' ? 'bg-blue-500' : 'bg-amber-500',
                    )} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{task.taskTitle || task.title}</p>
                      <p className="truncate text-[11px] text-muted-foreground">{formatTaskTypeLabel(task.taskType)}</p>
                    </div>
                    {task.isOverdue && (
                      <span className="ml-1 shrink-0 rounded-full bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-600 uppercase">Overdue</span>
                    )}
                  </div>

                  {/* Client */}
                  <p className="truncate text-xs text-muted-foreground">
                    {task.client?.name || task.client?.company || task.clientName || '—'}
                  </p>

                  {/* Assignees */}
                  <p className="truncate text-xs text-muted-foreground">{assignees}</p>

                  {/* Status */}
                  <div>
                    <StatusBadge tone={statusTone[normalizedStatus] || 'neutral'}>
                      {normalizedStatus}
                    </StatusBadge>
                  </div>

                  {/* Priority */}
                  <div>
                    <StatusBadge tone={priorityTone[task.priority] || 'neutral'}>
                      {task.priority || '—'}
                    </StatusBadge>
                  </div>

                  {/* Due Date */}
                  <p className="text-right text-xs font-semibold text-foreground">
                    {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : '—'}
                  </p>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const renderWeekOrDayView = () => (
    <div className="grid gap-4 lg:grid-cols-7">
      {daysInView.map((day) => {
        const key = format(day, 'yyyy-MM-dd');
        const dayTasks = tasksByDate.get(key) || [];

        return (
          <div key={key} className={cn('rounded-[24px] border border-border bg-card p-4 shadow-sm', view === 'day' && 'lg:col-span-7')}>
            <button type="button" onClick={() => openDateDetails(day)} className="w-full text-left">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {format(day, 'EEEE')}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-foreground">{format(day, 'MMM d')}</h3>
                </div>
                {isToday(day) ? <StatusBadge tone="info">Today</StatusBadge> : null}
              </div>
            </button>

            <div className="mt-4 space-y-3">
              {dayTasks.length ? (
                dayTasks.map((task) => (
                  <TaskSummaryCard key={task._id} task={task} onOpen={handleOpenTask} />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-background px-4 py-10 text-center text-sm text-muted-foreground">
                  {canManageCalendar
                    ? 'No tasks here yet. Click the date above to add one.'
                    : canLogDailyUpdates
                      ? 'No tasks scheduled. Add your daily task to keep your weekly report complete.'
                      : 'No tasks scheduled.'}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className={cn('space-y-2.5', embedded && 'p-3 sm:p-4')}>
      {/* ── Compact Header & View Toolbar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-card rounded-2xl border border-border p-3 shadow-xs">
        {/* Left: Title + Date Range Period + Nav Arrows */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h1 className="text-base sm:text-lg font-black tracking-tight text-foreground">
              {isClient ? 'Client Calendar' : user?.role === 'employee' ? 'My Task Calendar' : 'Task Calendar'}
            </h1>
          </div>

          {/* Date Navigation & Period Label */}
          <div className="flex items-center gap-1.5 bg-secondary/50 rounded-xl p-0.5 border border-border/70">
            <button
              type="button"
              onClick={() => setCurrentDate((current) => shiftDateByView(current, view, -1))}
              className="p-1 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              title="Previous"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentDate(new Date())}
              className="px-2 py-0.5 text-xs font-bold rounded-md hover:bg-background text-foreground transition-all cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setCurrentDate((current) => shiftDateByView(current, view, 1))}
              className="p-1 rounded-lg hover:bg-background text-muted-foreground hover:text-foreground transition-all cursor-pointer"
              title="Next"
            >
              <ChevronRight size={15} />
            </button>
            <span className="text-xs font-black text-primary px-2 border-l border-border/80">
              {toolbarTitle}
            </span>
          </div>
        </div>

        {/* Right: View Options + Action Button */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <div className="inline-flex rounded-xl border border-border bg-secondary/40 p-0.5 shadow-2xs">
            {VIEW_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setView(value)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer',
                  view === value
                    ? 'bg-primary text-primary-foreground shadow-xs font-black'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60',
                )}
              >
                <Icon size={13} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {canManageCalendar ? (
            <Button
              size="sm"
              onClick={() => navigate('/tasks/new')}
              className="h-8 rounded-xl text-xs font-bold gap-1 px-3 shadow-xs"
            >
              <Plus size={14} className="stroke-[2.5]" />
              <span>Create Task</span>
            </Button>
          ) : null}
        </div>
      </div>

      {/* ── Compact Metric Badges & Search Ribbon ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 bg-card/60 backdrop-blur-sm rounded-xl border border-border/80 px-3 py-1.5 shadow-2xs">
        {/* Metric Badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-primary/10 border border-primary/20 text-primary font-bold">
            <CalendarDays size={12} />
            <span>Visible Tasks: <strong className="font-black text-sm">{summary.total}</strong></span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 font-bold">
            <Clock3 size={12} />
            <span>Waiting for Client: <strong className="font-black text-sm">{summary.waitingForClient}</strong></span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-bold">
            <CheckCircle2 size={12} />
            <span>Completed / Approved: <strong className="font-black text-sm">{summary.completed}</strong></span>
          </div>
          <div className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg font-bold border',
            summary.overdue > 0
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-600'
              : 'bg-secondary border-border/80 text-muted-foreground'
          )}>
            <TimerReset size={12} />
            <span>Overdue: <strong className="font-black text-sm">{summary.overdue}</strong></span>
          </div>
        </div>

        {/* Quick Search */}
        <div className="relative w-full lg:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search task titles, clients, scripts..."
            className="w-full h-7 rounded-lg bg-background border border-border px-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── Sleek Interactive Color Signs & Status Legend Bar ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 custom-scrollbar">
        <span className="text-[11px] font-bold text-muted-foreground shrink-0 flex items-center gap-1 mr-1">
          <Palette size={12} className="text-primary" /> Filter:
        </span>
        {Object.entries(TASK_STATUS_COLORS).filter(([key]) => key !== 'Approved').map(([statusKey, meta]) => {
          const isSelected = filters.status === statusKey;
          const count = tasks.filter((t) => t.status === statusKey || (statusKey === 'Completed' && ['Completed', 'Approved'].includes(t.status))).length;

          return (
            <button
              key={statusKey}
              type="button"
              onClick={() => setFilters((current) => ({ ...current, status: isSelected ? '' : statusKey }))}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer shrink-0 shadow-2xs select-none',
                meta.badge,
                isSelected
                  ? 'ring-2 ring-primary ring-offset-1 scale-105 shadow-xs font-black'
                  : 'hover:opacity-90 hover:scale-[1.02]'
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', meta.dot)} />
              <span>{meta.label}</span>
              <span className="ml-0.5 px-1 py-0.2 rounded-full text-[9px] font-black bg-black/10 dark:bg-white/10">
                {count}
              </span>
            </button>
          );
        })}

        <div className="h-3 w-px bg-border mx-1 shrink-0" />

        {Object.entries(TASK_PRIORITY_COLORS).map(([prioKey, meta]) => {
          const isSelected = filters.priority === prioKey;
          const count = tasks.filter((t) => t.priority === prioKey).length;

          return (
            <button
              key={prioKey}
              type="button"
              onClick={() => setFilters((current) => ({ ...current, priority: isSelected ? '' : prioKey }))}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer shrink-0 shadow-2xs select-none',
                meta.pill,
                prioKey === 'Urgent' && 'border-rose-500/50',
                isSelected
                  ? 'ring-2 ring-primary ring-offset-1 scale-105 shadow-xs font-black'
                  : 'hover:opacity-90 hover:scale-[1.02]'
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', meta.dot, prioKey === 'Urgent' && 'animate-ping')} />
              <span>{meta.sign}</span>
              <span className="ml-0.5 px-1 py-0.2 rounded-full text-[9px] font-black bg-black/10 dark:bg-white/10">
                {count}
              </span>
            </button>
          );
        })}

        {(filters.status || filters.priority) && (
          <button
            type="button"
            onClick={() => setFilters((current) => ({ ...current, status: '', priority: '' }))}
            className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5 shrink-0 ml-1 cursor-pointer"
          >
            <span>Reset</span>
            <X size={10} />
          </button>
        )}
      </div>

      {/* ── Main Calendar Container ── */}
      <div>
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="h-32 animate-pulse rounded-2xl border border-border bg-secondary/50" />
            ))}
          </div>
        ) : view === 'agenda' ? (
          renderAgendaView()
        ) : view === 'list' ? (
          listTasks.length ? (
            <div className="grid gap-3 xl:grid-cols-2">
              {listTasks.map((task) => (
                <TaskSummaryCard key={task._id} task={task} onOpen={handleOpenTask} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No tasks found for this view"
              description="Adjust your filters or date range to surface the tasks you want to review."
              action={canManageCalendar ? (
                <Button onClick={() => navigate('/tasks/new')}>
                  <Plus size={16} className="mr-2" />
                  Create Task
                </Button>
              ) : null}
            />
          )
        ) : view === 'month' ? (
          renderMonthView()
        ) : (
          renderWeekOrDayView()
        )}
      </div>

      <DailyTaskUpdateDialog
        open={showDailyUpdateDialog}
        onOpenChange={setShowDailyUpdateDialog}
        tasks={dailyUpdateTasks}
        defaultDate={format(new Date(), 'yyyy-MM-dd')}
        onSubmitted={refetch}
      />

      <DailyCalendarTaskDialog
        open={showDailyTaskDialog}
        onOpenChange={setShowDailyTaskDialog}
        defaultDate={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
        onSubmitted={refetch}
      />

      <Dialog open={showDayDialog} onOpenChange={setShowDayDialog}>
        <DialogContent noPadding className="max-h-[88vh] overflow-hidden p-0 sm:max-w-4xl">
          <div className="border-b border-border bg-gradient-to-br from-background via-background to-secondary/60 px-6 py-5">
            <DialogHeader className="border-b-0 mb-0 pb-0">
              <DialogTitle className="text-2xl tracking-tight">
                {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Tasks'}
              </DialogTitle>
              <DialogDescription>
                {selectedDateTasks.length} scheduled {selectedDateTasks.length === 1 ? 'task' : 'tasks'} for this date.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="max-h-[calc(88vh-112px)] overflow-y-auto px-6 py-5">
            <div className="grid gap-5 xl:grid-cols-[1.35fr_0.95fr]">
              <div>
                {selectedDateTasks.length ? (
                  <div className="space-y-4">
                    {selectedDateTasks.map((task) => (
                      <TaskSummaryCard key={task._id} task={task} onOpen={handleOpenTask} />
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    title="No tasks due on this date"
                    description="This date does not currently have any scheduled tasks."
                    action={canManageCalendar ? (
                      <Button
                        onClick={() => {
                          setShowDayDialog(false);
                          setSelectedTask(null);
                          setDraftDueDate(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '');
                          setShowAddModal(true);
                        }}
                      >
                        <Plus size={16} className="mr-2" />
                        Create Task
                      </Button>
                    ) : canLogDailyUpdates ? (
                      <Button
                        onClick={() => {
                          setShowDayDialog(false);
                          setShowDailyTaskDialog(true);
                        }}
                      >
                        <Plus size={16} className="mr-2" />
                        Add Daily Task
                      </Button>
                    ) : null}
                  />
                )}
              </div>

              <div className="space-y-4">
                <div className="rounded-[24px] border border-border bg-card p-5 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Do</p>
                  <ul className="mt-3 space-y-3 text-sm text-foreground">
                    {selectedDateGuidance.dos.map((item) => (
                      <li key={item} className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-3 py-3">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-[24px] border border-border bg-card p-5 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Don't</p>
                  <ul className="mt-3 space-y-3 text-sm text-foreground">
                    {selectedDateGuidance.donts.map((item) => (
                      <li key={item} className="rounded-2xl border border-rose-100 bg-rose-50/80 px-3 py-3">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-[24px] border border-border bg-card p-5 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Work Process</p>
                  <ol className="mt-3 space-y-3 text-sm text-foreground">
                    {selectedDateGuidance.process.map((item, index) => (
                      <li key={item} className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/80 px-3 py-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                          {index + 1}
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TaskDetailModal taskId={selectedTaskId} open={showTaskDetail} onOpenChange={setShowTaskDetail} />

      <ClientTaskDialog
        task={activeTask}
        open={showClientDetail}
        onOpenChange={setShowClientDetail}
        onSubmitted={refetch}
      />
    </div>
  );
};

export default ContentCalendar;
