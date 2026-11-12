import { useMemo, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useDateFilter } from '../../context/DateFilterContext';
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
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Download,
  Filter,
  LayoutGrid,
  List,
  PanelTop,
  Plus,
  Rows3,
  TimerReset,
  X,
  FileText,
} from '@/components/ui/muiIcons';
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
  DialogClose,
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
    dot: 'bg-muted-foreground',
    border: '',
    bg: 'bg-secondary/50 hover:bg-secondary/80 text-foreground',
    badge: 'bg-secondary/70 text-muted-foreground ',
    sign: 'To Do',
  },
  'On Process': {
    label: 'In Process / Active',
    dot: 'bg-foreground',
    border: '',
    bg: 'bg-secondary/70 hover:bg-secondary text-foreground',
    badge: 'bg-secondary text-foreground ',
    sign: 'In Process',
  },
  'Waiting for Client': {
    label: 'Waiting for Client',
    dot: 'bg-foreground/70',
    border: '',
    bg: 'bg-secondary/60 hover:bg-secondary/90 text-foreground',
    badge: 'bg-secondary/80 text-foreground ',
    sign: 'Waiting Client',
  },
  'Review Required': {
    label: 'Review Required',
    dot: 'bg-foreground',
    border: '',
    bg: 'bg-secondary/75 hover:bg-secondary text-foreground',
    badge: 'bg-secondary text-foreground ',
    sign: 'Review Needed',
  },
  'Rework': {
    label: 'Rework Required',
    dot: 'bg-primary',
    border: '',
    bg: 'bg-primary/[0.06] hover:bg-primary/10 text-foreground',
    badge: 'bg-secondary text-foreground ',
    sign: 'Rework',
  },
  'Completed': {
    label: 'Completed / Approved',
    dot: 'bg-primary-foreground',
    border: '',
    bg: 'bg-secondary hover:bg-secondary/80 text-foreground',
    badge: 'bg-primary text-primary-foreground ',
    sign: 'Completed',
  },
  'Approved': {
    label: 'Approved',
    dot: 'bg-primary-foreground',
    border: '',
    bg: 'bg-secondary hover:bg-secondary/80 text-foreground',
    badge: 'bg-primary text-primary-foreground ',
    sign: 'Approved',
  },
};

export const TASK_PRIORITY_COLORS = {
  Urgent: {
    label: 'Urgent',
    dot: 'bg-primary',
    badge: 'bg-primary text-primary-foreground font-black ',
    pill: 'bg-primary text-primary-foreground ',
    sign: 'Urgent',
    borderLeft: ' ',
  },
  High: {
    label: 'High',
    dot: 'bg-foreground',
    badge: 'bg-secondary text-foreground font-bold',
    pill: 'bg-secondary text-foreground ',
    sign: 'High',
    borderLeft: ' ',
  },
  Medium: {
    label: 'Medium',
    dot: 'bg-muted-foreground',
    badge: 'bg-secondary/70 text-foreground font-semibold',
    pill: 'bg-secondary/70 text-foreground ',
    sign: 'Medium',
    borderLeft: '',
  },
  Low: {
    label: 'Low',
    dot: 'bg-muted-foreground/60',
    badge: 'bg-secondary/40 text-muted-foreground font-medium',
    pill: 'bg-secondary/40 text-muted-foreground ',
    sign: 'Low',
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

const downloadWeeklyReportPdf = async ({ report, range, employeeName }) => {
  const { default: jsPDF } = await import('jspdf');
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
          className="flex items-center justify-between gap-3 rounded-2xl bg-background px-3 py-2 text-sm transition-colors hover:bg-secondary/40"
        >
          <span className="flex min-w-0 items-center gap-3">
            {isImage ? (
              <img
                src={fileUrl}
                alt={file.name || 'Attachment preview'}
                className="h-12 w-12 shrink-0 rounded-xl object-cover"
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
      <DialogContent size="lg" noPadding hideCloseButton className="flex flex-col min-h-0 p-0 overflow-hidden bg-card w-[calc(100vw-24px)] max-w-3xl max-h-[90dvh]">
        <div className="flex flex-col min-h-0 h-full">
          {/* Pinned Header */}
          <div className="shrink-0 bg-card px-6 py-5 flex items-center justify-between gap-4 z-10">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate">
                  {task?.taskTitle || task?.title || 'Task Details'}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Review task details, delivery files, and confirm your response
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center text-[11px] font-medium text-muted-foreground/70 bg-muted/50 px-2 py-0.5 rounded-md">
                ESC
              </span>
              <DialogClose asChild>
                <button
                  type="button"
                  className="h-9 w-9 rounded-xl bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogClose>
            </div>
          </div>

          {/* Scrollable Linear Body */}
          <div className="space-y-6 p-6 sm:p-7 overflow-y-auto flex-1 min-h-0 custom-scrollbar overscroll-contain">
            {task ? (
              <div className="space-y-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-background p-4 ">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Task Category</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {task.taskCategory === 'non_content' ? 'Non-Content Task' : 'Content Task'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-background p-4 ">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Task Type</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{formatTaskTypeLabel(task.taskType)}</p>
                  </div>
                  <div className="rounded-xl bg-background p-4 ">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Assigned Person</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {task.assignedPersonName || task.assignedTo?.map((item) => item.name).join(', ') || 'Unassigned'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-background p-4 ">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Current Status</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{statusMeta.label}</p>
                  </div>
                </div>

                <div className="rounded-xl bg-background p-4 text-sm text-foreground ">
                  <p className="font-semibold text-sm">Progress Alert</p>
                  <p className="mt-1 text-sm text-muted-foreground">{statusMeta.alert}</p>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl bg-background p-4 ">
                    <p className="text-xs font-semibold text-foreground mb-1">Requirements</p>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {task.description || task.websiteRequirements || 'No requirements shared yet.'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-background p-4 ">
                    <p className="text-xs font-semibold text-foreground mb-1">Notes Visible To You</p>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {task.clientVisibleNotes || 'No client-visible notes available.'}
                    </p>
                  </div>
                </div>

                {task.taskCategory !== 'non_content' ? (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-background p-4 ">
                      <p className="text-xs font-semibold text-foreground mb-1">Script / Script Link</p>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {task.scriptText || task.scriptLink || 'No script shared.'}
                      </p>
                    </div>
                    <div className="rounded-xl bg-background p-4 ">
                      <p className="text-xs font-semibold text-foreground mb-1">Caption / Editor Guide</p>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{task.caption || 'No caption shared.'}</p>
                      {task.editorGuide ? <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{task.editorGuide}</p> : null}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-4">
                  <div className="rounded-xl bg-background p-4 ">
                    <p className="mb-2 text-xs font-semibold text-foreground">Attachments</p>
                    <FileLinks files={task.attachments || []} />
                  </div>
                  <div className="rounded-xl bg-background p-4 ">
                    <p className="mb-2 text-xs font-semibold text-foreground">Completed Files</p>
                    <FileLinks files={task.completedFiles || []} />
                  </div>
                </div>

                <ClientTaskResponsePanel task={task} onSubmitted={onSubmitted} compact />
              </div>
            ) : null}
          </div>

          {/* Pinned Sticky Footer */}
          <div className="shrink-0 bg-card px-6 py-4 flex items-center justify-between gap-3 z-10 select-none">
            <span className="text-xs text-muted-foreground hidden sm:inline">Press Esc to exit</span>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-11 px-5 rounded-xl hover:bg-muted text-sm font-medium w-full sm:w-auto"
            >
              Close
            </Button>
          </div>
        </div>
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
        'w-full rounded-2xl p-4 text-left transition-colors relative overflow-hidden cursor-pointer',
        statusTheme.border,
        statusTheme.bg,
        isUrgent && ' ring-1 ring-primary/30 bg-primary/[0.06]',
        isHigh && !isUrgent && ' ',
        task.isOverdue && ' bg-primary/[0.08]',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn('px-2.5 py-0.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5', statusTheme.badge)}>
              <span className={cn('h-2 w-2 rounded-full shrink-0', statusTheme.dot)} />
              <span>{normalizedStatus}</span>
            </span>

            {isUrgent ? (
              <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-primary text-primary-foreground inline-flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>URGENT</span>
              </span>
            ) : isHigh ? (
              <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-secondary text-foreground ">
                High Priority
              </span>
            ) : task.priority ? (
              <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-secondary text-muted-foreground ">
                {priorityTheme.sign || task.priority}
              </span>
            ) : null}

            <StatusBadge tone={categoryTone[task.taskCategory] || 'neutral'}>
              {task.taskCategory === 'non_content' ? 'Non-Content' : 'Content'}
            </StatusBadge>

            {task.isOverdue ? <StatusBadge tone="danger">Overdue</StatusBadge> : null}
          </div>

          <h3 className="mt-3 text-base font-bold text-foreground transition-colors">
            {task.taskTitle || task.title}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {task.description || task.websiteRequirements || task.scriptText || 'No requirements added yet.'}
          </p>
        </div>

        <div className="rounded-xl bg-card px-3 py-2 text-right shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Due Date</p>
          <p className="mt-0.5 text-xs font-black text-foreground tabular-nums">
            {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'No date'}
          </p>
        </div>
      </div>

      <div className="mt-3.5 grid gap-2.5 md:grid-cols-3">
        <div className="rounded-xl bg-background/80 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Client</p>
          <p className="mt-0.5 text-xs font-semibold text-foreground truncate">{task.client?.name || task.client?.company || task.clientName || 'No client linked'}</p>
        </div>
        <div className="rounded-xl bg-background/80 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assigned To</p>
          <p className="mt-0.5 text-xs font-semibold text-foreground truncate">
            {task.assignedPersonName || task.assignedTo?.map((item) => item.name).join(', ') || 'Unassigned'}
          </p>
        </div>
        <div className="rounded-xl bg-background/80 px-3 py-2">
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
  const canManageCalendar = ['superAdmin', 'admin', 'manager'].includes(user?.role);
  const canFilterAssignee = ['superAdmin', 'admin', 'manager'].includes(user?.role);
  const canFilterClientProject = ['superAdmin', 'admin', 'manager', 'employee'].includes(user?.role);
  const canLogDailyUpdates = EMPLOYEE_ROLES.includes(user?.role);
  const canDownloadWeeklyReport = canLogDailyUpdates || canManageCalendar;

  const { startDate: globalStartDate, endDate: globalEndDate, isDateInRange } = useDateFilter();

  // Auto-sync calendar view date when global navbar date changes
  useEffect(() => {
    if (globalStartDate) {
      const parsed = new Date(globalStartDate);
      if (!Number.isNaN(parsed.getTime())) {
        setCurrentDate(parsed);
      }
    }
  }, [globalStartDate]);

  const visibleRange = useMemo(() => getRangeForView(currentDate, view), [currentDate, view]);

  const queryFilters = useMemo(() => ({
    ...filters,
    search,
    parent: 'all',
    startDate: filters.startDate || globalStartDate || format(visibleRange.start, 'yyyy-MM-dd'),
    endDate: filters.endDate || globalEndDate || format(visibleRange.end, 'yyyy-MM-dd'),
  }), [filters, search, globalStartDate, globalEndDate, visibleRange]);

  const { data: calendarData, isLoading, refetch } = useTaskCalendar(queryFilters);
  const { data: employeeTasks = [] } = useTasks(
    { assignedTo: user?._id, parent: 'all', limit: 300 },
    { enabled: canLogDailyUpdates && !!user?._id },
  );
  const { data: clients = [] } = useClients({}, { enabled: canFilterClientProject });
  const { data: projects = [] } = useProjects({}, { enabled: canFilterClientProject });
  const { data: users = [] } = useUsers({ enabled: canFilterAssignee });

  const tasks = useMemo(
    () => (calendarData?.tasks || [])
      .filter((task) => isDateInRange(task.dueDate || task.startDate || task.createdAt))
      .map((task) => ({ ...task, status: normalizeTaskStatusLabel(task.status) })),
    [calendarData, isDateInRange],
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
    () => users.filter((person) => ['superAdmin', 'admin', 'manager', 'employee'].includes(person.role)),
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

    if (!dayTasks.length && canLogDailyUpdates && !canManageCalendar) {
      setSelectedDate(date);
      setShowDailyTaskDialog(true);
      return;
    }

    setSelectedDate(date);
    setShowDayDialog(true);
  };

  const renderMonthView = () => (
    <div className="responsive-table-container rounded-2xl bg-card ">
      <div className="min-w-[680px]">
        <div className="grid grid-cols-7 bg-secondary/40">
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
                  'min-h-[72px] sm:min-h-[80px] max-h-[105px] overflow-hidden p-1 sm:p-1.5 text-left align-top transition-colors focus:outline-none focus:ring-1 focus:ring-primary/30',
                  !inCurrentMonth && 'bg-secondary/15 opacity-55',
                  isDayToday && 'bg-primary/5 ring-1 ring-inset ring-primary/25',
                  dayTasks.length ? 'hover:bg-secondary/35' : 'hover:bg-secondary/15',
                )}
              >
                <div className="flex items-center justify-between gap-1 leading-none">
                  <div
                    className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-xs sm:text-sm font-black tracking-tight tabular-nums',
                      isDayToday
                        ? 'bg-primary text-primary-foreground font-black ring-1 ring-primary/40'
                        : inCurrentMonth
                        ? 'text-foreground font-black'
                        : 'text-muted-foreground font-bold',
                    )}
                  >
                    {format(day, 'd')}
                  </div>
                  {dayTasks.length ? (
                    <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-black text-foreground leading-none tabular-nums">
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
                          'group/task relative rounded-md px-1.5 py-0.5 text-left transition-colors cursor-pointer',
                          statusTheme.border,
                          statusTheme.bg,
                          isUrgent && ' ring-1 ring-primary/35 bg-primary/[0.07]',
                          isHigh && !isUrgent && ' ',
                          task.isOverdue && ' bg-primary/10',
                        )}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', statusTheme.dot)} />
                            <p className="truncate text-[10px] font-bold text-foreground transition-colors leading-tight">
                              {task.taskTitle || task.title}
                            </p>
                          </div>
                          {isUrgent ? (
                            <span className="shrink-0 px-1 py-0.5 rounded text-[8px] font-black bg-primary text-primary-foreground leading-none">
                              !
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}

                  {dayTasks.length > 2 ? (
                    <div className="text-[9px] font-black text-foreground px-0.5 leading-none tabular-nums">
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
      <div className="responsive-table-container rounded-[20px] ">
        <div className="min-w-[720px] space-y-1">
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
                'sticky top-0 z-10 flex items-center gap-3 bg-card px-4 py-2',
                dateKey !== 'no-date' && isToday(new Date(dateKey)) && 'bg-secondary ',
              )}>
                <div className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black tabular-nums',
                  dateKey !== 'no-date' && isToday(new Date(dateKey))
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground',
                )}>
                  {dateKey !== 'no-date' ? format(new Date(dateKey), 'd') : '—'}
                </div>
                <p className="text-xs font-bold text-foreground">{label}</p>
                <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground tabular-nums">
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
                      'w-full grid items-center gap-2 px-4 py-3 text-left transition-all hover:bg-secondary/30',
                      idx % 2 === 0 ? 'bg-background' : 'bg-secondary/10',
                      task.isOverdue && ' ',
                    )}
                    style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 100px' }}
                  >
                    {/* Title + Category */}
                    <div className="min-w-0 flex items-center gap-2">
                      <span className={cn(
                        'h-2 w-2 shrink-0 rounded-full',
                        task.taskCategory === 'content' ? 'bg-foreground' : 'bg-muted-foreground',
                      )} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{task.taskTitle || task.title}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{formatTaskTypeLabel(task.taskType)}</p>
                      </div>
                      {task.isOverdue && (
                        <span className="ml-1 shrink-0 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[9px] font-bold uppercase">Overdue</span>
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
                    <p className="text-right text-xs font-semibold text-foreground tabular-nums">
                      {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : '—'}
                    </p>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderWeekOrDayView = () => (
    <div className="grid gap-4 lg:grid-cols-7">
      {daysInView.map((day) => {
        const key = format(day, 'yyyy-MM-dd');
        const dayTasks = tasksByDate.get(key) || [];

        return (
          <div key={key} className={cn('rounded-[24px] bg-card p-4 ', view === 'day' && 'lg:col-span-7')}>
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
                <div className="rounded-2xl bg-background px-4 py-10 text-center text-sm text-muted-foreground">
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-card rounded-2xl p-3 ">
        {/* Left: Title + Date Range Period + Nav Arrows */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h1 className="text-base sm:text-lg font-black tracking-tight text-foreground">
              {isClient ? 'Client Calendar' : user?.role === 'employee' ? 'My Task Calendar' : 'Task Calendar'}
            </h1>
          </div>

          {/* Date Navigation & Period Label */}
          <div className="flex items-center gap-1.5 bg-secondary/50 rounded-xl p-0.5 ">
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
            <span className="text-xs font-black text-primary px-2 ">
              {toolbarTitle}
            </span>
          </div>
        </div>

        {/* Right: View Options + Action Button */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap w-full md:w-auto justify-between md:justify-end">
          <div className="inline-flex rounded-xl bg-secondary/40 p-0.5 overflow-x-auto max-w-full">
            {VIEW_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setView(value)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer shrink-0 min-h-[32px] sm:min-h-[36px]',
                  view === value
                    ? 'bg-primary text-primary-foreground font-black'
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
              className="h-8 rounded-xl text-xs font-bold gap-1 px-3 shrink-0"
            >
              <Plus size={14} className="stroke-[2.5]" />
              <span>Create Task</span>
            </Button>
          ) : null}
        </div>
      </div>

      {/* ── Compact Metric Badges & Search Ribbon ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 bg-card rounded-xl px-3 py-1.5 ">
        {/* Metric Badges */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-secondary text-foreground font-semibold">
            <CalendarDays size={12} className="text-muted-foreground shrink-0" />
            <span>Visible Tasks: <strong className="font-black text-sm tabular-nums">{summary.total}</strong></span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-secondary text-foreground font-semibold">
            <Clock3 size={12} className="text-muted-foreground shrink-0" />
            <span>Waiting for Client: <strong className="font-black text-sm tabular-nums">{summary.waitingForClient}</strong></span>
          </div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-secondary text-foreground font-semibold">
            <CheckCircle2 size={12} className="text-muted-foreground shrink-0" />
            <span>Completed / Approved: <strong className="font-black text-sm tabular-nums">{summary.completed}</strong></span>
          </div>
          <div className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg font-semibold',
            summary.overdue > 0
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground'
          )}>
            <TimerReset size={12} className="shrink-0" />
            <span>Overdue: <strong className="font-black text-sm tabular-nums">{summary.overdue}</strong></span>
          </div>
        </div>

        {/* Quick Search */}
        <div className="relative w-full lg:w-72">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search task titles, clients, scripts..."
            className="w-full h-7 rounded-lg bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
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

      {/* ── Filter Chips & Legend Bar ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 custom-scrollbar">
        <span className="text-[11px] font-bold text-muted-foreground shrink-0 inline-flex items-center gap-1 mr-1">
          <Filter size={12} className="text-foreground" /> Filter:
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
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer shrink-0 select-none',
                meta.badge,
                isSelected
                  ? 'ring-2 ring-primary ring-offset-1 font-black'
                  : 'hover:opacity-90'
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', meta.dot)} />
              <span>{meta.label}</span>
              <span className="ml-0.5 px-1 py-0.5 rounded-full text-[9px] font-black bg-foreground/10 tabular-nums">
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
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-colors cursor-pointer shrink-0 select-none',
                meta.pill,
                isSelected
                  ? 'ring-2 ring-primary ring-offset-1 font-black'
                  : 'hover:opacity-90'
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', meta.dot)} />
              <span>{meta.sign}</span>
              <span className="ml-0.5 px-1 py-0.5 rounded-full text-[9px] font-black bg-foreground/10 tabular-nums">
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
              <div key={item} className="h-32 animate-pulse rounded-2xl bg-secondary/50" />
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
        <DialogContent noPadding className="w-[calc(100vw-24px)] max-h-[90dvh] overflow-hidden p-0 sm:max-w-4xl">
          <div className="bg-card px-4 sm:px-6 py-4 sm:py-5">
            <DialogHeader className="mb-0 pb-0">
              <DialogTitle className="text-xl sm:text-2xl tracking-tight">
                {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Tasks'}
              </DialogTitle>
              <DialogDescription className="sr-only">
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
                    action={canManageCalendar ? (
                      <Button
                        onClick={() => {
                          setShowDayDialog(false);
                          navigate('/tasks/new');
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
                <div className="rounded-2xl bg-card p-5 ">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Do</p>
                  <ul className="mt-3 space-y-2.5 text-sm text-foreground">
                    {selectedDateGuidance.dos.map((item) => (
                      <li key={item} className="rounded-xl bg-secondary/50 px-3 py-2.5 flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-foreground shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl bg-card p-5 ">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Don&apos;t</p>
                  <ul className="mt-3 space-y-2.5 text-sm text-foreground">
                    {selectedDateGuidance.donts.map((item) => (
                      <li key={item} className="rounded-xl bg-secondary/35 px-3 py-2.5 flex items-start gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl bg-card p-5 ">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Work Process</p>
                  <ol className="mt-3 space-y-2.5 text-sm text-foreground">
                    {selectedDateGuidance.process.map((item, index) => (
                      <li key={item} className="flex items-start gap-3 rounded-xl bg-secondary/50 px-3 py-2.5">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground tabular-nums">
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
