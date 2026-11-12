import React, { useEffect, useMemo, useState, useDeferredValue } from 'react';
import { useSelector } from 'react-redux';
import { useDebounce } from '../../hooks/useDebounce';
import {
  CheckCircle2,
  Clock,
  Plus,
  CheckSquare,
  AlertTriangle,
  ArrowRight,
  FileEdit,
  Share2,
  X,
  Calendar,
  RotateCcw,
  Sparkles,
  Globe,
  Palette,
  Film,
  Megaphone,
  Kanban,
  Video,
  Trash2,
  Edit2,
  Code2,
  Layers,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  User,
  Mic,
  Scissors,
  Smartphone,
  ShieldCheck,
  Search,
  Laptop,
  FileText,
  ListChecks,
  Maximize2,
  Minimize2,
} from '@/components/ui/muiIcons';
import { Link, useSearchParams } from 'react-router-dom';
import { getPersonColor, extractTaskAssignees, PersonAssigneeBadge } from '../../utils/personColors';
import { TaskDetailModal } from '../../components/ui/TaskDetailModal';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ui/page';
import { WorkspacePage } from '../../components/ui/WorkspacePage';
import { DatabaseView } from '../../components/ui/DatabaseView';
import { SelectDropdown } from '../../components/ui/SelectDropdown';
import { isCategoryMatch } from '../../utils/categoryColors';
import { TeamQuickAssignRoster } from '../../components/tasks/TeamQuickAssignRoster';
import { KanbanCreateTaskModal } from '../../components/tasks/KanbanCreateTaskModal';
import { TaskWorkflowDrawer } from '../../components/tasks/TaskWorkflowDrawer';
import { TasksKanbanPipeline } from '../../components/tasks/TasksKanbanPipeline';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useClients } from '../../hooks/useClients';
import { useDeleteTask, useTasks, useUpdateTaskStatus } from '../../hooks/useTasks';
import { useUsers } from '../../hooks/useUsers';
import PortalTasks from '../portal/sections/PortalTasks';
import { useDateFilter } from '../../context/DateFilterContext';
import {
  TASK_STATUS_OPTIONS,
  TEAM_STATUS_OPTIONS,
  formatTaskTypeLabel,
  normalizeTaskStatusLabel,
  isWebsiteTaskType,
} from '../../utils/taskFields';

export const isDevelopmentTask = (task) => {
  if (!task) return false;
  if (task.development?.isDevTask || task.isDevTask) return true;
  if (task.department === 'Development' || task.department === 'Engineering') return true;

  const type = String(task.taskType || '').toLowerCase();
  if ([
    'website_development',
    'website_update',
    'landing_page',
    'domain_hosting',
    'crm_update',
    'development_task',
    'bug_fix',
    'seo_work',
  ].includes(type)) {
    return true;
  }

  const projCat = String(task.project?.category || task.projectCategory || task.category || '').toLowerCase();
  if ([
    'web_development',
    'web_design',
    'saas_product',
    'saas',
    'internal_tool',
    'internal_product',
    'mobile_app',
    'e_commerce',
  ].includes(projCat)) {
    return true;
  }

  if (task.taskCategory === 'non_content') return true;

  const title = String(task.taskTitle || task.title || '').toLowerCase();
  if (
    title.includes('website') ||
    title.includes('web dev') ||
    title.includes('landing page') ||
    title.includes('frontend') ||
    title.includes('backend') ||
    title.includes('api') ||
    title.includes('database') ||
    title.includes('bug') ||
    title.includes('code') ||
    title.includes('software') ||
    title.includes('deploy')
  ) {
    return true;
  }

  return false;
};

export const isContentTask = (task) => {
  if (!task) return false;
  if (task.taskCategory === 'content') return true;

  const dept = String(task.department || '').toLowerCase();
  if (
    dept.includes('content') ||
    dept.includes('media') ||
    dept.includes('creative') ||
    dept.includes('design') ||
    dept.includes('market') ||
    dept.includes('smm')
  ) {
    return true;
  }

  const type = String(task.taskType || '').toLowerCase();
  if ([
    'reel',
    'poster',
    'social_media_post',
    'blog',
    'ad_creative',
    'video_content',
    'story',
    'carousel_post',
    'custom_content',
    'video',
  ].includes(type)) {
    return true;
  }

  const projCat = String(task.project?.category || task.projectCategory || task.category || '').toLowerCase();
  if ([
    'social_media',
    'video_content',
    'video',
    'graphic_design',
    'branding',
    'content',
    'paid_ads',
  ].includes(projCat)) {
    return true;
  }

  if (
    task.contentType ||
    task.videoType ||
    task.videographerAssigned ||
    task.editorAssigned ||
    task.publisherAssigned ||
    task.rawFootageLink ||
    (task.postingPlatforms && task.postingPlatforms.length > 0)
  ) {
    return true;
  }

  const title = String(task.taskTitle || task.title || '').toLowerCase();
  if (
    title.includes('reel') ||
    title.includes('poster') ||
    title.includes('video') ||
    title.includes('shoot') ||
    title.includes('post') ||
    title.includes('thumbnail') ||
    title.includes('script') ||
    title.includes('caption') ||
    title.includes('creative')
  ) {
    return true;
  }

  return !isDevelopmentTask(task);
};

export const DEV_CATEGORY_PILLS = [
  { key: 'all', label: 'All Dev Deliverables', icon: CheckSquare },
  { key: 'web_development', label: 'Website / Web Dev', icon: Globe },
  { key: 'saas_product', label: 'SaaS / Software', icon: Sparkles },
  { key: 'web_design', label: 'Web Design / UI-UX', icon: Palette },
  { key: 'seo', label: 'SEO & Search', icon: Sparkles },
];

export const CONTENT_CATEGORY_PILLS = [
  { key: 'all', label: 'All Content Deliverables', icon: CheckSquare },
  { key: 'social_media', label: 'Social Media / SMM', icon: Share2 },
  { key: 'reel', label: 'Reels / Shorts', icon: Film },
  { key: 'video_content', label: 'Video Production', icon: Video },
  { key: 'branding', label: 'Branding & Design', icon: Palette },
  { key: 'poster', label: 'Graphic / Poster', icon: Palette },
  { key: 'content', label: 'Content / Script', icon: FileEdit },
  { key: 'paid_ads', label: 'Paid Ads', icon: Megaphone },
];

export const TASK_CATEGORY_PILLS = [
  { key: 'all', label: 'All Deliverables', icon: CheckSquare },
  { key: 'web_development', label: 'Website / Dev', icon: Globe },
  { key: 'social_media', label: 'Social Media / SMM', icon: Share2 },
  { key: 'reel', label: 'Reels / Shorts', icon: Film },
  { key: 'video_content', label: 'Video Production', icon: Video },
  { key: 'branding', label: 'Branding & Design', icon: Palette },
  { key: 'poster', label: 'Graphic / Poster', icon: Palette },
  { key: 'paid_ads', label: 'Paid Ads', icon: Megaphone },
  { key: 'seo', label: 'SEO & Search', icon: Sparkles },
  { key: 'saas_product', label: 'SaaS / Software', icon: Sparkles },
  { key: 'content', label: 'Content / Script', icon: FileEdit },
];

export const TASK_SORT_OPTIONS = [
  { value: 'dueDate_asc', label: 'Due Date: Earliest First' },
  { value: 'dueDate_desc', label: 'Due Date: Latest First' },
  { value: 'priority_desc', label: 'Priority: High to Low' },
  { value: 'priority_asc', label: 'Priority: Low to High' },
  { value: 'client_asc', label: 'Client: A to Z' },
  { value: 'client_desc', label: 'Client: Z to A' },
  { value: 'category_asc', label: 'Category: A to Z' },
  { value: 'newest', label: 'Recently Created' },
  { value: 'oldest', label: 'Oldest Created' },
];

const DEV_STAGE_SHORT_LABELS = {
  backlog: 'Backlog',
  analysis: 'Analysis',
  ready_for_dev: 'Ready',
  in_development: 'In Dev',
  code_review: 'Review',
  qa_testing: 'QA',
  client_uat: 'UAT',
  approved: 'Approved',
  deployment: 'Deploy',
  live: 'Live',
  closed: 'Closed',
  blocked: 'Blocked',
};

const priorityTone = {
  Low: 'neutral',
  Medium: 'info',
  High: 'warning',
  Urgent: 'danger',
};

const Tasks = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState(null);
  const [currentView, setCurrentView] = useState('board'); // 'board' | 'table'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showTodayTray, setShowTodayTray] = useState(true);
  const [sortBy, setSortBy] = useState('dueDate_asc');
  const [filters, setFilters] = useState({
    search: '',
    client: '',
    assignedTo: '',
    status: '',
    taskType: '',
    priority: '',
    dueDate: '',
  });

  const deferredSearch = useDeferredValue(filters.search);
  const debouncedSearch = useDebounce(filters.search, 300);

  const queryFilters = useMemo(
    () => ({
      client: filters.client,
      assignedTo: filters.assignedTo,
      status: filters.status,
      taskType: filters.taskType,
      priority: filters.priority,
      dueDate: filters.dueDate,
      sortBy: sortBy,
      search: debouncedSearch,
      limit: 300,
      parent: 'all',
    }),
    [
      filters.client,
      filters.assignedTo,
      filters.status,
      filters.taskType,
      filters.priority,
      filters.dueDate,
      sortBy,
      debouncedSearch,
    ]
  );

  const { user } = useSelector((state) => state.auth);
  const isEmployee = user?.role === 'employee';
  const isClient = user?.role === 'client';
  const isManager = user?.role === 'manager';
  const { data: tasks = [], isLoading, refetch } = useTasks(queryFilters);
  const { data: clients = [] } = useClients();
  const { data: users = [] } = useUsers();
  const deleteTaskMutation = useDeleteTask();
  const updateStatusMutation = useUpdateTaskStatus();

  // Kanban Flow State
  const [showKanbanCreateModal, setShowKanbanCreateModal] = useState(false);
  const [preSelectedEmployee, setPreSelectedEmployee] = useState(null);
  const [createTaskInitialValues, setCreateTaskInitialValues] = useState(null);
  const [workflowTaskId, setWorkflowTaskId] = useState(null);
  const [showWorkflowDrawer, setShowWorkflowDrawer] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [expandedMobileTaskIds, setExpandedMobileTaskIds] = useState({});

  const toggleMobileTaskExpand = (e, taskId) => {
    e.stopPropagation();
    setExpandedMobileTaskIds((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  useEffect(() => {
    const tabParam = searchParams.get('tab') || searchParams.get('team');
    if (tabParam === 'content' || tabParam === 'smm') {
      setDepartmentFilter('content');
    } else if (tabParam === 'non_content' || tabParam === 'tech' || tabParam === 'development' || tabParam === 'dev') {
      setDepartmentFilter('non_content');
    } else if (tabParam === 'all') {
      setDepartmentFilter('all');
    }
  }, [searchParams]);

  const activeWorkflowTask = useMemo(() => {
    if (!workflowTaskId) return null;
    return tasks.find((t) => t._id === workflowTaskId) || null;
  }, [tasks, workflowTaskId]);

  const handleOpenWorkflowDrawer = (task) => {
    setWorkflowTaskId(task._id);
    setShowWorkflowDrawer(true);
  };

  const handleQuickAssignEmployee = (employee) => {
    setPreSelectedEmployee(employee);
    setCreateTaskInitialValues(null);
    setShowKanbanCreateModal(true);
  };

  const handleOpenCreateGeneral = () => {
    setPreSelectedEmployee(null);
    setCreateTaskInitialValues(null);
    setShowKanbanCreateModal(true);
  };

  const handleDepartmentFilterChange = (filterType) => {
    setDepartmentFilter(filterType);
    setCategoryFilter('all');
  };

  const { startDate: globalStartDate, endDate: globalEndDate, isDateInRange, isFiltered: isGlobalDateFiltered, resetDateFilter } = useDateFilter();

  const normalizedTasks = useMemo(
    () =>
      tasks.map((task) => ({
        ...task,
        status: normalizeTaskStatusLabel(task.status),
      })),
    [tasks],
  );

  // Today's Tasks filtered by role:
  // Admin / SuperAdmin: Agency-wide all tasks due / scheduled today across team
  // Employee: Only deliverables where they are assigned for today
  const todayTasks = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    return normalizedTasks.filter((task) => {
      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
      const shootDate = task.shootDate ? new Date(task.shootDate) : null;
      const postDate = task.postingScheduleDate ? new Date(task.postingScheduleDate) : null;
      const editDueDate = task.editDueDate ? new Date(task.editDueDate) : null;
      const createdDate = task.createdAt ? new Date(task.createdAt) : null;

      const isScheduledToday = (
        (dueDate && dueDate >= startOfToday && dueDate <= endOfToday) ||
        (shootDate && shootDate >= startOfToday && shootDate <= endOfToday) ||
        (postDate && postDate >= startOfToday && postDate <= endOfToday) ||
        (editDueDate && editDueDate >= startOfToday && editDueDate <= endOfToday) ||
        (createdDate && createdDate >= startOfToday && createdDate <= endOfToday)
      );

      if (!isScheduledToday) return false;

      // Role isolation:
      // For employee: only tasks assigned to them (primary assignee, scriptwriter, videographer, editor, designer, voice artist, publisher)
      if (user?.role === 'employee') {
        const userId = user._id ? user._id.toString() : '';
        const assignees = extractTaskAssignees(task);
        const isAssigned = (
          assignees.some((p) => (p._id && p._id.toString() === userId) || p.name === user?.name) ||
          (task.assignedTo && Array.isArray(task.assignedTo) && task.assignedTo.some((u) => (u?._id ? u._id.toString() : u?.toString()) === userId)) ||
          (task.scriptWriterAssigned && (task.scriptWriterAssigned._id?.toString() === userId || task.scriptWriterAssigned.toString() === userId)) ||
          (task.voiceArtistAssigned && (task.voiceArtistAssigned._id?.toString() === userId || task.voiceArtistAssigned.toString() === userId)) ||
          (task.videographerAssigned && (task.videographerAssigned._id?.toString() === userId || task.videographerAssigned.toString() === userId)) ||
          (task.editorAssigned && (task.editorAssigned._id?.toString() === userId || task.editorAssigned.toString() === userId)) ||
          (task.publisherAssigned && (task.publisherAssigned._id?.toString() === userId || task.publisherAssigned.toString() === userId)) ||
          (task.designerAssigned && (task.designerAssigned._id?.toString() === userId || task.designerAssigned.toString() === userId))
        );
        return isAssigned;
      }

      // For admin & superAdmin & manager: all tasks across the company for today
      return true;
    });
  }, [normalizedTasks, user]);

  const isTaskOverdue = (task) => {
    if (!task) return false;
    const isDone = ['Completed', 'Approved', 'done', 'completed'].includes(task.status);
    if (isDone) return false;
    if (task.isOverdue) return true;

    // Check completion timer expiry
    if (task.timerExpiresAt) {
      const exp = new Date(task.timerExpiresAt);
      if (!Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
        return true;
      }
    }

    if (!task.dueDate) return false;
    const due = new Date(task.dueDate);
    if (Number.isNaN(due.getTime())) return false;
    return due < new Date();
  };

  const dateFilteredTasks = useMemo(() => {
    // Only filter by date if user has explicitly chosen an active date range
    if (globalStartDate || globalEndDate) {
      return normalizedTasks.filter((task) =>
        isDateInRange([
          task.dueDate,
          task.postingScheduleDate,
          task.startDate,
          task.createdAt,
        ])
      );
    }
    return normalizedTasks;
  }, [normalizedTasks, globalStartDate, globalEndDate, isDateInRange]);

  // Department partition counts across the entire current date-filtered set
  const taskCountsByDepartment = useMemo(() => ({
    all: dateFilteredTasks.length,
    content: dateFilteredTasks.filter(isContentTask).length,
    non_content: dateFilteredTasks.filter((t) => !isContentTask(t)).length,
  }), [dateFilteredTasks]);

  // Tasks filtered by high-level team department (All | Content | Non-Content)
  const departmentFilteredTasks = useMemo(() => {
    if (departmentFilter === 'content') {
      return dateFilteredTasks.filter(isContentTask);
    }
    if (departmentFilter === 'non_content') {
      return dateFilteredTasks.filter((t) => !isContentTask(t));
    }
    return dateFilteredTasks;
  }, [dateFilteredTasks, departmentFilter]);

  const taskMetrics = useMemo(() => ({
    total: departmentFilteredTasks.length,
    inProgress: departmentFilteredTasks.filter((task) => ['On Process', 'in_progress', 'on_process'].includes(task.status)).length,
    done: departmentFilteredTasks.filter((task) => ['Completed', 'Approved', 'done', 'completed'].includes(task.status)).length,
    overdue: departmentFilteredTasks.filter(isTaskOverdue).length,
    overTarget: departmentFilteredTasks.filter((task) => task.isOverTarget).length,
  }), [departmentFilteredTasks]);

  const [quickFilter, setQuickFilter] = useState('all'); // 'all' | 'inProgress' | 'done' | 'overdue' | 'overTarget'

  const handleQuickFilterChange = (filterType) => {
    setQuickFilter((prev) => (prev === filterType ? 'all' : filterType));
  };

  // Category pills adaptive to active department
  const currentCategoryPills = useMemo(() => {
    if (departmentFilter === 'content') return CONTENT_CATEGORY_PILLS;
    if (departmentFilter === 'non_content') return DEV_CATEGORY_PILLS;
    return TASK_CATEGORY_PILLS;
  }, [departmentFilter]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: departmentFilteredTasks.length };
    departmentFilteredTasks.forEach((t) => {
      currentCategoryPills.forEach((pill) => {
        if (pill.key !== 'all' && isCategoryMatch(t.taskType || t.taskCategory, pill.key, t.taskTitle || t.title)) {
          counts[pill.key] = (counts[pill.key] || 0) + 1;
        }
      });
    });
    return counts;
  }, [departmentFilteredTasks, currentCategoryPills]);

  const activeCategoryPills = useMemo(() => {
    return currentCategoryPills.map((pill) => ({
      ...pill,
      count: pill.key === 'all' ? departmentFilteredTasks.length : (categoryCounts[pill.key] || 0),
    }));
  }, [departmentFilteredTasks, categoryCounts, currentCategoryPills]);

  const clientOptions = useMemo(() => {
    return clients.map((c) => ({
      value: c._id,
      label: c.company ? `${c.name} (${c.company})` : c.name,
    }));
  }, [clients]);

  const userOptions = useMemo(() => {
    return users.map((u) => ({
      value: u.name,
      label: u.name,
    }));
  }, [users]);

  // Active filters counter
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (departmentFilter !== 'all') count++;
    if (categoryFilter !== 'all') count++;
    if (filters.client) count++;
    if (filters.priority) count++;
    if (filters.status) count++;
    if (filters.assignedTo) count++;
    if (filters.search) count++;
    if (quickFilter !== 'all') count++;
    if (isGlobalDateFiltered || globalStartDate || globalEndDate) count++;
    return count;
  }, [departmentFilter, categoryFilter, filters, quickFilter, isGlobalDateFiltered, globalStartDate, globalEndDate]);

  const clearAllFilters = () => {
    setDepartmentFilter('all');
    setCategoryFilter('all');
    setQuickFilter('all');
    setSortBy('dueDate_asc');
    resetDateFilter();
    setFilters({
      search: '',
      client: '',
      assignedTo: '',
      status: '',
      taskType: '',
      priority: '',
      dueDate: '',
    });
  };

  const displayedTasks = useMemo(() => {
    let result = [...departmentFilteredTasks];

    // Category filter
    if (categoryFilter && categoryFilter !== 'all') {
      result = result.filter((task) =>
        isCategoryMatch(task.taskType || task.taskCategory, categoryFilter, task.taskTitle || task.title)
      );
    }

    // Client filter
    if (filters.client) {
      result = result.filter((task) => {
        const cId = task.client?._id || task.client;
        return String(cId) === String(filters.client);
      });
    }

    // Priority filter
    if (filters.priority) {
      result = result.filter((task) => (task.priority || 'Medium') === filters.priority);
    }

    // Assigned To filter
    if (filters.assignedTo) {
      result = result.filter((task) => {
        const assignees = extractTaskAssignees(task);
        return assignees.some((p) => p.name === filters.assignedTo || p._id === filters.assignedTo);
      });
    }

    // Status filter - only filter in table view so Kanban board always shows tasks in all stages
    if (filters.status && currentView === 'table') {
      result = result.filter((task) => task.status === filters.status);
    }

    // Quick metric filters
    if (quickFilter === 'inProgress') {
      result = result.filter((task) => ['On Process', 'in_progress', 'on_process'].includes(task.status));
    } else if (quickFilter === 'done') {
      result = result.filter((task) => ['Completed', 'Approved', 'done', 'completed'].includes(task.status));
    } else if (quickFilter === 'overdue') {
      result = result.filter(isTaskOverdue);
    } else if (quickFilter === 'overTarget' || filters.overTarget) {
      result = result.filter((task) => task.isOverTarget);
    }

    // Search query
    if (deferredSearch?.trim()) {
      const q = deferredSearch.toLowerCase().trim();
      result = result.filter((task) =>
        (task.taskTitle || task.title || '').toLowerCase().includes(q) ||
        (task.client?.name || task.client?.company || task.clientName || '').toLowerCase().includes(q) ||
        (task.description || '').toLowerCase().includes(q) ||
        (task.status || '').toLowerCase().includes(q)
      );
    }

    // Sorting
    const priorityWeights = { Critical: 4, Urgent: 4, High: 3, Medium: 2, Low: 1 };
    result.sort((a, b) => {
      if (sortBy === 'dueDate_asc') {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return dateA - dateB;
      }
      if (sortBy === 'dueDate_desc') {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : -Infinity;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : -Infinity;
        return dateB - dateA;
      }
      if (sortBy === 'priority_desc') {
        return (priorityWeights[b.priority] || 2) - (priorityWeights[a.priority] || 2);
      }
      if (sortBy === 'priority_asc') {
        return (priorityWeights[a.priority] || 2) - (priorityWeights[b.priority] || 2);
      }
      if (sortBy === 'client_asc') {
        const nameA = (a.client?.company || a.client?.name || a.clientName || '').toLowerCase();
        const nameB = (b.client?.company || b.client?.name || b.clientName || '').toLowerCase();
        return nameA.localeCompare(nameB);
      }
      if (sortBy === 'client_desc') {
        const nameA = (a.client?.company || a.client?.name || a.clientName || '').toLowerCase();
        const nameB = (b.client?.company || b.client?.name || b.clientName || '').toLowerCase();
        return nameB.localeCompare(nameA);
      }
      if (sortBy === 'category_asc') {
        const catA = (a.taskCategory || a.taskType || '').toLowerCase();
        const catB = (b.taskCategory || b.taskType || '').toLowerCase();
        return catA.localeCompare(catB);
      }
      if (sortBy === 'oldest') {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      }
      // default: newest
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return result;
  }, [departmentFilteredTasks, categoryFilter, filters, deferredSearch, quickFilter, sortBy, currentView]);

  const columns = [
    {
      key: 'title',
      label: 'Task Title',
      render: (row) => (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-foreground text-xs hover:text-foreground/80 transition-colors">
            <span className="truncate">{row.taskTitle || row.title}</span>
            {row.isOverTarget && (
              <span className="inline-flex items-center gap-1 rounded bg-primary px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary-foreground shrink-0">
                <AlertTriangle size={9} />
                <span>Over Task</span>
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground truncate">
            {row.client?.name || row.client?.company || row.clientName || 'Internal Task'}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Type',
      render: (row) => (
        <span className="px-2 py-0.5 rounded-lg bg-secondary text-[11px] font-medium text-foreground">
          {formatTaskTypeLabel(row.taskType) || 'General'}
        </span>
      ),
    },
    {
      key: 'assignedTo',
      label: 'Production Assignees',
      render: (row) => {
        const assignees = extractTaskAssignees(row);
        return (
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-1">
              {assignees.length > 0 ? (
                assignees.map((person, idx) => (
                  <PersonAssigneeBadge key={idx} person={person} size="sm" />
                ))
              ) : (
                <span className="text-xs text-muted-foreground italic">Unassigned</span>
              )}
            </div>
            {(row.scriptWriterAssigned || row.voiceArtistAssigned || row.videographerAssigned || row.editorAssigned || row.publisherAssigned) && (
              <div className="flex flex-wrap gap-1 text-[10px]">
                {row.scriptWriterAssigned && (() => {
                  const name = row.scriptWriterAssigned.name || row.scriptWriterName || 'Writer';
                  const c = getPersonColor(name);
                  return (
                    <span className={`px-1.5 py-0.5 rounded-md font-semibold inline-flex items-center gap-1 ${c.bg} ${c.text} ${c.border}`}>
                      <FileEdit size={10} />
                      <span>{name}</span>
                    </span>
                  );
                })()}
                {row.voiceArtistAssigned && (() => {
                  const name = row.voiceArtistAssigned.name || row.voiceArtistName || 'RJ / Voice';
                  const c = getPersonColor(name);
                  return (
                    <span className={`px-1.5 py-0.5 rounded-md font-semibold inline-flex items-center gap-1 ${c.bg} ${c.text} ${c.border}`}>
                      <Mic size={10} />
                      <span>{name}</span>
                    </span>
                  );
                })()}
                {row.videographerAssigned && (() => {
                  const name = row.videographerAssigned.name || row.videographerName || 'Videographer';
                  const c = getPersonColor(name);
                  return (
                    <span className={`px-1.5 py-0.5 rounded-md font-semibold inline-flex items-center gap-1 ${c.bg} ${c.text} ${c.border}`}>
                      <Video size={10} />
                      <span>{name}</span>
                    </span>
                  );
                })()}
                {row.editorAssigned && (() => {
                  const name = row.editorAssigned.name || row.editorName || 'Editor';
                  const c = getPersonColor(name);
                  return (
                    <span className={`px-1.5 py-0.5 rounded-md font-semibold inline-flex items-center gap-1 ${c.bg} ${c.text} ${c.border}`}>
                      <Scissors size={10} />
                      <span>{name}</span>
                    </span>
                  );
                })()}
                {row.publisherAssigned && (() => {
                  const name = row.publisherAssigned.name || row.publisherName || 'Publisher';
                  const c = getPersonColor(name);
                  return (
                    <span className={`px-1.5 py-0.5 rounded-md font-semibold inline-flex items-center gap-1 ${c.bg} ${c.text} ${c.border}`}>
                      <Smartphone size={10} />
                      <span>{name}</span>
                    </span>
                  );
                })()}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <select
          value={row.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => updateStatusMutation.mutate({ id: row._id, status: e.target.value })}
          className="rounded-xl bg-background px-2.5 py-1 text-xs font-semibold text-foreground outline-none transition-all focus:ring-2 focus:ring-primary/15 cursor-pointer"
        >
          {(isEmployee ? TEAM_STATUS_OPTIONS : TASK_STATUS_OPTIONS).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (row) => (
        <StatusBadge tone={priorityTone[row.priority] || 'neutral'}>
          {row.priority || 'Medium'}
        </StatusBadge>
      ),
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      render: (row) => {
        const overdue = isTaskOverdue(row);
        return (
          <div className="flex items-center gap-1.5 tabular-nums">
            <span className={`text-[11px] font-medium ${overdue ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
              {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '—'}
            </span>
            {overdue && (
              <span className="px-1.5 py-0.5 rounded-md bg-primary text-[9px] font-bold text-primary-foreground shrink-0">
                Overdue
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'timer',
      label: 'Timer / Status',
      render: (row) => {
        const hasTimer = Boolean(
          (row.allocatedHours && row.allocatedHours > 0) ||
          (row.allocatedMinutes && row.allocatedMinutes > 0) ||
          row.timerExpiresAt
        );

        if (!hasTimer && !row.completionReason) {
          return <span className="text-[11px] text-muted-foreground">—</span>;
        }

        const overdue = isTaskOverdue(row);

        return (
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {hasTimer && (
                <span className="text-[11px] font-semibold text-foreground inline-flex items-center gap-1 tabular-nums">
                  <Clock size={11} className="text-muted-foreground" />
                  {row.allocatedHours || 0}h {row.allocatedMinutes || 0}m
                </span>
              )}
              {row.isAccepted && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-secondary text-foreground ">
                  Accepted
                </span>
              )}
              {overdue && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary text-primary-foreground ">
                  <AlertTriangle size={9} />
                  <span>Overdue</span>
                </span>
              )}
            </div>
            {row.completionReason && (
              <p className="text-[10px] text-muted-foreground truncate max-w-[150px] inline-flex items-center gap-1" title={row.completionReason}>
                <FileText size={10} className="shrink-0" />
                <span className="truncate">{row.completionReason}</span>
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'createdAt',
      label: 'Created Date',
      render: (row) => (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground whitespace-nowrap tabular-nums">
          <Calendar size={11} className="text-muted-foreground shrink-0" />
          <span>
            {row.createdAt
              ? new Date(row.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
              : '—'}
          </span>
        </div>
      ),
    },
  ];

  const handleDeleteTask = async () => {
    if (deleteTaskId) {
      await deleteTaskMutation.mutateAsync(deleteTaskId);
      setDeleteTaskId(null);
    }
  };

  const openTaskDetail = (taskId) => {
    setSelectedTaskId(taskId);
    setShowTaskDetail(true);
  };

  const handleRowClick = (task) => {
    handleOpenWorkflowDrawer(task);
  };

  useEffect(() => {
    const openTaskId = searchParams.get('open');
    if (!openTaskId) return;
    setWorkflowTaskId(openTaskId);
    setShowWorkflowDrawer(true);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('open');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  if (isClient) {
    return <PortalTasks />;
  }

  const canCreate = !isEmployee && ['superAdmin', 'admin', 'manager', 'organizationOwner'].includes(user?.role);
  const canDelete = ['superAdmin', 'admin', 'manager', 'organizationOwner'].includes(user?.role);

  return (
    <WorkspacePage
      title={isEmployee ? 'My Assigned Deliverables' : 'Tasks Database'}
      icon={CheckSquare}
      breadcrumbs={[{ name: 'Delivery', path: '/tasks' }, { name: 'Tasks Database' }]}
      actions={
        canCreate && (
          <Button
            size="sm"
            onClick={handleOpenCreateGeneral}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl transition-all hover:bg-primary/90 min-h-[38px] cursor-pointer"
          >
            <Plus size={15} className="mr-1 stroke-[2.5]" />
            New Task
          </Button>
        )
      }
      properties={
        <div className="flex flex-wrap items-center gap-2">
          {/* Total Tasks */}
          <button
            type="button"
            onClick={() => handleQuickFilterChange('all')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none tabular-nums ${
              quickFilter === 'all'
                ? 'bg-primary text-primary-foreground ring-2 ring-primary/20'
                : 'bg-card text-foreground hover:bg-secondary/80'
            }`}
          >
            <CheckSquare size={13} />
            <span>Total Tasks: {taskMetrics.total}</span>
          </button>

          {/* In Process */}
          <button
            type="button"
            onClick={() => handleQuickFilterChange('inProgress')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none tabular-nums ${
              quickFilter === 'inProgress'
                ? 'bg-primary text-primary-foreground ring-2 ring-primary/20'
                : 'bg-card text-foreground hover:bg-secondary/80'
            }`}
          >
            <Clock size={13} />
            <span>In Process: {taskMetrics.inProgress}</span>
          </button>

          {/* Completed */}
          <button
            type="button"
            onClick={() => handleQuickFilterChange('done')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none tabular-nums ${
              quickFilter === 'done'
                ? 'bg-primary text-primary-foreground ring-2 ring-primary/20'
                : 'bg-card text-foreground hover:bg-secondary/80'
            }`}
          >
            <CheckCircle2 size={13} />
            <span>Completed: {taskMetrics.done}</span>
          </button>

          {/* Overdue */}
          <button
            type="button"
            onClick={() => handleQuickFilterChange('overdue')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none tabular-nums ${
              quickFilter === 'overdue'
                ? 'bg-primary text-primary-foreground ring-2 ring-primary/20'
                : taskMetrics.overdue > 0
                ? 'bg-secondary text-foreground hover:bg-secondary/80'
                : 'bg-card text-muted-foreground hover:bg-secondary/80'
            }`}
          >
            <AlertTriangle size={13} />
            <span>Overdue: {taskMetrics.overdue}</span>
          </button>

          {/* Over Target */}
          {taskMetrics.overTarget > 0 && (
            <button
              type="button"
              onClick={() => handleQuickFilterChange('overTarget')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer select-none tabular-nums ${
                quickFilter === 'overTarget'
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary/20'
                  : 'bg-secondary text-foreground hover:bg-secondary/80'
              }`}
            >
              <AlertTriangle size={13} />
              <span>Over Target: {taskMetrics.overTarget}</span>
            </button>
          )}

          {/* Clear Filter pill if filtered */}
          {quickFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setQuickFilter('all')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 transition-all cursor-pointer"
            >
              <X size={13} />
              <span>Clear Filter</span>
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Team Quick Assign Roster categorized by Media / Developer / SMM / Management - for managers/admins */}
        {canCreate && (
          <TeamQuickAssignRoster
            users={users}
            tasks={tasks}
            onQuickAssign={handleQuickAssignEmployee}
            canCreate={canCreate}
          />
        )}

        {/* ── TODAY'S DELIVERABLES OVERVIEW (Agency-Wide for Admin/SuperAdmin, Personal for Employee) ── */}
        <div className="rounded-2xl bg-card p-4 sm:p-5 space-y-3.5 transition-all">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-foreground shrink-0">
                <Calendar size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight">
                    Today&apos;s Deliverables &amp; Action Items
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-secondary text-foreground tabular-nums">
                    {todayTasks.length} {todayTasks.length === 1 ? 'Task' : 'Tasks'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowTodayTray((prev) => !prev)}
                className="p-1.5 rounded-xl bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                title={showTodayTray ? 'Collapse overview' : 'Expand overview'}
              >
                {showTodayTray ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>

          {showTodayTray && (
            <>
              {todayTasks.length === 0 ? (
                <div className="p-5 text-center rounded-xl bg-secondary/40 text-xs text-muted-foreground">
                  <p className="font-semibold text-foreground">No deliverables today</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {todayTasks.map((t) => {
                    const assignees = extractTaskAssignees(t);
                    const overdue = isTaskOverdue(t);
                    return (
                      <div
                        key={t._id}
                        className="p-3.5 rounded-xl bg-background transition-all flex flex-col justify-between space-y-3 relative group"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-secondary text-foreground">
                              {formatTaskTypeLabel(t.taskType) || 'Task'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {overdue && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary text-primary-foreground ">
                                  <AlertTriangle size={9} />
                                  <span>Overdue</span>
                                </span>
                              )}
                              <StatusBadge tone={priorityTone[t.priority] || 'neutral'}>
                                {t.priority || 'Medium'}
                              </StatusBadge>
                            </div>
                          </div>

                          <h4
                            onClick={() => handleOpenWorkflowDrawer(t)}
                            className="font-bold text-foreground text-xs hover:text-foreground/80 transition-colors cursor-pointer line-clamp-2 leading-snug"
                            title={t.taskTitle || t.title}
                          >
                            {t.taskTitle || t.title}
                          </h4>

                          <div className="text-[11px] text-muted-foreground truncate">
                            {t.client?.name || t.client?.company || t.clientName || 'Internal Task'}
                          </div>

                          {/* Assignees and Role Badges */}
                          <div className="flex flex-wrap items-center gap-1 pt-1">
                            {assignees.length > 0 ? (
                              assignees.map((person, idx) => (
                                <PersonAssigneeBadge key={idx} person={person} size="sm" />
                              ))
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">Unassigned</span>
                            )}
                          </div>

                          {/* Sub-roles indicator */}
                          {(t.scriptWriterAssigned || t.videographerAssigned || t.editorAssigned) && (
                            <div className="flex flex-wrap gap-1 text-[9px] pt-0.5">
                              {t.scriptWriterAssigned && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary text-foreground font-semibold">
                                  <FileEdit size={9} />
                                  <span>{t.scriptWriterAssigned.name || 'Writer'}</span>
                                </span>
                              )}
                              {t.videographerAssigned && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary text-foreground font-semibold">
                                  <Video size={9} />
                                  <span>{t.videographerAssigned.name || 'Videographer'}</span>
                                </span>
                              )}
                              {t.editorAssigned && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary text-foreground font-semibold">
                                  <Scissors size={9} />
                                  <span>{t.editorAssigned.name || 'Editor'}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Footer with status selector & FULL VIEW button */}
                        <div className="pt-2 flex items-center justify-between gap-2">
                          <select
                            value={t.status}
                            onChange={(e) => updateStatusMutation.mutate({ id: t._id, status: e.target.value })}
                            className="rounded-lg bg-card px-2 py-0.5 text-[11px] font-bold text-foreground outline-none focus:ring-2 focus:ring-brand/40 transition-all max-w-[125px] truncate cursor-pointer"
                          >
                            {(isEmployee ? TEAM_STATUS_OPTIONS : TASK_STATUS_OPTIONS).map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenWorkflowDrawer(t)}
                              className="px-2 py-1 rounded-lg bg-secondary hover:bg-secondary/80 text-[11px] font-bold text-foreground transition-all cursor-pointer"
                              title="Quick Overview Drawer"
                            >
                              Quick View
                            </button>
                            <Link
                              to={`/tasks/${t._id}`}
                              className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-primary text-foreground hover:text-primary-foreground text-[11px] font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                              title="Open Full Page View"
                            >
                              <span>Full View</span>
                              <ExternalLink size={10} />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Database View Engine (Table + Kanban Board) */}
        <DatabaseView
          activeView={currentView}
          onViewChange={setCurrentView}
          searchQuery={filters.search}
          onSearchChange={(val) => setFilters((prev) => ({ ...prev, search: val }))}
          totalCount={displayedTasks.length}
          filters={
            <div className="flex items-center justify-between gap-3 w-full flex-wrap">
              {/* Filter Dropdowns Group */}
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                {/* Team Department Segmented Switcher */}
                <div className="flex items-center p-0.5 rounded-xl bg-secondary/40 shrink-0 gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleDepartmentFilterChange('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                      departmentFilter === 'all'
                        ? 'bg-primary text-primary-foreground font-bold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                    }`}
                  >
                    <CheckSquare size={13} />
                    <span>All Tasks</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                        departmentFilter === 'all'
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-background text-muted-foreground '
                      }`}
                    >
                      {taskCountsByDepartment.all}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDepartmentFilterChange('content')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                      departmentFilter === 'content'
                        ? 'bg-primary text-primary-foreground font-bold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                    }`}
                  >
                    <Film size={13} />
                    <span>Content</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                        departmentFilter === 'content'
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-background text-muted-foreground '
                      }`}
                    >
                      {taskCountsByDepartment.content}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDepartmentFilterChange('non_content')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                      departmentFilter === 'non_content'
                        ? 'bg-primary text-primary-foreground font-bold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                    }`}
                  >
                    <Laptop size={13} />
                    <span>Non-Content</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold tabular-nums ${
                        departmentFilter === 'non_content'
                          ? 'bg-primary-foreground/20 text-primary-foreground'
                          : 'bg-background text-muted-foreground '
                      }`}
                    >
                      {taskCountsByDepartment.non_content}
                    </span>
                  </button>
                </div>

                {/* Category Filter Dropdown (Adaptive to active department) */}
                <SelectDropdown
                  className="w-full sm:w-44 text-xs"
                  value={categoryFilter}
                  onChange={(val) => setCategoryFilter(val || 'all')}
                  options={currentCategoryPills.map((p) => ({ value: p.key, label: p.label }))}
                  allOptionLabel={
                    departmentFilter === 'non_content'
                      ? 'All Non-Content'
                      : departmentFilter === 'content'
                      ? 'All Content'
                      : 'All Categories'
                  }
                />

                {/* Client Filter */}
                <SelectDropdown
                  className="w-full sm:w-48 text-xs"
                  value={filters.client}
                  onChange={(val) => setFilters((prev) => ({ ...prev, client: val }))}
                  options={clientOptions}
                  placeholder="Filter by Client"
                  allOptionLabel="All Clients"
                />

                {/* Status Filter */}
                <SelectDropdown
                  className="w-full sm:w-40 text-xs"
                  value={filters.status}
                  onChange={(val) => setFilters((prev) => ({ ...prev, status: val }))}
                  options={isEmployee ? TEAM_STATUS_OPTIONS : TASK_STATUS_OPTIONS}
                  allOptionLabel="All Statuses"
                />

                {/* Priority Filter */}
                <SelectDropdown
                  className="w-full sm:w-36 text-xs"
                  value={filters.priority}
                  onChange={(val) => setFilters((prev) => ({ ...prev, priority: val }))}
                  options={['Critical', 'High', 'Medium', 'Low']}
                  allOptionLabel="All Priorities"
                />

                {/* Assignee Filter */}
                {!isEmployee && (
                  <SelectDropdown
                    className="w-full sm:w-44 text-xs"
                    value={filters.assignedTo}
                    onChange={(val) => setFilters((prev) => ({ ...prev, assignedTo: val }))}
                    options={userOptions}
                    placeholder="Filter by Assignee"
                    allOptionLabel="All Assignees"
                  />
                )}

                {/* Sorting Filter Dropdown */}
                <SelectDropdown
                  className="w-full sm:w-52 text-xs font-semibold"
                  value={sortBy}
                  onChange={(val) => setSortBy(val || 'dueDate_asc')}
                  options={TASK_SORT_OPTIONS}
                />
              </div>

              {/* Reset Button */}
              {activeFiltersCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearAllFilters}
                  className="h-8 px-2.5 text-xs text-foreground bg-secondary hover:bg-secondary/80 inline-flex items-center gap-1 rounded-xl transition-all font-bold cursor-pointer tabular-nums"
                  title="Clear all active filters"
                >
                  <RotateCcw size={12} />
                  <span>Reset ({activeFiltersCount})</span>
                </Button>
              )}
            </div>
          }
        >
        {/* Table View (Desktop DataTable + Responsive Mobile Card List) */}
        {currentView === 'table' && (
          <div>
            {/* Desktop / Tablet Table */}
            <div className="hidden md:block">
              <DataTable
                data={displayedTasks}
                columns={columns}
                loading={isLoading}
                onRowClick={handleRowClick}
                onEdit={
                  canCreate
                    ? (task) => {
                        openTaskDetail(task._id);
                      }
                    : undefined
                }
                onDelete={canDelete ? (id) => setDeleteTaskId(id) : undefined}
                emptyTitle="No tasks found"
                emptyDescription=""
              />
            </div>

            {/* Mobile Touch-Friendly Card List */}
            <div className="md:hidden space-y-3">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="h-28 rounded-2xl bg-card animate-pulse p-4" />
                  ))}
                </div>
              ) : displayedTasks.length === 0 ? (
                <div className="p-8 text-center bg-card rounded-2xl text-xs text-muted-foreground">
                  No tasks found
                </div>
              ) : (
                displayedTasks.map((task) => {
                  const isExpanded = Boolean(expandedMobileTaskIds[task._id]);
                  const checklist = Array.isArray(task.checklist) ? task.checklist : [];
                  const completedChecklistCount = checklist.filter((i) => i.isCompleted).length;
                  const categoryLabel = formatTaskTypeLabel(task.taskType) || task.taskType || (task.taskCategory === 'content' ? 'Content' : 'Task');

                  return (
                  <div
                    key={task._id}
                    onClick={() => handleRowClick(task)}
                    className="p-4 rounded-2xl bg-card transition-all space-y-2.5 cursor-pointer active:scale-[0.99]"
                  >
                    {/* Compact Initial Row 1: Name + Enlarge Button */}
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-foreground text-sm leading-snug flex-1 min-w-0 line-clamp-2">
                        {task.taskTitle || task.title}
                      </h4>
                      <button
                        type="button"
                        onClick={(e) => toggleMobileTaskExpand(e, task._id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground text-[10px] font-semibold shrink-0 transition-colors cursor-pointer"
                        title={isExpanded ? 'Collapse card' : 'Enlarge card'}
                        aria-label={isExpanded ? 'Collapse card' : 'Enlarge card'}
                      >
                        {isExpanded ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
                        <span>{isExpanded ? 'Less' : 'Enlarge'}</span>
                      </button>
                    </div>

                    {/* Compact Initial Row 2: Category + Tasks */}
                    <div className="flex items-center justify-between gap-2 flex-wrap tabular-nums">
                      <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-bold bg-secondary text-foreground truncate max-w-[175px]">
                        {task.taskCategory === 'content' ? <Video size={11} className="shrink-0" /> : <Code2 size={11} className="shrink-0" />}
                        <span className="truncate">{categoryLabel}</span>
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold bg-secondary/70 text-foreground">
                        <ListChecks size={12} className="shrink-0 text-muted-foreground" />
                        <span>
                          {checklist.length > 0 ? `${completedChecklistCount}/${checklist.length} tasks` : `${checklist.length} tasks`}
                        </span>
                      </span>
                    </div>

                    {/* Remaining Details Revealed When Enlarged */}
                    {isExpanded && (
                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground truncate">
                            {task.client?.company || task.client?.name || task.clientName || 'Internal Task'}
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <StatusBadge tone={priorityTone[task.priority] || 'neutral'}>
                              {task.priority || 'Medium'}
                            </StatusBadge>
                            {canCreate && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openTaskDetail(task._id);
                                }}
                                className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                title="Open Task"
                              >
                                <Edit2 size={14} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteTaskId(task._id);
                                }}
                                className="p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                title="Delete Task"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Assignees & Sub-roles */}
                        {(() => {
                          const assignees = extractTaskAssignees(task);
                          return (
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {assignees.length > 0 ? (
                                  assignees.map((person, pIdx) => (
                                    <PersonAssigneeBadge key={pIdx} person={person} size="sm" />
                                  ))
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium bg-secondary text-muted-foreground ">
                                    <User size={10} /> Unassigned
                                  </span>
                                )}
                              </div>

                              {(task.scriptWriterAssigned || task.voiceArtistAssigned || task.videographerAssigned || task.editorAssigned || task.publisherAssigned) && (
                                <div className="flex flex-wrap gap-1 text-[10px]">
                                  {task.scriptWriterAssigned && (() => {
                                    const name = task.scriptWriterAssigned.name || task.scriptWriterName || 'Writer';
                                    const c = getPersonColor(name);
                                    return (
                                      <span className={`px-2 py-0.5 rounded-md font-semibold inline-flex items-center gap-1 ${c.bg} ${c.text} ${c.border}`}>
                                        <FileEdit size={10} />
                                        <span>{name}</span>
                                      </span>
                                    );
                                  })()}
                                  {task.voiceArtistAssigned && (() => {
                                    const name = task.voiceArtistAssigned.name || task.voiceArtistName || 'RJ / Voice';
                                    const c = getPersonColor(name);
                                    return (
                                      <span className={`px-2 py-0.5 rounded-md font-semibold inline-flex items-center gap-1 ${c.bg} ${c.text} ${c.border}`}>
                                        <Mic size={10} />
                                        <span>{name}</span>
                                      </span>
                                    );
                                  })()}
                                  {task.videographerAssigned && (() => {
                                    const name = task.videographerAssigned.name || task.videographerName || 'Videographer';
                                    const c = getPersonColor(name);
                                    return (
                                      <span className={`px-2 py-0.5 rounded-md font-semibold inline-flex items-center gap-1 ${c.bg} ${c.text} ${c.border}`}>
                                        <Video size={10} />
                                        <span>{name}</span>
                                      </span>
                                    );
                                  })()}
                                  {task.editorAssigned && (() => {
                                    const name = task.editorAssigned.name || task.editorName || 'Editor';
                                    const c = getPersonColor(name);
                                    return (
                                      <span className={`px-2 py-0.5 rounded-md font-semibold inline-flex items-center gap-1 ${c.bg} ${c.text} ${c.border}`}>
                                        <Scissors size={10} />
                                        <span>{name}</span>
                                      </span>
                                    );
                                  })()}
                                  {task.publisherAssigned && (() => {
                                    const name = task.publisherAssigned.name || task.publisherName || 'Publisher';
                                    const c = getPersonColor(name);
                                    return (
                                      <span className={`px-2 py-0.5 rounded-md font-semibold inline-flex items-center gap-1 ${c.bg} ${c.text} ${c.border}`}>
                                        <Smartphone size={10} />
                                        <span>{name}</span>
                                      </span>
                                    );
                                  })()}
                                </div>
                              )}

                              {(task.department === 'Development' || task.development?.isDevTask || isWebsiteTaskType(task.taskType)) && (
                                <div className="flex flex-wrap items-center gap-1.5 text-[10px] pt-1">
                                  <span className={`px-2 py-0.5 rounded-md font-bold inline-flex items-center gap-1 ${
                                    task.development?.isBlocked
                                      ? 'bg-primary text-primary-foreground '
                                      : 'bg-secondary text-foreground '
                                  }`}>
                                    <Code2 size={11} />
                                    <span>Dev: {task.development?.isBlocked ? 'Blocked' : (DEV_STAGE_SHORT_LABELS[task.development?.stage] || 'In Dev')}</span>
                                  </span>
                                  {task.development?.reviewer && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-secondary text-foreground ">
                                      <Search size={10} />
                                      <span>Review: {task.development.reviewer.name || 'Reviewer'}</span>
                                    </span>
                                  )}
                                  {task.development?.tester && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold bg-secondary text-foreground ">
                                      <ShieldCheck size={10} />
                                      <span>QA: {task.development.tester.name || 'Tester'}</span>
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Status Select & Due Date */}
                        <div className="flex items-center justify-between pt-2 gap-2">
                          <div onClick={(e) => e.stopPropagation()}>
                            <select
                              value={task.status}
                              onChange={(e) => updateStatusMutation.mutate({ id: task._id, status: e.target.value })}
                              className="rounded-xl bg-background px-2.5 py-1 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-brand/40 transition-all cursor-pointer"
                            >
                              {(isEmployee ? TEAM_STATUS_OPTIONS : TASK_STATUS_OPTIONS).map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap tabular-nums">
                            {task.createdAt && (
                              <div className="text-[11px] inline-flex items-center gap-1 text-muted-foreground">
                                <Calendar size={11} className="text-muted-foreground shrink-0" />
                                <span>Created {new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                              </div>
                            )}
                            {(() => {
                              const overdue = isTaskOverdue(task);
                              return (
                                <div className={`text-[11px] inline-flex items-center gap-1 font-medium ${overdue ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                                  {overdue ? <AlertTriangle size={12} className="text-foreground shrink-0" /> : <Clock size={12} className="text-muted-foreground shrink-0" />}
                                  <span>{task.dueDate ? `${overdue ? 'Overdue: ' : 'Due '}${new Date(task.dueDate).toLocaleDateString()}` : 'No deadline'}</span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Board View (Modern 7-Stage Kanban Workflow Pipeline) */}
        {(currentView === 'board' || currentView === 'kanban') && (
          <div className="space-y-3.5 w-full">
            <TasksKanbanPipeline
              tasks={displayedTasks}
              onSelectTask={handleOpenWorkflowDrawer}
              onOpenCreateGeneral={handleOpenCreateGeneral}
              canCreate={canCreate}
              canDelete={canDelete}
              onDeleteTask={(task) => setDeleteTaskId(task._id)}
            />
          </div>
        )}
      </DatabaseView>
      </div>

      <TaskDetailModal
        open={showTaskDetail}
        onOpenChange={setShowTaskDetail}
        taskId={selectedTaskId}
      />

      {/* Dynamic Kanban Task Creator */}
      <KanbanCreateTaskModal
        isOpen={showKanbanCreateModal}
        onClose={() => {
          setShowKanbanCreateModal(false);
          setPreSelectedEmployee(null);
          setCreateTaskInitialValues(null);
        }}
        initialUser={preSelectedEmployee}
        initialValues={createTaskInitialValues}
        onTaskCreated={refetch}
      />

      {/* Interactive Workflow Drawer with live checklists and task notes */}
      <TaskWorkflowDrawer
        task={activeWorkflowTask}
        isOpen={showWorkflowDrawer && !!activeWorkflowTask}
        onClose={() => {
          setShowWorkflowDrawer(false);
          setWorkflowTaskId(null);
        }}
        onOpenTaskDetail={(taskId) => {
          setShowWorkflowDrawer(false);
          openTaskDetail(taskId);
        }}
      />

      <AlertDialog open={!!deleteTaskId} onOpenChange={(open) => !open && setDeleteTaskId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task?</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspacePage>
  );
};

export default Tasks;
