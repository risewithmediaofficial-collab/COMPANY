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
  { value: 'list', label: 'List', icon: List },
];

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

  return (
    <button
      type="button"
      onClick={() => onOpen(task)}
      className="w-full rounded-[24px] border border-border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-md"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={categoryTone[task.taskCategory] || 'neutral'}>
              {task.taskCategory === 'non_content' ? 'Non-Content' : 'Content'}
            </StatusBadge>
            <StatusBadge tone={statusTone[normalizedStatus] || 'neutral'}>
              {normalizedStatus}
            </StatusBadge>
            <StatusBadge tone={priorityTone[task.priority] || 'neutral'}>
              {task.priority}
            </StatusBadge>
            {task.isOverdue ? <StatusBadge tone="danger">Overdue</StatusBadge> : null}
          </div>
          <h3 className="mt-3 text-base font-bold text-foreground">{task.taskTitle || task.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {task.description || task.websiteRequirements || task.scriptText || 'No requirements added yet.'}
          </p>
        </div>
        <div className="rounded-2xl bg-secondary px-3 py-2 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Due</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy') : 'No date'}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-secondary/20 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Client</p>
          <p className="mt-2 text-sm font-semibold text-foreground">{task.client?.name || task.client?.company || task.clientName || 'No client linked'}</p>
        </div>
        <div className="rounded-2xl border border-border bg-secondary/20 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Assigned To</p>
          <p className="mt-2 text-sm font-semibold text-foreground">
            {task.assignedPersonName || task.assignedTo?.map((item) => item.name).join(', ') || 'Unassigned'}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-secondary/20 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Project</p>
          <p className="mt-2 text-sm font-semibold text-foreground">{task.project?.name || task.projectName || 'No project linked'}</p>
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
    <div className="overflow-x-auto rounded-[24px] border border-border">
      <div className="min-w-[760px]">
      <div className="grid grid-cols-7 border-b border-border bg-secondary/40">
        {DAY_NAMES.map((day) => (
          <div key={day} className="px-2 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-sm">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {daysInView.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDate.get(key) || [];
          const inCurrentMonth = isSameMonth(day, currentDate);

          return (
            <button
              key={key}
              type="button"
              onClick={() => openDateDetails(day)}
              className={cn(
                'min-h-[132px] border-b border-r border-border p-2 text-left align-top transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 sm:min-h-[160px] sm:p-3',
                !inCurrentMonth && 'bg-secondary/20 text-muted-foreground',
                isToday(day) && 'bg-primary/5',
                dayTasks.length ? 'hover:bg-secondary/35' : 'hover:bg-secondary/20',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
                    isToday(day) ? 'bg-primary text-primary-foreground' : 'bg-transparent text-foreground',
                  )}
                >
                  {format(day, 'd')}
                </div>
                {dayTasks.length ? (
                  <span className="rounded-full bg-secondary px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                    {dayTasks.length}
                  </span>
                ) : null}
              </div>

              <div className="mt-3 space-y-2">
                {dayTasks.slice(0, 3).map((task) => (
                  <div
                    key={task._id}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleOpenTask(task);
                    }}
                    className="rounded-2xl border border-border bg-background/90 px-2.5 py-2 text-left shadow-sm transition-all hover:border-primary/30 hover:bg-background"
                  >
                    <p className="truncate text-xs font-semibold text-foreground">{task.taskTitle || task.title}</p>
                    <p className="mt-1 truncate text-[11px] text-muted-foreground">
                      {task.client?.name || task.clientName || formatTaskTypeLabel(task.taskType)}
                    </p>
                  </div>
                ))}

                {dayTasks.length > 3 ? (
                  <div className="text-xs font-semibold text-primary">+{dayTasks.length - 3} more tasks</div>
                ) : null}

                {!dayTasks.length ? (
                  <div className="pt-6 text-xs leading-5 text-muted-foreground">
                   
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
    <div className={cn('space-y-6', embedded && 'p-4 sm:p-6')}>
      <PageHeader
        title={isClient ? 'Client Task Calendar' : user?.role === 'employee' ? 'Assigned Task Calendar' : 'Task Calendar'}
        description={isClient
          ? 'Track only your own tasks with client-visible details, alerts, and approval actions.'
          : 'Switch between monthly, weekly, daily, and list views to manage deadlines, priorities, and follow-ups.'}
        actions={(
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <div className="grid grid-cols-4 rounded-2xl border border-border bg-card p-1 shadow-sm sm:inline-flex">
              {VIEW_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setView(value)}
                  className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all',
                    view === value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                  )}
                >
                  <Icon size={16} />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {canManageCalendar ? (
              <Button
                onClick={() => navigate('/tasks/new')}
                className="w-full justify-center sm:w-auto"
              >
                <Plus size={16} className="mr-2" />
                Create Task
              </Button>
            ) : null}
          </div>
        )}
      >
        <MetricGrid>
          <MetricCard label="Visible Tasks" value={summary.total} helper="Within your current calendar scope" icon={CalendarDays} tone="primary" />
          <MetricCard label="Waiting for Client" value={summary.waitingForClient} helper="Needs client action or feedback" icon={Clock3} tone="warning" />
          <MetricCard label="Completed / Approved" value={summary.completed} helper="Finished work in this view" icon={CheckCircle2} tone="success" />
          <MetricCard label="Overdue" value={summary.overdue} helper="Tasks that need immediate attention" icon={TimerReset} tone={summary.overdue > 0 ? 'danger' : 'neutral'} />
        </MetricGrid>
      </PageHeader>

      <CollapsibleFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search task titles, clients, scripts, website requirements, or notes..."
        activeFilterCount={Object.values(filters).filter(Boolean).length}
        onResetFilters={() => setFilters({ client: '', project: '', assignedTo: '', taskCategory: '', taskType: '', status: '', priority: '', startDate: '', endDate: '' })}
      >
        <div className="grid w-full gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {canFilterClientProject ? (
            <select
              value={filters.client}
              onChange={(event) => setFilters((current) => ({ ...current, client: event.target.value }))}
              className="app-select"
            >
              <option value="">All clients</option>
              {clients.map((client) => (
                <option key={client._id} value={client._id}>{client.name || client.company}</option>
              ))}
            </select>
          ) : null}

          {canFilterClientProject ? (
            <select
              value={filters.project}
              onChange={(event) => setFilters((current) => ({ ...current, project: event.target.value }))}
              className="app-select"
            >
              <option value="">All projects</option>
              {projects.map((project) => (
                <option key={project._id} value={project._id}>{project.name}</option>
              ))}
            </select>
          ) : null}

          {canFilterAssignee ? (
            <select
              value={filters.assignedTo}
              onChange={(event) => setFilters((current) => ({ ...current, assignedTo: event.target.value }))}
              className="app-select"
            >
              <option value="">All assignees</option>
              {assignableUsers.map((person) => (
                <option key={person._id} value={person._id}>{person.name}</option>
              ))}
            </select>
          ) : null}

          <select
            value={filters.taskCategory}
            onChange={(event) => setFilters((current) => ({ ...current, taskCategory: event.target.value, taskType: '' }))}
            className="app-select"
          >
            <option value="">All categories</option>
            {TASK_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <select
            value={filters.taskType}
            onChange={(event) => setFilters((current) => ({ ...current, taskType: event.target.value }))}
            className="app-select"
          >
            <option value="">All task types</option>
            {(filters.taskCategory === 'content'
              ? CONTENT_TASK_TYPE_OPTIONS
              : filters.taskCategory === 'non_content'
                ? NON_CONTENT_TASK_TYPE_OPTIONS
                : ALL_TASK_TYPES
            ).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
            className="app-select"
          >
            <option value="">All statuses</option>
            {TASK_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          <select
            value={filters.priority}
            onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}
            className="app-select"
          >
            <option value="">All priorities</option>
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          <div className="relative">
            <span className="absolute left-4 top-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">Start Date</span>
            <input
              type="date"
              value={filters.startDate}
              onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))}
              className="app-input pb-1.5 pt-5"
            />
          </div>

          <div className="relative">
            <span className="absolute left-4 top-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">End Date</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))}
              className="app-input pb-1.5 pt-5"
            />
          </div>
        </div>
      </CollapsibleFilterBar>



      <SectionCard
        title={toolbarTitle}
        description={isClient
          ? 'Only your own tasks and client-visible information are shown here.'
          : 'Open any task for details, progress, files, and status updates based on your role.'}
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate((current) => shiftDateByView(current, view, -1))}>
              <ChevronLeft size={16} />
            </Button>
            <Button variant="outline" onClick={() => setCurrentDate(new Date())}>Today</Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate((current) => shiftDateByView(current, view, 1))}>
              <ChevronRight size={16} />
            </Button>
          </div>
        )}
      >
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="h-40 animate-pulse rounded-[24px] border border-border bg-secondary/50" />
            ))}
          </div>
        ) : view === 'list' ? (
          listTasks.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {listTasks.map((task) => (
                <TaskSummaryCard key={task._id} task={task} onOpen={handleOpenTask} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No tasks found for this list view"
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
      </SectionCard>

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
