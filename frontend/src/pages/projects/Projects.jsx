// =============================================
// PROJECTS WORKSPACE - Category Filters & Multi-View Engine
// =============================================

import React, { Fragment, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Briefcase,
  Plus,
  Target,
  TrendingUp,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  FolderKanban,
  Building2,
  Calendar,
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
  Layers,
  ListChecks,
  Sparkles,
  Search,
  Check,
  X,
  User,
  Users,
  PieChart,
  ShieldAlert,
  Globe,
  Share2,
  Layout,
  Video,
  Palette,
  Smartphone,
  ShoppingBag,
  Rocket,
  Wrench,
  FileText,
  Edit2,
  Maximize2,
  Minimize2,
} from '@/components/ui/muiIcons';
import { useProjects, useDeleteProject, useUpdateProject } from '../../hooks/useProjects';
import { useClients } from '../../hooks/useClients';
import { useAutoScrollOnDrag } from '../../hooks/useAutoScrollOnDrag';
import { AddProjectModal } from '../../components/modals/AddProjectModal';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/button';
import { WorkspacePage } from '../../components/ui/WorkspacePage';
import { DatabaseView } from '../../components/ui/DatabaseView';
import { StatusBadge } from '../../components/ui/page';
import { CategoryColorLegend, BOARD_CATEGORY_DEFINITIONS } from '../../components/ui/CategoryColorLegend';
import { isCategoryMatch } from '../../utils/categoryColors';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SelectDropdown } from '../../components/ui/SelectDropdown';
import { useDateFilter } from '../../context/DateFilterContext';
import {
  PROJECT_CATEGORIES,
  getProjectCategoryMeta,
  CATEGORY_OPTIONS,
  CATEGORY_FILTER_PILLS,
} from '../../utils/projectCategories';

const projectStatusTone = {
  Completed: 'success',
  'In Progress': 'info',
  'On Hold': 'warning',
  Planning: 'neutral',
  Cancelled: 'danger',
};

const projectPriorityTone = {
  Critical: 'danger',
  High: 'warning',
  Medium: 'info',
  Low: 'neutral',
};

const STATUS_COLUMNS = ['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled'];

export const PROJECT_SORT_OPTIONS = [
  { value: 'dueDate_asc', label: 'Due Date: Earliest First' },
  { value: 'dueDate_desc', label: 'Due Date: Latest First' },
  { value: 'priority_desc', label: 'Priority: High to Low' },
  { value: 'priority_asc', label: 'Priority: Low to High' },
  { value: 'name_asc', label: 'Project: A to Z' },
  { value: 'name_desc', label: 'Project: Z to A' },
  { value: 'tasks_desc', label: 'Tasks Available: High to Low' },
  { value: 'tasks_asc', label: 'Tasks Available: Low to High' },
  { value: 'progress_desc', label: 'Progress: High to Low' },
  { value: 'progress_asc', label: 'Progress: Low to High' },
  { value: 'newest', label: 'Recently Created' },
  { value: 'oldest', label: 'Oldest Created' },
];

const Projects = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  
  // Modal & Selection States
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [deleteProjectId, setDeleteProjectId] = useState(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [sortBy, setSortBy] = useState('dueDate_asc');
  const [currentView, setCurrentView] = useState('board'); // 'board' | 'table'
  const [boardGroupBy, setBoardGroupBy] = useState('status'); // 'status' | 'category'

  // Drag and Drop States for Kanban
  const [draggingProjectId, setDraggingProjectId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [dragOverProjectIndex, setDragOverProjectIndex] = useState(null);
  const [expandedProjectIds, setExpandedProjectIds] = useState({});
  const projectsBoardRef = useRef(null);

  const toggleProjectExpand = (e, projectId) => {
    e.stopPropagation();
    setExpandedProjectIds((prev) => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  // Auto scroll while dragging
  useAutoScrollOnDrag(projectsBoardRef, Boolean(draggingProjectId));

  // Queries
  const { data: rawProjects = [], isLoading } = useProjects();
  const { data: clients = [] } = useClients();
  const {
    startDate: globalStartDate,
    endDate: globalEndDate,
    isDateInRange,
    isFiltered: isGlobalDateFiltered,
    resetDateFilter,
  } = useDateFilter();

  const deleteProjectMutation = useDeleteProject();
  const updateProjectMutation = useUpdateProject();

  // 1. Base projects filtered by global date sort
  const baseDateFilteredProjects = useMemo(() => {
    return rawProjects.filter((project) =>
      isDateInRange([project.endDate, project.dueDate, project.startDate, project.createdAt])
    );
  }, [rawProjects, isDateInRange]);


  // 2. Compute dynamic project counts per category
  const categoryCounts = useMemo(() => {
    const counts = { all: baseDateFilteredProjects.length };

    baseDateFilteredProjects.forEach((project) => {
      CATEGORY_FILTER_PILLS.forEach((pill) => {
        if (pill.key !== 'all' && isCategoryMatch(project.category, pill.key, project.name)) {
          counts[pill.key] = (counts[pill.key] || 0) + 1;
        }
      });
      BOARD_CATEGORY_DEFINITIONS.forEach((def) => {
        if (counts[def.key] === undefined && isCategoryMatch(project.category, def.key, project.name)) {
          counts[def.key] = (counts[def.key] || 0) + 1;
        }
      });
    });

    return counts;
  }, [baseDateFilteredProjects]);

  // 3. Category pills list with real-time project counts
  const activeCategoryPills = useMemo(() => {
    return CATEGORY_FILTER_PILLS.map((pill) => ({
      ...pill,
      count: pill.key === 'all' ? baseDateFilteredProjects.length : (categoryCounts[pill.key] || 0),
    }));
  }, [baseDateFilteredProjects, categoryCounts]);

  // 4. Fully filtered projects dataset
  const filteredProjects = useMemo(() => {
    let result = baseDateFilteredProjects.filter((project) => {
      // Category filter
      if (categoryFilter && categoryFilter !== 'all') {
        if (!isCategoryMatch(project.category, categoryFilter, project.name)) {
          return false;
        }
      }

      // Status filter
      if (statusFilter && project.status !== statusFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter && (project.priority || 'Medium') !== priorityFilter) {
        return false;
      }

      // Client filter
      if (clientFilter) {
        if (clientFilter === 'internal') {
          if (!project.isInternal && project.client) return false;
        } else {
          const projectClientId = project.client?._id || project.client;
          if (String(projectClientId) !== String(clientFilter)) return false;
        }
      }

      // Search term filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const nameMatch = project.name?.toLowerCase().includes(query);
        const descMatch = project.description?.toLowerCase().includes(query);
        const clientMatch =
          project.client?.name?.toLowerCase().includes(query) ||
          project.client?.company?.toLowerCase().includes(query);
        const catMeta = getProjectCategoryMeta(project.category);
        const catMatch =
          catMeta.label.toLowerCase().includes(query) ||
          catMeta.shortLabel.toLowerCase().includes(query);

        if (!nameMatch && !descMatch && !clientMatch && !catMatch) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    const priorityWeights = { Critical: 4, Urgent: 4, High: 3, Medium: 2, Low: 1 };
    result.sort((a, b) => {
      if (sortBy === 'dueDate_asc') {
        const dateA = a.endDate ? new Date(a.endDate).getTime() : Infinity;
        const dateB = b.endDate ? new Date(b.endDate).getTime() : Infinity;
        return dateA - dateB;
      }
      if (sortBy === 'dueDate_desc') {
        const dateA = a.endDate ? new Date(a.endDate).getTime() : -Infinity;
        const dateB = b.endDate ? new Date(b.endDate).getTime() : -Infinity;
        return dateB - dateA;
      }
      if (sortBy === 'priority_desc') {
        return (priorityWeights[b.priority] || 2) - (priorityWeights[a.priority] || 2);
      }
      if (sortBy === 'priority_asc') {
        return (priorityWeights[a.priority] || 2) - (priorityWeights[b.priority] || 2);
      }
      if (sortBy === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortBy === 'name_desc') {
        return (b.name || '').localeCompare(a.name || '');
      }
      if (sortBy === 'tasks_desc') {
        return (b.totalTasks || 0) - (a.totalTasks || 0);
      }
      if (sortBy === 'tasks_asc') {
        return (a.totalTasks || 0) - (b.totalTasks || 0);
      }
      if (sortBy === 'progress_desc') {
        return (b.progress || 0) - (a.progress || 0);
      }
      if (sortBy === 'progress_asc') {
        return (a.progress || 0) - (b.progress || 0);
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
  }, [
    baseDateFilteredProjects,
    categoryFilter,
    statusFilter,
    priorityFilter,
    clientFilter,
    searchTerm,
    sortBy,
  ]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (categoryFilter !== 'all') count++;
    if (statusFilter) count++;
    if (priorityFilter) count++;
    if (clientFilter) count++;
    if (isGlobalDateFiltered || globalStartDate || globalEndDate) count++;
    if (searchTerm.trim()) count++;
    return count;
  }, [categoryFilter, statusFilter, priorityFilter, clientFilter, isGlobalDateFiltered, globalStartDate, globalEndDate, searchTerm]);

  const clearAllFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setStatusFilter('');
    setPriorityFilter('');
    setClientFilter('');
    setSortBy('dueDate_asc');
    resetDateFilter();
  };

  // Metric counts and calculations
  const totalProjectsCount = filteredProjects.length;
  const inProgressCount = filteredProjects.filter((p) => p.status === 'In Progress').length;
  const planningCount = filteredProjects.filter((p) => p.status === 'Planning').length;
  const onHoldCount = filteredProjects.filter((p) => p.status === 'On Hold').length;
  const completedCount = filteredProjects.filter((p) => p.status === 'Completed').length;
  const totalTasksAvailable = filteredProjects.reduce((sum, p) => sum + (p.totalTasks || 0), 0);
  const totalOngoingTasks = filteredProjects.reduce((sum, p) => sum + (p.ongoingTasks || 0), 0);
  const totalCompletedTasks = filteredProjects.reduce((sum, p) => sum + (p.completedTasks ?? p.doneTasks ?? 0), 0);
  const avgProgress = totalProjectsCount > 0
    ? Math.round(filteredProjects.reduce((acc, p) => acc + (p.progress || 0), 0) / totalProjectsCount)
    : 0;

  // Board columns based on groupBy mode
  const boardColumns = useMemo(() => {
    if (boardGroupBy === 'category') {
      // Find all unique categories present in filtered projects
      const catMap = {};
      filteredProjects.forEach((p) => {
        const meta = getProjectCategoryMeta(p.category);
        if (!catMap[meta.key]) {
          catMap[meta.key] = meta;
        }
      });

      // Include currently selected category if any
      if (categoryFilter !== 'all') {
        const selMeta = getProjectCategoryMeta(categoryFilter);
        if (selMeta && selMeta.key) {
          catMap[selMeta.key] = selMeta;
        }
      }

      const cols = Object.values(catMap);
      if (cols.length === 0) {
        return [
          { key: 'web_development', label: 'Website / Dev', icon: Globe },
          { key: 'social_media', label: 'Social Media', icon: Share2 },
          { key: 'branding', label: 'Branding', icon: Sparkles },
          { key: 'seo', label: 'SEO', icon: Search },
        ];
      }
      return cols.map((c) => ({ key: c.key, label: c.shortLabel || c.label, icon: c.icon }));
    }

    // Default: Group by Status
    return STATUS_COLUMNS.map((status) => ({
      key: status,
      label: status,
    }));
  }, [boardGroupBy, filteredProjects, categoryFilter]);

  // Table Columns
  const tableColumns = [
    {
      key: 'name',
      label: 'Project Name',
      render: (row) => {
        const catMeta = getProjectCategoryMeta(row.category);
        const CatIcon = catMeta.icon;

        return (
          <div className="min-w-0 flex items-start gap-2.5">
            <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${catMeta.badgeClass}`}>
              <CatIcon size={14} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-foreground text-xs hover:text-primary transition-colors cursor-pointer flex items-center gap-1.5">
                <span className="truncate">{row.name}</span>
                {row.priority === 'Critical' && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-foreground text-background shrink-0 uppercase tracking-wider">
                    Urgent
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground flex items-center gap-1.5 truncate">
                {row.client?.name ? (
                  <span className="flex items-center gap-1">
                    <Building2 size={11} className="text-muted-foreground/70 shrink-0" />
                    <span>{row.client.name}</span>
                  </span>
                ) : row.category === 'saas_product' || row.isInternal ? (
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <Rocket size={11} className="text-muted-foreground shrink-0" />
                    <span>SaaS / Internal Product</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Building2 size={11} className="text-muted-foreground/70 shrink-0" />
                    <span>Internal Workspace</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'category',
      label: 'Project Type',
      render: (row) => {
        const catMeta = getProjectCategoryMeta(row.category);
        const Icon = catMeta.icon;

        return (
          <div className="flex items-center">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold ${catMeta.badgeClass}`}
            >
              <Icon size={12} className="shrink-0" />
              <span>{catMeta.shortLabel || catMeta.label}</span>
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <StatusBadge tone={projectStatusTone[row.status] || 'neutral'}>
          {row.status}
        </StatusBadge>
      ),
    },
    {
      key: 'progress',
      label: 'Tasks Available',
      render: (row) => (
        <div className="w-36 space-y-1.5 tabular-nums">
          <div className="flex items-center justify-between text-[10px] font-bold">
            <span className="text-foreground">
              {row.totalTasks || 0} {row.totalTasks === 1 ? 'task' : 'tasks'}
            </span>
            <span className="text-muted-foreground">
              {row.doneTasks || 0} done ({row.progress || 0}%)
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                (row.progress || 0) >= 100
                  ? 'bg-foreground'
                  : (row.progress || 0) >= 50
                  ? 'bg-foreground/80'
                  : 'bg-muted-foreground/60'
              }`}
              style={{ width: `${Math.min(row.progress || 0, 100)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'timeline',
      label: 'Start & End Date',
      render: (row) => {
        const endDateVal = row.endDate || row.dueDate;
        const startDateVal = row.startDate;
        const isOverdue = endDateVal && new Date(endDateVal) < new Date() && row.status !== 'Completed';

        return (
          <div className="text-[11px] space-y-0.5 tabular-nums">
            <div className="flex items-center gap-1 text-muted-foreground font-medium">
              <Calendar size={11} className="shrink-0" />
              <span>
                Start: {startDateVal ? new Date(startDateVal).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
              </span>
            </div>
            <div
              className={`flex items-center gap-1 font-semibold ${
                isOverdue ? 'text-foreground font-bold' : 'text-foreground/90'
              }`}
            >
              <span>
                End: {endDateVal ? new Date(endDateVal).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Ongoing'}
              </span>
              {isOverdue && <span className="text-[9px] px-1 py-0.2 rounded bg-foreground text-background font-black">LATE</span>}
            </div>
          </div>
        );
      },
    },
    {
      key: 'team',
      label: 'Assignees',
      render: (row) => (
        <div className="flex items-center -space-x-1.5 overflow-hidden">
          {row.manager && (
            <div
              title={`Manager: ${row.manager.name}`}
              className="h-6 w-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold "
            >
              {row.manager.name?.charAt(0) || 'M'}
            </div>
          )}
          {row.team && row.team.length > 0 ? (
            row.team.slice(0, 3).map((m, idx) => (
              <div
                key={m._id || idx}
                title={m.name}
                className="h-6 w-6 rounded-full bg-secondary text-foreground flex items-center justify-center text-[10px] font-bold "
              >
                {m.name?.charAt(0) || 'U'}
              </div>
            ))
          ) : !row.manager ? (
            <span className="text-[11px] text-muted-foreground">—</span>
          ) : null}
          {row.team && row.team.length > 3 && (
            <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[9px] font-bold">
              +{row.team.length - 3}
            </div>
          )}
        </div>
      ),
    },
  ];

  const handleDelete = async () => {
    if (deleteProjectId) {
      await deleteProjectMutation.mutateAsync(deleteProjectId);
      setDeleteProjectId(null);
    }
  };

  const canCreate = ['superAdmin', 'admin', 'manager'].includes(user?.role);

  // Client dropdown options
  const clientOptions = useMemo(() => {
    const list = [{ value: '', label: 'All Clients' }, { value: 'internal', label: 'SaaS & Internal (No Client)' }];
    clients.forEach((c) => {
      list.push({
        value: c._id,
        label: c.company ? `${c.name} (${c.company})` : c.name,
      });
    });
    return list;
  }, [clients]);

  return (
    <WorkspacePage
      title={user?.role === 'client' ? 'My Projects' : 'Projects Workspace'}
      icon={FolderKanban}
      breadcrumbs={user?.role === 'client' ? [{ name: 'Portal', path: '/' }, { name: 'My Projects' }] : [{ name: 'Delivery', path: '/tasks' }, { name: 'Projects' }]}
      actions={
        canCreate && (
          <Button
            size="sm"
            onClick={() => {
              setSelectedProject(null);
              setShowAddModal(true);
            }}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl transition-all hover:bg-primary/90 min-h-[38px] cursor-pointer"
          >
            <Plus size={15} className="mr-1 stroke-[2.5]" />
            New Project
          </Button>
        )
      }
    >
      <div className="space-y-5">
        {/* TOP EXECUTIVE METRICS CARDS WITH ACCURATE NUMBERS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 tabular-nums">
          {/* Total Projects Card */}
          <div className="p-3.5 bg-card rounded-2xl flex flex-col justify-between space-y-2 relative overflow-hidden group transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Projects</span>
              <div className="h-7 w-7 rounded-xl bg-secondary text-foreground flex items-center justify-center shrink-0">
                <FolderKanban size={14} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-foreground tracking-tight">{totalProjectsCount}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 font-medium flex items-center justify-between">
                <span>Avg Progress</span>
                <span className="font-bold text-foreground">{avgProgress}%</span>
              </div>
            </div>
          </div>

          {/* In Delivery Card */}
          <div className="p-3.5 bg-card rounded-2xl flex flex-col justify-between space-y-2 relative overflow-hidden group transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">In Delivery</span>
              <div className="h-7 w-7 rounded-xl bg-secondary text-foreground flex items-center justify-center shrink-0">
                <Clock size={14} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-foreground tracking-tight">{inProgressCount}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                {totalProjectsCount > 0 ? `${Math.round((inProgressCount / totalProjectsCount) * 100)}% of pipeline` : '0%'}
              </div>
            </div>
          </div>

          {/* Planning Card */}
          <div className="p-3.5 bg-card rounded-2xl flex flex-col justify-between space-y-2 relative overflow-hidden group transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Planning</span>
              <div className="h-7 w-7 rounded-xl bg-secondary text-foreground flex items-center justify-center shrink-0">
                <Target size={14} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-foreground tracking-tight">{planningCount}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                In kick-off / scoping
              </div>
            </div>
          </div>

          {/* On Hold Card */}
          <div className="p-3.5 bg-card rounded-2xl flex flex-col justify-between space-y-2 relative overflow-hidden group transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">On Hold</span>
              <div className="h-7 w-7 rounded-xl bg-secondary text-foreground flex items-center justify-center shrink-0">
                <AlertTriangle size={14} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-foreground tracking-tight">{onHoldCount}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                Needs attention
              </div>
            </div>
          </div>

          {/* Completed Card */}
          <div className="p-3.5 bg-card rounded-2xl flex flex-col justify-between space-y-2 relative overflow-hidden group transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Completed</span>
              <div className="h-7 w-7 rounded-xl bg-secondary text-foreground flex items-center justify-center shrink-0">
                <CheckCircle2 size={14} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-foreground tracking-tight">{completedCount}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                {totalProjectsCount > 0 ? `${Math.round((completedCount / totalProjectsCount) * 100)}% completion rate` : '0%'}
              </div>
            </div>
          </div>

          {/* Tasks Available Summary Card */}
          <div className="p-3.5 bg-card rounded-2xl flex flex-col justify-between space-y-2 relative overflow-hidden group transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Tasks Available</span>
              <div className="h-7 w-7 rounded-xl bg-secondary text-foreground flex items-center justify-center shrink-0">
                <ListChecks size={14} />
              </div>
            </div>
            <div>
              <div className="text-2xl font-black text-foreground tracking-tight">{totalTasksAvailable}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                {totalOngoingTasks} ongoing · {totalCompletedTasks} done
              </div>
            </div>
          </div>
        </div>

        {/* DATABASE VIEW (TABLE & BOARD VIEWS + MULTI-FACETED FILTERS) */}
        <DatabaseView
          activeView={currentView}
          onViewChange={setCurrentView}
          searchQuery={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search projects, client, category..."
          totalCount={filteredProjects.length}
          filters={
            <div className="flex items-center justify-between gap-3 w-full flex-wrap">
              {/* Dropdown Filters Group */}
              <div className="flex items-center gap-2 flex-wrap min-w-0 w-full sm:w-auto">
                {/* Category Dropdown Filter */}
                <SelectDropdown
                  className="w-full sm:w-48 text-xs"
                  value={categoryFilter}
                  onChange={(val) => setCategoryFilter(val || 'all')}
                  options={[{ value: 'all', label: 'All Categories' }, ...CATEGORY_OPTIONS]}
                  allOptionLabel="All Categories"
                />

                {/* Status Dropdown Filter */}
                <SelectDropdown
                  className="w-full sm:w-40 text-xs"
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  options={['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled']}
                  allOptionLabel="All Statuses"
                />

                {/* Priority Dropdown Filter */}
                <SelectDropdown
                  className="w-full sm:w-36 text-xs"
                  value={priorityFilter}
                  onChange={(val) => setPriorityFilter(val)}
                  options={['Critical', 'High', 'Medium', 'Low']}
                  allOptionLabel="All Priorities"
                />

                {/* Client Dropdown Filter (Hide for clients) */}
                {user?.role !== 'client' && (
                  <SelectDropdown
                    className="w-44 text-xs"
                    value={clientFilter}
                    onChange={(val) => setClientFilter(val)}
                    options={clientOptions}
                    placeholder="Filter by Client"
                  />
                )}

                {/* Sorting Filter Dropdown */}
                <SelectDropdown
                  className="w-52 text-xs font-semibold"
                  value={sortBy}
                  onChange={(val) => setSortBy(val || 'dueDate_asc')}
                  options={PROJECT_SORT_OPTIONS}
                />
              </div>

              {/* View/Group Controls & Reset Button */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Group By Selector for Kanban */}
                {currentView === 'board' && (
                  <div className="flex items-center bg-secondary/70 p-0.5 rounded-xl shrink-0">
                    <button
                      type="button"
                      onClick={() => setBoardGroupBy('status')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        boardGroupBy === 'status'
                          ? 'bg-card text-foreground '
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      By Status
                    </button>
                    <button
                      type="button"
                      onClick={() => setBoardGroupBy('category')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        boardGroupBy === 'category'
                          ? 'bg-card text-foreground '
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      By Category
                    </button>
                  </div>
                )}

                {/* Reset All Filters Button */}
                {activeFiltersCount > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearAllFilters}
                    className="h-8 px-2.5 text-xs text-foreground hover:text-foreground bg-secondary hover:bg-muted flex items-center gap-1 rounded-xl transition-all font-bold cursor-pointer"
                    title="Clear all active filters"
                  >
                    <RotateCcw size={12} className="shrink-0" />
                    <span className="tabular-nums">Reset ({activeFiltersCount})</span>
                  </Button>
                )}
              </div>
            </div>
          }
        >
          {/* 1. TABLE VIEW */}
          {currentView === 'table' && (
            <DataTable
              data={filteredProjects}
              columns={tableColumns}
              loading={isLoading}
              onRowClick={(project) => navigate(`/projects/${project._id}`)}
              onEdit={
                canCreate
                  ? (project) => {
                      setSelectedProject(project);
                      setShowAddModal(true);
                    }
                  : undefined
              }
              onDelete={canCreate ? (id) => setDeleteProjectId(id) : undefined}
              emptyTitle="No projects found"
              emptyDescription=""
            />
          )}

          {/* 2. BOARD (KANBAN) VIEW */}
          {(currentView === 'board' || currentView === 'kanban') && (
            <div className="space-y-3.5 w-full">
              {/* Category Color Definition Guide */}
              <CategoryColorLegend
                selectedCategory={categoryFilter}
                onSelectCategory={setCategoryFilter}
                title="Project Category Index"
              />

              <div ref={projectsBoardRef} className="w-full overflow-x-auto pb-4 custom-scrollbar responsive-table-container">
                <div
                  className={
                    boardGroupBy === 'status' && boardColumns.length <= 4
                      ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 w-full'
                      : 'flex gap-4 w-max min-w-full'
                  }
                >
                {boardColumns.map((col) => {
                  const colKey = col.key;
                  const colProjects = filteredProjects.filter((p) => {
                    if (boardGroupBy === 'category') {
                      const meta = getProjectCategoryMeta(p.category);
                      return meta.key === colKey || p.category === colKey;
                    }
                    return (p.status || 'Planning') === colKey;
                  });

                  const isColActive = dragOverColumn === colKey;
                  const ColIcon = col.icon;

                  return (
                    <div
                      key={colKey}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (dragOverColumn !== colKey) setDragOverColumn(colKey);
                      }}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                          if (dragOverColumn === colKey) setDragOverColumn(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const projectId = e.dataTransfer.getData('projectId');
                        if (projectId) {
                          if (boardGroupBy === 'status') {
                            updateProjectMutation.mutate({ id: projectId, data: { status: colKey } });
                          } else {
                            updateProjectMutation.mutate({ id: projectId, data: { category: colKey } });
                          }
                        }
                        setDraggingProjectId(null);
                        setDragOverColumn(null);
                        setDragOverProjectIndex(null);
                      }}
                      className={`flex flex-col min-h-[520px] max-h-[calc(100vh-320px)] rounded-2xl transition-all p-3 space-y-3 ${
                        boardGroupBy === 'status' && boardColumns.length <= 4
                          ? 'w-full'
                          : 'w-[300px] shrink-0'
                      } ${
                        isColActive
                          ? ' bg-primary/5 ring-2 ring-primary/20'
                          : ' bg-secondary/15'
                      }`}
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between px-1.5 pt-0.5">
                        <div className="flex items-center gap-2">
                          {ColIcon && <ColIcon size={14} className="text-primary" />}
                          <span className="text-xs font-black uppercase tracking-wider text-foreground">
                            {col.label}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-card text-foreground tabular-nums">
                          {colProjects.length}
                        </span>
                      </div>

                      {/* Column Cards Container */}
                      <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-380px)] custom-scrollbar pr-0.5 flex-1">
                        {colProjects.map((project, idx) => {
                          const isBeingDragged = draggingProjectId === project._id;
                          const showDropIndicatorBefore = isColActive && dragOverProjectIndex === idx && !isBeingDragged;
                          const catMeta = getProjectCategoryMeta(project.category);
                          const CatIcon = catMeta.icon;
                          const isOverdue = project.endDate && new Date(project.endDate) < new Date() && project.status !== 'Completed';
                          const isExpanded = Boolean(expandedProjectIds[project._id]);

                          return (
                            <React.Fragment key={project._id}>
                              {showDropIndicatorBefore && (
                                <div className="h-1.5 rounded-full bg-primary/70 my-1 " />
                              )}
                              <div
                                draggable
                                onDragStart={(e) => {
                                  setDraggingProjectId(project._id);
                                  e.dataTransfer.setData('projectId', project._id);
                                  e.dataTransfer.effectAllowed = 'move';
                                }}
                                onDragEnd={() => {
                                  setDraggingProjectId(null);
                                  setDragOverColumn(null);
                                  setDragOverProjectIndex(null);
                                }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  e.dataTransfer.dropEffect = 'move';
                                  setDragOverColumn(colKey);
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const midY = rect.top + rect.height / 2;
                                  setDragOverProjectIndex(e.clientY < midY ? idx : idx + 1);
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const projectId = e.dataTransfer.getData('projectId');
                                  if (projectId) {
                                    if (boardGroupBy === 'status') {
                                      updateProjectMutation.mutate({ id: projectId, data: { status: colKey } });
                                    } else {
                                      updateProjectMutation.mutate({ id: projectId, data: { category: colKey } });
                                    }
                                  }
                                  setDraggingProjectId(null);
                                  setDragOverColumn(null);
                                  setDragOverProjectIndex(null);
                                }}
                                onClick={() => navigate(`/projects/${project._id}`)}
                                className={`p-3.5 bg-card rounded-2xl ${catMeta.accentBorder} transition-all cursor-grab active:cursor-grabbing space-y-2.5 group ${
                                  isBeingDragged
                                    ? 'opacity-30 scale-95 ring-1 ring-primary/40'
                                    : ' hover:-translate-y-0.5'
                                }`}
                              >
                                {/* Compact Row 1: Name + Enlarge Button */}
                                <div className="flex items-start justify-between gap-2">
                                  <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1 flex-1 min-w-0">
                                    {project.name}
                                  </h4>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {isExpanded && canCreate && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedProject(project);
                                          setShowAddModal(true);
                                        }}
                                        className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                        title="Edit Project"
                                      >
                                        <Edit2 size={12} />
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) => toggleProjectExpand(e, project._id)}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/80 hover:bg-secondary text-foreground text-[10px] font-semibold transition-colors cursor-pointer"
                                      title={isExpanded ? 'Collapse card' : 'Enlarge card'}
                                      aria-label={isExpanded ? 'Collapse card' : 'Enlarge card'}
                                    >
                                      {isExpanded ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
                                      <span>{isExpanded ? 'Less' : 'Enlarge'}</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Compact Row 2: Category & Tasks */}
                                <div className="flex items-center justify-between gap-2 flex-wrap tabular-nums">
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${catMeta.badgeClass}`}>
                                    <CatIcon size={11} className="shrink-0" />
                                    <span className="truncate max-w-[145px]">{catMeta.shortLabel || catMeta.label}</span>
                                  </span>

                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-secondary text-foreground">
                                    <ListChecks size={12} className="text-muted-foreground shrink-0" />
                                    <span>{project.totalTasks || 0} {(project.totalTasks || 0) === 1 ? 'task' : 'tasks'}</span>
                                  </span>
                                </div>

                                {/* Remaining Details Revealed When Enlarged */}
                                {isExpanded && (
                                  <div className="space-y-2.5 pt-1.5">
                                    {/* Start Date & End Date */}
                                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-background text-[10px] tabular-nums">
                                      <div>
                                        <span className="text-muted-foreground block font-medium">Start Date</span>
                                        <span className="font-bold text-foreground">
                                          {project.startDate
                                            ? new Date(project.startDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                                            : '—'}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-muted-foreground block font-medium">End Date</span>
                                        <span className="font-bold flex items-center gap-1 text-foreground">
                                          <span>
                                            {(project.endDate || project.dueDate)
                                              ? new Date(project.endDate || project.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                                              : 'Ongoing'}
                                          </span>
                                          {isOverdue && (
                                            <span className="text-[8px] px-1 py-0.2 rounded bg-foreground text-background font-black">LATE</span>
                                          )}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Completion Progress */}
                                    <div className="space-y-1.5 tabular-nums">
                                      <div className="flex items-center justify-between text-[11px] font-semibold">
                                        <span className="text-muted-foreground">Completion</span>
                                        <span className="text-muted-foreground font-bold text-[10px]">
                                          {project.doneTasks || 0}/{project.totalTasks || 0} ({project.progress || 0}%)
                                        </span>
                                      </div>
                                      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all duration-300 ${
                                            (project.progress || 0) >= 100
                                              ? 'bg-foreground'
                                              : (project.progress || 0) >= 50
                                              ? 'bg-foreground/80'
                                              : (project.progress || 0) > 0
                                              ? 'bg-muted-foreground/60'
                                              : 'bg-muted-foreground/30'
                                          }`}
                                          style={{ width: `${Math.max(0, Math.min(project.progress || 0, 100))}%` }}
                                        />
                                      </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground">
                                      <span className="truncate font-medium">
                                        {catMeta.label}
                                      </span>
                                      <span className="group-hover:text-foreground font-bold flex items-center gap-0.5 shrink-0 transition-colors">
                                        Open <ArrowRight size={10} />
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </React.Fragment>
                          );
                        })}

                        {/* Drop indicator at bottom */}
                        {isColActive && dragOverProjectIndex >= colProjects.length && (
                          <div className="h-1.5 rounded-full bg-primary/70 my-1 " />
                        )}

                        {colProjects.length === 0 && (
                          <div
                            className={`p-8 text-center text-xs rounded-xl transition-all ${
                              isColActive
                                ? ' bg-primary/10 text-primary font-semibold'
                                : ' text-muted-foreground'
                            }`}
                          >
                            {isColActive ? `Drop here to set ${boardGroupBy} to ${col.label}` : `No ${col.label} projects`}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        </DatabaseView>
      </div>

      {/* Add / Edit Project Modal */}
      <AddProjectModal
        open={showAddModal}
        onOpenChange={(open) => {
          setShowAddModal(open);
          if (!open) setSelectedProject(null);
        }}
        project={selectedProject}
      />

      {/* Delete Project Confirmation Dialog */}
      <AlertDialog open={!!deleteProjectId} onOpenChange={(open) => !open && setDeleteProjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription className="sr-only">
              Are you sure you want to delete this project? All associated tasks, milestones, and notes will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Project
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspacePage>
  );
};

export default Projects;
