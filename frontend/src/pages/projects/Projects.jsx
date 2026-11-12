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
  DollarSign,
  Layers,
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
import { formatINR } from '../../utils/currency';
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
  { value: 'budget_desc', label: 'Budget: High to Low' },
  { value: 'budget_asc', label: 'Budget: Low to High' },
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
  const projectsBoardRef = useRef(null);

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
      if (sortBy === 'budget_desc') {
        const valA = a.budget || a.budgetDetails?.totalBudget || a.budgetDetails?.quotedAmount || 0;
        const valB = b.budget || b.budgetDetails?.totalBudget || b.budgetDetails?.quotedAmount || 0;
        return valB - valA;
      }
      if (sortBy === 'budget_asc') {
        const valA = a.budget || a.budgetDetails?.totalBudget || a.budgetDetails?.quotedAmount || 0;
        const valB = b.budget || b.budgetDetails?.totalBudget || b.budgetDetails?.quotedAmount || 0;
        return valA - valB;
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
  const totalBudget = filteredProjects.reduce(
    (sum, p) => sum + (p.budget || p.budgetDetails?.totalBudget || p.budgetDetails?.quotedAmount || 0),
    0
  );
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
            <div className={`p-2 rounded-xl border shrink-0 mt-0.5 ${catMeta.badgeClass}`}>
              <CatIcon size={14} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-foreground text-xs hover:text-primary transition-colors cursor-pointer flex items-center gap-1.5">
                <span className="truncate">{row.name}</span>
                {row.priority === 'Critical' && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-foreground text-background border border-foreground shrink-0 uppercase tracking-wider">
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
      label: 'Category / Type',
      render: (row) => {
        const catMeta = getProjectCategoryMeta(row.category);
        const Icon = catMeta.icon;

        return (
          <div className="flex items-center">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${catMeta.badgeClass}`}
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
      key: 'priority',
      label: 'Priority',
      render: (row) => (
        <StatusBadge tone={projectPriorityTone[row.priority] || 'neutral'}>
          {row.priority || 'Medium'}
        </StatusBadge>
      ),
    },
    {
      key: 'progress',
      label: 'Progress & Tasks',
      render: (row) => (
        <div className="w-32 space-y-1.5 tabular-nums">
          <div className="flex items-center justify-between text-[10px] font-bold">
            <span className="text-muted-foreground">
              {row.totalTasks ? `${row.doneTasks || 0}/${row.totalTasks} tasks` : `${row.progress || 0}%`}
            </span>
            <span
              className={
                (row.progress || 0) >= 50
                  ? 'text-foreground font-extrabold'
                  : 'text-muted-foreground'
              }
            >
              {row.progress || 0}%
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
      key: 'budget',
      label: 'Budget / Value',
      render: (row) => {
        const val = row.budget || row.budgetDetails?.totalBudget || row.budgetDetails?.quotedAmount || 0;
        return (
          <div className="text-xs font-bold text-foreground tabular-nums">
            {val > 0 ? formatINR(val) : <span className="text-muted-foreground font-normal">—</span>}
          </div>
        );
      },
    },
    {
      key: 'timeline',
      label: 'Timeline & Due',
      render: (row) => {
        const isOverdue = row.endDate && new Date(row.endDate) < new Date() && row.status !== 'Completed';

        return (
          <div className="text-[11px] space-y-0.5 tabular-nums">
            {row.endDate ? (
              <div
                className={`flex items-center gap-1 font-semibold ${
                  isOverdue ? 'text-foreground font-bold' : 'text-foreground/90'
                }`}
              >
                <Calendar size={11} className="shrink-0" />
                <span>Due {new Date(row.endDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                {isOverdue && <span className="text-[9px] px-1 py-0.2 rounded bg-foreground text-background font-black">LATE</span>}
              </div>
            ) : (
              <span className="text-muted-foreground">Ongoing</span>
            )}
            <div className="text-[10px] text-muted-foreground">
              {row.createdAt ? `Created ${new Date(row.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}` : ''}
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
              className="h-6 w-6 rounded-full bg-primary/20 text-primary border border-background flex items-center justify-center text-[10px] font-bold shadow-xs"
            >
              {row.manager.name?.charAt(0) || 'M'}
            </div>
          )}
          {row.team && row.team.length > 0 ? (
            row.team.slice(0, 3).map((m, idx) => (
              <div
                key={m._id || idx}
                title={m.name}
                className="h-6 w-6 rounded-full bg-secondary text-foreground border border-background flex items-center justify-center text-[10px] font-bold shadow-xs"
              >
                {m.name?.charAt(0) || 'U'}
              </div>
            ))
          ) : !row.manager ? (
            <span className="text-[11px] text-muted-foreground">—</span>
          ) : null}
          {row.team && row.team.length > 3 && (
            <div className="h-6 w-6 rounded-full bg-muted text-muted-foreground border border-background flex items-center justify-center text-[9px] font-bold">
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
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded-xl shadow-xs transition-all hover:bg-primary/90 min-h-[38px] cursor-pointer"
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
          <div className="p-3.5 bg-card rounded-2xl border border-border shadow-xs flex flex-col justify-between space-y-2 relative overflow-hidden group hover:border-foreground/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Total Projects</span>
              <div className="h-7 w-7 rounded-xl bg-secondary text-foreground border border-border flex items-center justify-center shrink-0">
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
          <div className="p-3.5 bg-card rounded-2xl border border-border shadow-xs flex flex-col justify-between space-y-2 relative overflow-hidden group hover:border-foreground/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">In Delivery</span>
              <div className="h-7 w-7 rounded-xl bg-secondary text-foreground border border-border flex items-center justify-center shrink-0">
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
          <div className="p-3.5 bg-card rounded-2xl border border-border shadow-xs flex flex-col justify-between space-y-2 relative overflow-hidden group hover:border-foreground/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Planning</span>
              <div className="h-7 w-7 rounded-xl bg-secondary text-foreground border border-border flex items-center justify-center shrink-0">
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
          <div className="p-3.5 bg-card rounded-2xl border border-border shadow-xs flex flex-col justify-between space-y-2 relative overflow-hidden group hover:border-foreground/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">On Hold</span>
              <div className="h-7 w-7 rounded-xl bg-secondary text-foreground border border-border flex items-center justify-center shrink-0">
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
          <div className="p-3.5 bg-card rounded-2xl border border-border shadow-xs flex flex-col justify-between space-y-2 relative overflow-hidden group hover:border-foreground/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Completed</span>
              <div className="h-7 w-7 rounded-xl bg-secondary text-foreground border border-border flex items-center justify-center shrink-0">
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

          {/* Total Budget / Pipeline Value Card (Agency Staff Only) */}
          {user?.role !== 'client' && (
            <div className="p-3.5 bg-card rounded-2xl border border-border shadow-xs flex flex-col justify-between space-y-2 relative overflow-hidden group hover:border-foreground/30 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Pipeline Value</span>
                <div className="h-7 w-7 rounded-xl bg-secondary text-foreground border border-border flex items-center justify-center shrink-0">
                  <DollarSign size={14} />
                </div>
              </div>
              <div>
                <div className="text-xl font-black text-foreground tracking-tight truncate">
                  {formatINR(totalBudget)}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                  Active project budget
                </div>
              </div>
            </div>
          )}
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
                  <div className="flex items-center bg-secondary/70 p-0.5 rounded-xl border border-border shrink-0">
                    <button
                      type="button"
                      onClick={() => setBoardGroupBy('status')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        boardGroupBy === 'status'
                          ? 'bg-card text-foreground shadow-xs'
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
                          ? 'bg-card text-foreground shadow-xs'
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
                    className="h-8 px-2.5 text-xs text-foreground hover:text-foreground bg-secondary hover:bg-muted border border-border flex items-center gap-1 rounded-xl transition-all font-bold cursor-pointer"
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
              emptyTitle="No projects match the selected filters"
              emptyDescription="Try clearing your category or status filters to view more projects."
            />
          )}

          {/* 2. BOARD (KANBAN) VIEW */}
          {(currentView === 'board' || currentView === 'kanban') && (
            <div className="space-y-3.5 w-full">
              {/* Category Color Definition Guide */}
              <CategoryColorLegend
                selectedCategory={categoryFilter}
                onSelectCategory={setCategoryFilter}
                title="Project Category Color Index"
                description="Card left-border accent indicates project discipline (click any color pill to filter)"
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
                      className={`flex flex-col min-h-[520px] max-h-[calc(100vh-320px)] rounded-2xl border transition-all p-3 space-y-3 ${
                        boardGroupBy === 'status' && boardColumns.length <= 4
                          ? 'w-full'
                          : 'w-[300px] shrink-0'
                      } ${
                        isColActive
                          ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                          : 'border-border/80 bg-secondary/15'
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
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-card border border-border text-foreground shadow-xs tabular-nums">
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

                          return (
                            <React.Fragment key={project._id}>
                              {showDropIndicatorBefore && (
                                <div className="h-1.5 rounded-full bg-primary/70 my-1 shadow-xs" />
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
                                className={`p-3.5 bg-card rounded-2xl border border-border border-l-[4px] ${catMeta.accentBorder} hover:border-primary/50 transition-all cursor-grab active:cursor-grabbing space-y-3 group shadow-xs ${
                                  isBeingDragged
                                    ? 'opacity-30 scale-95 border-dashed border-primary ring-1 ring-primary/40'
                                    : 'hover:shadow-md hover:-translate-y-0.5'
                                }`}
                              >
                                {/* Card Header: Category & Priority Badges */}
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${catMeta.badgeClass}`}>
                                    <CatIcon size={11} className="shrink-0" />
                                    <span className="truncate max-w-[120px]">{catMeta.shortLabel}</span>
                                  </span>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider ${
                                        project.priority === 'Critical'
                                          ? 'bg-foreground text-background border border-foreground'
                                          : project.priority === 'High'
                                          ? 'bg-muted text-foreground border border-border'
                                          : 'bg-secondary text-muted-foreground'
                                      }`}
                                    >
                                      {project.priority || 'Med'}
                                    </span>
                                    {canCreate && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedProject(project);
                                          setShowAddModal(true);
                                        }}
                                        className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-primary transition-colors"
                                        title="Edit Project"
                                      >
                                        <Edit2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Project Name & Client */}
                                <div className="space-y-1">
                                  <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                                    {project.name}
                                  </h4>
                                  <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                                    {project.client?.name ? (
                                      <>
                                        <Building2 size={11} className="text-muted-foreground/70 shrink-0" />
                                        <span className="truncate">{project.client.name}</span>
                                      </>
                                    ) : project.category === 'saas_product' || project.isInternal ? (
                                      <span className="font-semibold text-foreground truncate flex items-center gap-1">
                                        <Rocket size={11} className="text-muted-foreground shrink-0" />
                                        <span className="truncate">SaaS / Platform</span>
                                      </span>
                                    ) : (
                                      <span className="truncate flex items-center gap-1">
                                        <Building2 size={11} className="text-muted-foreground/70 shrink-0" />
                                        <span className="truncate">Internal Project</span>
                                      </span>
                                    )}
                                  </p>
                                </div>

                                {/* Progress Bar & Task Completion */}
                                <div className="space-y-1.5 pt-0.5 tabular-nums">
                                  <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                                    <span>
                                      {project.totalTasks ? `${project.doneTasks || 0}/${project.totalTasks} tasks` : 'Progress'}
                                    </span>
                                    <span
                                      className={`font-bold ${
                                        (project.progress || 0) >= 50
                                          ? 'text-foreground'
                                          : 'text-muted-foreground'
                                      }`}
                                    >
                                      {project.progress || 0}%
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

                                {/* Footer: Timeline & Open Link */}
                                <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10px] text-muted-foreground tabular-nums">
                                  <div className="flex items-center gap-1.5 truncate">
                                    {project.endDate ? (
                                      <span
                                        className={`flex items-center gap-1 font-semibold ${
                                          isOverdue ? 'text-foreground font-bold' : ''
                                        }`}
                                      >
                                        <Calendar size={11} className="shrink-0 text-muted-foreground/70" />
                                        <span>Due {new Date(project.endDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                        {isOverdue && <span className="text-[8px] px-1 py-0.2 rounded bg-foreground text-background font-black">LATE</span>}
                                      </span>
                                    ) : (
                                      <span className="flex items-center gap-1 text-muted-foreground">
                                        <Calendar size={11} className="shrink-0" />
                                        <span>Ongoing</span>
                                      </span>
                                    )}
                                  </div>

                                  <span className="group-hover:text-primary font-bold flex items-center gap-0.5 shrink-0 transition-colors">
                                    Open <ArrowRight size={10} />
                                  </span>
                                </div>
                              </div>
                            </React.Fragment>
                          );
                        })}

                        {/* Drop indicator at bottom */}
                        {isColActive && dragOverProjectIndex >= colProjects.length && (
                          <div className="h-1.5 rounded-full bg-primary/70 my-1 shadow-xs" />
                        )}

                        {colProjects.length === 0 && (
                          <div
                            className={`p-8 text-center text-xs border border-dashed rounded-xl transition-all ${
                              isColActive
                                ? 'border-primary bg-primary/10 text-primary font-semibold'
                                : 'border-border/60 text-muted-foreground'
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
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
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
