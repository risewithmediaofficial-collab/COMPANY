import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api';
import { devApi } from '../../api/development';
import { DevelopmentSubNav } from '../../components/development/DevelopmentSubNav';
import { PageHeader } from '../../components/ui/page';
import { useDateFilter } from '../../context/DateFilterContext';
import { TaskDetailModal } from '../../components/ui/TaskDetailModal';
import { CreateDevTaskModal } from '../../components/development/CreateDevTaskModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '../../components/ui/dialog';
import {
  Kanban,
  Search,
  Filter,
  PlusCircle,
  RefreshCcw,
  ShieldAlert,
  GitPullRequest,
  Bug,
  Calendar,
  Briefcase,
  User,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  AlertTriangle,
  Flame,
  Clock,
  ExternalLink,
  GripVertical,
  Zap,
  X,
} from '@/components/ui/muiIcons';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

const PIPELINE_COLUMNS = [
  { id: 'backlog', title: 'Backlog', color: 'border-border bg-secondary/20' },
  { id: 'analysis', title: 'Analysis', color: 'border-border bg-secondary/30' },
  { id: 'ready_for_dev', title: 'Ready for Dev', color: 'border-border bg-secondary/35' },
  { id: 'in_development', title: 'In Development', color: 'border-foreground/30 bg-secondary/50' },
  { id: 'code_review', title: 'Code Review', color: 'border-border bg-secondary/40' },
  { id: 'qa_testing', title: 'QA / Testing', color: 'border-border bg-secondary/40' },
  { id: 'client_uat', title: 'Client / UAT', color: 'border-border bg-secondary/35' },
  { id: 'approved', title: 'Approved', color: 'border-foreground/30 bg-secondary/45' },
  { id: 'deployment', title: 'Deployment', color: 'border-border bg-secondary/35' },
  { id: 'live', title: 'Live', color: 'border-foreground/40 bg-secondary/50' },
  { id: 'closed', title: 'Closed', color: 'border-border bg-muted/40' },
];

const PRIORITY_BADGES = {
  urgent: 'bg-primary text-primary-foreground border-primary',
  high: 'bg-zinc-800 text-zinc-100 border-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:border-zinc-300',
  medium: 'bg-secondary text-foreground border-border',
  low: 'bg-muted text-muted-foreground border-border',
};

export default function DevelopmentBoard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlProjectId = searchParams.get('project') || searchParams.get('projectId') || '';

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sprints, setSprints] = useState([]);

  // Filters
  const [filterSprint, setFilterSprint] = useState('');
  const [filterProject, setFilterProject] = useState(urlProjectId);
  const [filterDeveloper, setFilterDeveloper] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterBlockedOnly, setFilterBlockedOnly] = useState(false);
  const [filterBugOnly, setFilterBugOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { isDateInRange, isFiltered: isGlobalDateFiltered, resetDateFilter } = useDateFilter();

  useEffect(() => {
    if (urlProjectId && urlProjectId !== filterProject) {
      setFilterProject(urlProjectId);
    }
  }, [urlProjectId]);

  // Sprints, Projects, Developers lists
  const [projectsList, setProjectsList] = useState([]);
  const [developersList, setDevelopersList] = useState([]);

  // Discovered entities cache from all loaded tasks so dropdowns never lose options when filtered
  const [discoveredProjects, setDiscoveredProjects] = useState([]);
  const [discoveredDevelopers, setDiscoveredDevelopers] = useState([]);
  const [discoveredSprints, setDiscoveredSprints] = useState([]);

  // Task detail & Add task modal states
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);

  // Blocked modal state
  const [blockingTask, setBlockingTask] = useState(null);
  const [blockedReasonInput, setBlockedReasonInput] = useState('');

  // Drag and Drop state
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [dragOverColId, setDragOverColId] = useState(null);
  const isDraggingRef = useRef(false);

  // Fetch Sprints & Tasks
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, sprintsRes, projectsRes, usersRes] = await Promise.all([
        devApi.getTasks({
          sprint: filterSprint || undefined,
          project: filterProject || undefined,
          developer: filterDeveloper || undefined,
          isBlocked: filterBlockedOnly ? 'true' : undefined,
          isBug: filterBugOnly ? 'true' : undefined,
          search: searchQuery.trim() || undefined,
        }),
        devApi.getSprints().catch(() => ({ data: { data: [] } })),
        api.get('/projects').catch(() => ({ data: { projects: [] } })),
        api.get('/users').catch(() => ({ data: { users: [] } })),
      ]);

      if (tasksRes.data?.success) {
        const loadedTasks = tasksRes.data.data || [];
        setTasks(loadedTasks);

        // Update discovered projects cache from loaded tasks
        const newProjMap = new Map();
        loadedTasks.forEach((t) => {
          if (t.project && typeof t.project === 'object' && t.project._id) {
            newProjMap.set(t.project._id.toString(), { _id: t.project._id.toString(), name: t.project.name || 'CRM Project' });
          } else if (t.project && typeof t.project === 'string') {
            newProjMap.set(t.project, { _id: t.project, name: t.project });
          }
        });
        if (newProjMap.size > 0) {
          setDiscoveredProjects((prev) => {
            const merged = new Map(prev.map((p) => [p._id, p]));
            newProjMap.forEach((v, k) => merged.set(k, v));
            return Array.from(merged.values());
          });
        }

        // Update discovered developers cache from loaded tasks
        const newDevMap = new Map();
        loadedTasks.forEach((t) => {
          const dev = t.development?.developer;
          if (dev && typeof dev === 'object' && dev._id) {
            newDevMap.set(dev._id.toString(), { _id: dev._id.toString(), name: dev.name || dev.email });
          }
          if (Array.isArray(t.assignedTo)) {
            t.assignedTo.forEach((u) => {
              if (u && typeof u === 'object' && u._id) {
                newDevMap.set(u._id.toString(), { _id: u._id.toString(), name: u.name || u.email });
              }
            });
          }
        });
        if (newDevMap.size > 0) {
          setDiscoveredDevelopers((prev) => {
            const merged = new Map(prev.map((d) => [d._id, d]));
            newDevMap.forEach((v, k) => merged.set(k, v));
            return Array.from(merged.values());
          });
        }

        // Update discovered sprints cache from loaded tasks
        const newSprintMap = new Map();
        loadedTasks.forEach((t) => {
          const sp = t.development?.sprint;
          if (sp && typeof sp === 'object' && sp._id) {
            newSprintMap.set(sp._id.toString(), { _id: sp._id.toString(), name: sp.name || 'Sprint', status: sp.status || 'active' });
          }
        });
        if (newSprintMap.size > 0) {
          setDiscoveredSprints((prev) => {
            const merged = new Map(prev.map((s) => [s._id, s]));
            newSprintMap.forEach((v, k) => merged.set(k, v));
            return Array.from(merged.values());
          });
        }
      }

      if (sprintsRes.data?.success) {
        setSprints(sprintsRes.data.data || []);
      }
      if (projectsRes.data?.projects) {
        setProjectsList(projectsRes.data.projects || []);
      }
      if (usersRes.data?.users) {
        setDevelopersList(usersRes.data.users || []);
      }
    } catch (err) {
      console.error('Failed to load board data:', err);
      toast.error('Failed to load development tasks');
    } finally {
      setLoading(false);
    }
  }, [filterSprint, filterProject, filterDeveloper, filterBlockedOnly, filterBugOnly, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Unified projects list from API + discovered from tasks
  const allProjects = useMemo(() => {
    const map = new Map();
    projectsList.forEach((p) => {
      if (p?._id) map.set(p._id.toString(), { _id: p._id.toString(), name: p.name || 'Project' });
    });
    discoveredProjects.forEach((p) => {
      if (p?._id && !map.has(p._id.toString())) map.set(p._id.toString(), p);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [projectsList, discoveredProjects]);

  // Unified developers list from API + discovered from tasks
  const allDevelopers = useMemo(() => {
    const map = new Map();
    developersList.forEach((u) => {
      if (u?._id) map.set(u._id.toString(), { _id: u._id.toString(), name: u.name || u.email });
    });
    discoveredDevelopers.forEach((d) => {
      if (d?._id && !map.has(d._id.toString())) map.set(d._id.toString(), d);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [developersList, discoveredDevelopers]);

  // Unified sprints list from API + discovered from tasks
  const allSprints = useMemo(() => {
    const map = new Map();
    sprints.forEach((s) => {
      if (s?._id) map.set(s._id.toString(), { _id: s._id.toString(), name: s.name, status: s.status });
    });
    discoveredSprints.forEach((s) => {
      if (s?._id && !map.has(s._id.toString())) map.set(s._id.toString(), s);
    });
    return Array.from(map.values());
  }, [sprints, discoveredSprints]);

  // Filter tasks by priority and global date filter locally
  const displayedTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (filterPriority && t.priority?.toLowerCase() !== filterPriority.toLowerCase()) {
        return false;
      }
      return isDateInRange([t.dueDate, t.createdAt, t.updatedAt]);
    });
  }, [tasks, filterPriority, isDateInRange]);

  const hasActiveFilters = Boolean(
    filterSprint || filterProject || filterDeveloper || filterPriority || filterBlockedOnly || filterBugOnly || searchQuery.trim() || isGlobalDateFiltered
  );

  const clearAllFilters = () => {
    setFilterSprint('');
    setFilterProject('');
    setFilterDeveloper('');
    setFilterPriority('');
    setFilterBlockedOnly(false);
    setFilterBugOnly(false);
    setSearchQuery('');
    if (isGlobalDateFiltered) resetDateFilter();
    if (urlProjectId) {
      const next = new URLSearchParams(searchParams);
      next.delete('project');
      next.delete('projectId');
      setSearchParams(next, { replace: true });
    }
  };

  // Handle stage transition (with optimistic UI update)
  const handleStageChange = async (taskId, newStage) => {
    if (!taskId || !newStage) return;

    // Optimistically update local state immediately
    setTasks((prev) =>
      prev.map((t) => {
        if (t._id === taskId) {
          return {
            ...t,
            development: {
              ...(t.development || {}),
              stage: newStage,
              previousStage: t.development?.stage || 'backlog',
            },
          };
        }
        return t;
      })
    );

    try {
      await devApi.updateStage(taskId, { stage: newStage });
      toast.success(`Task moved to ${newStage.replace(/_/g, ' ')}`);
      fetchData();
    } catch (err) {
      console.error('Failed to update stage:', err);
      toast.error(err.response?.data?.message || 'Failed to move task');
      fetchData(); // Rollback on failure
    }
  };

  // Handle Block / Unblock
  const handleToggleBlock = async (task) => {
    const isCurrentlyBlocked = task.development?.isBlocked || task.development?.stage === 'blocked';
    if (isCurrentlyBlocked) {
      // Unblock
      try {
        await devApi.toggleBlocked(task._id, { isBlocked: false });
        toast.success('Task unblocked');
        fetchData();
      } catch (err) {
        toast.error('Failed to unblock task');
      }
    } else {
      // Prompt block reason
      setBlockingTask(task);
      setBlockedReasonInput('');
    }
  };

  const confirmBlock = async () => {
    if (!blockingTask) return;
    try {
      await devApi.toggleBlocked(blockingTask._id, {
        isBlocked: true,
        blockedReason: blockedReasonInput || 'Blocked by team',
      });
      toast.success('Task marked as Blocked');
      setBlockingTask(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to block task');
    }
  };

  // Group tasks by column stage
  const groupedTasks = useMemo(() => {
    const map = {};
    PIPELINE_COLUMNS.forEach((col) => {
      map[col.id] = [];
    });

    displayedTasks.forEach((t) => {
      const stage = t.development?.stage || 'backlog';
      if (map[stage]) {
        map[stage].push(t);
      } else {
        map['backlog'].push(t);
      }
    });

    return map;
  }, [displayedTasks]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Development Board"
        subtitle="Track and transition existing CRM tasks across all stages of the development pipeline"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 bg-secondary border border-border text-foreground font-semibold rounded-xl text-xs hover:bg-secondary/80 transition-all shadow-xs"
            >
              <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            {/* ── RULE: Uses existing task creation modal ─────────── */}
            <button
              id="dev-create-task-btn"
              onClick={() => setShowAddTaskModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs shadow-md shadow-primary/25 hover:opacity-95 transition-all"
            >
              <PlusCircle size={14} />
              Add Task
            </button>
          </div>
        }
      />

      <DevelopmentSubNav />

      {/* ── Filter Bar ───────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 items-center">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search title, branch, PR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="app-input w-full pl-8 pr-3 text-xs h-9 py-1.5"
            />
          </div>

          {/* Project Filter */}
          <div className="relative">
            <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="app-select w-full pl-8 pr-8 text-xs h-9 py-1.5 font-medium truncate"
              title="Filter by Project"
            >
              <option value="">All Projects ({allProjects.length})</option>
              {allProjects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Developer / Assignee Filter */}
          <div className="relative">
            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <select
              value={filterDeveloper}
              onChange={(e) => setFilterDeveloper(e.target.value)}
              className="app-select w-full pl-8 pr-8 text-xs h-9 py-1.5 font-medium truncate"
              title="Filter by Developer"
            >
              <option value="">All Developers ({allDevelopers.length})</option>
              {allDevelopers.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sprint Filter */}
          <div className="relative">
            <Zap size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <select
              value={filterSprint}
              onChange={(e) => setFilterSprint(e.target.value)}
              className="app-select w-full pl-8 pr-8 text-xs h-9 py-1.5 font-medium truncate"
              title="Filter by Sprint"
            >
              <option value="">
                {allSprints.length === 0 ? 'All Sprints (No active sprints)' : `All Sprints (${allSprints.length})`}
              </option>
              {allSprints.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} {s.status ? `(${s.status})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="app-select w-full pl-8 pr-8 text-xs h-9 py-1.5 font-medium truncate"
              title="Filter by Priority"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Toggles & Reset */}
          <div className="flex items-center gap-1.5">
            {/* Blocked Only Toggle */}
            <label
              className={`flex-1 flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold select-none h-9 px-2 rounded-xl border transition-all ${
                filterBlockedOnly
                  ? 'bg-primary border-primary text-primary-foreground shadow-xs'
                  : 'bg-secondary/40 border-border text-muted-foreground hover:text-foreground'
              }`}
              title="Show only blocked tasks"
            >
              <input
                type="checkbox"
                checked={filterBlockedOnly}
                onChange={(e) => setFilterBlockedOnly(e.target.checked)}
                className="sr-only"
              />
              <ShieldAlert size={13} />
              <span className="text-[11px]">Blocked</span>
            </label>

            {/* Bug Only Toggle */}
            <label
              className={`flex-1 flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold select-none h-9 px-2 rounded-xl border transition-all ${
                filterBugOnly
                  ? 'bg-primary border-primary text-primary-foreground shadow-xs'
                  : 'bg-secondary/40 border-border text-muted-foreground hover:text-foreground'
              }`}
              title="Show only bug tasks"
            >
              <input
                type="checkbox"
                checked={filterBugOnly}
                onChange={(e) => setFilterBugOnly(e.target.checked)}
                className="sr-only"
              />
              <Bug size={13} />
              <span className="text-[11px]">Bugs</span>
            </label>

            {/* Clear All Filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="flex items-center justify-center gap-1 h-9 px-2.5 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-colors border border-border shrink-0 cursor-pointer"
                title="Reset all filters"
              >
                <X size={12} />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Kanban Columns Horizon ───────────────────────────────────── */}
      <div className="responsive-table-container overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex items-start gap-3 min-w-[2800px] pt-1">
          {PIPELINE_COLUMNS.map((column) => {
            const colTasks = groupedTasks[column.id] || [];
            const isColumnDraggedOver = dragOverColId === column.id;

            return (
              <div
                key={column.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  if (dragOverColId !== column.id) {
                    setDragOverColId(column.id);
                  }
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOverColId(column.id);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    if (dragOverColId === column.id) {
                      setDragOverColId(null);
                    }
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const droppedTaskId = e.dataTransfer.getData('taskId') || draggingTaskId;
                  if (droppedTaskId) {
                    handleStageChange(droppedTaskId, column.id);
                  }
                  setDraggingTaskId(null);
                  setDragOverColId(null);
                }}
                className={`w-[260px] rounded-2xl border p-3 flex flex-col shrink-0 h-[calc(100vh-270px)] min-h-[480px] max-h-[750px] transition-all duration-150 ${
                  isColumnDraggedOver
                    ? 'ring-2 ring-primary ring-offset-2 bg-primary/10 border-primary shadow-lg scale-[1.01]'
                    : column.color
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-border shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-xs uppercase tracking-wider">
                      {column.title}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-card border border-border text-foreground font-mono">
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                {/* Task Cards Container (with inline vertical scroll) */}
                <div
                  className="space-y-2.5 flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 flex flex-col"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverColId !== column.id) setDragOverColId(column.id);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const droppedTaskId = e.dataTransfer.getData('taskId') || draggingTaskId;
                    if (droppedTaskId) {
                      handleStageChange(droppedTaskId, column.id);
                    }
                    setDraggingTaskId(null);
                    setDragOverColId(null);
                  }}
                >
                  {colTasks.length === 0 ? (
                    <div className={`flex-1 flex items-center justify-center py-8 text-center text-[11px] italic border-2 border-dashed rounded-xl m-1 transition-all ${
                      isColumnDraggedOver
                        ? 'border-primary/60 bg-primary/5 text-primary font-semibold'
                        : 'border-border/40 text-muted-foreground/50'
                    }`}>
                      {isColumnDraggedOver ? 'Drop here to move' : 'No tasks in this stage'}
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const dev = task.development || {};
                      const isBlocked = dev.isBlocked || dev.stage === 'blocked';
                      const devUser = dev.developer || (task.assignedTo && task.assignedTo[0]);
                      const isCardBeingDragged = task._id === draggingTaskId;

                      return (
                        <div
                          key={task._id}
                          draggable={true}
                          onDragStart={(e) => {
                            isDraggingRef.current = true;
                            setDraggingTaskId(task._id);
                            e.dataTransfer.setData('taskId', task._id);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={() => {
                            setTimeout(() => {
                              isDraggingRef.current = false;
                            }, 100);
                            setDraggingTaskId(null);
                            setDragOverColId(null);
                          }}
                          className={`p-3 bg-card border rounded-xl shadow-xs space-y-2 hover:shadow-md transition-all group relative cursor-grab active:cursor-grabbing select-none ${
                            isCardBeingDragged
                              ? 'opacity-40 scale-95 border-dashed border-foreground ring-2 ring-ring/40'
                              : isBlocked
                              ? 'border-foreground bg-secondary/50'
                              : 'border-border hover:border-foreground/40'
                          }`}
                          onClick={() => {
                            if (isDraggingRef.current) return;
                            setSelectedTaskId(task._id);
                            setShowTaskDetail(true);
                          }}
                        >
                          {/* Blocked Alert Banner */}
                          {isBlocked && (
                            <div className="px-2 py-1 rounded-md bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <ShieldAlert size={11} /> BLOCKED
                              </span>
                              <span className="truncate max-w-[120px]" title={dev.blockedReason}>
                                {dev.blockedReason || 'Waiting on team'}
                              </span>
                            </div>
                          )}

                          {/* Task Badges (Project / Priority / Bug / Drag Grip) */}
                          <div className="flex items-center justify-between gap-1 flex-wrap">
                            <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-1.5 py-0.5 rounded truncate max-w-[125px]">
                              {task.project?.name || 'CRM Task'}
                            </span>
                            <div className="flex items-center gap-1">
                              {dev.isBug && (
                                <span className="px-1.5 py-0.5 rounded bg-secondary text-foreground border border-border text-[10px] font-bold flex items-center gap-0.5">
                                  <Bug size={9} /> Bug
                                </span>
                              )}
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                  PRIORITY_BADGES[task.priority?.toLowerCase()] || PRIORITY_BADGES.medium
                                }`}
                              >
                                {task.priority || 'Medium'}
                              </span>
                              <GripVertical size={13} className="text-muted-foreground/40 group-hover:text-foreground/70 transition-colors" />
                            </div>
                          </div>

                          {/* Title */}
                          <h4 className="font-bold text-foreground text-xs leading-snug line-clamp-2 group-hover:underline">
                            {task.title}
                          </h4>

                          {/* Git Branch / PR Badges if present */}
                          {(dev.branch || dev.pullRequestNumber || dev.pullRequestUrl) && (
                            <div className="flex items-center gap-1 flex-wrap pt-0.5">
                              {dev.branch && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-secondary text-muted-foreground rounded truncate max-w-[110px]">
                                  {dev.branch}
                                </span>
                              )}
                              {(dev.pullRequestNumber || dev.pullRequestUrl) && (
                                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-secondary text-foreground border border-border rounded flex items-center gap-0.5">
                                  <GitPullRequest size={9} /> #{dev.pullRequestNumber || 'PR'}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Card Footer: Assignee & Stage Move Dropdown */}
                          <div
                            className="flex items-center justify-between gap-1 pt-1.5 border-t border-border text-[10px]"
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                          >
                            {/* Assignee */}
                            <div className="flex items-center gap-1.5 text-muted-foreground min-w-0 flex-1">
                              <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[9px] shrink-0">
                                {devUser?.name ? devUser.name.charAt(0).toUpperCase() : <User size={10} />}
                              </div>
                              <span className="truncate text-[10px] font-medium" title={devUser?.name || 'Unassigned'}>
                                {devUser?.name || 'Unassigned'}
                              </span>
                            </div>

                            {/* Quick Stage Move Dropdown */}
                            <div className="relative shrink-0 max-w-[115px]">
                              <select
                                value={dev.stage || column.id}
                                onChange={(e) => handleStageChange(task._id, e.target.value)}
                                className="w-full appearance-none bg-secondary/80 hover:bg-secondary border border-border text-foreground rounded-lg text-[10px] font-bold py-1 pl-2 pr-5 outline-none cursor-pointer transition-colors truncate focus:border-primary focus:ring-1 focus:ring-primary/20"
                                title="Move task to stage"
                              >
                                {PIPELINE_COLUMNS.map((c) => (
                                  <option key={c.id} value={c.id} className="bg-card text-foreground font-semibold">
                                    {c.title}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Block Reason Side Drawer ──────────────────────────────────── */}
      <Dialog open={!!blockingTask} onOpenChange={(open) => !open && setBlockingTask(null)}>
        <DialogContent
          variant="side"
          size="sm"
          noPadding
          hideCloseButton
          className="flex flex-col min-h-0 p-0 overflow-hidden bg-card border-l border-border shadow-2xl"
        >
          <DialogHeader className="px-5 py-4 border-b border-border bg-card shrink-0 select-none flex flex-row items-center justify-between gap-3 m-0 space-y-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary border border-border text-foreground">
                <ShieldAlert size={18} />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-foreground truncate">
                  Mark Task as Blocked
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground truncate">
                  Document why this task cannot progress
                </DialogDescription>
              </div>
            </div>
            <DialogClose
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary border border-border/70 transition-all cursor-pointer shrink-0"
            >
              <X size={16} />
              <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Provide a reason why <strong className="text-foreground">"{blockingTask?.title}"</strong> is blocked (e.g. Waiting on third-party API keys, design review).
            </p>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">Blocked Reason</label>
              <textarea
                rows={4}
                placeholder="Enter blocked reason..."
                value={blockedReasonInput}
                onChange={(e) => setBlockedReasonInput(e.target.value)}
                className="w-full p-3 bg-background border border-border rounded-xl text-xs text-foreground outline-none focus:border-foreground"
              />
            </div>
          </div>

          <div className="shrink-0 border-t border-border bg-card px-5 py-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setBlockingTask(null)}
              className="app-button-secondary text-xs min-h-[38px] px-4"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmBlock}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:bg-primary/90 shadow-xs min-h-[38px] cursor-pointer"
            >
              Confirm Block
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Existing Task Detail Modal (Reused directly) ─────────────── */}
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          open={showTaskDetail}
          onOpenChange={(isOpen) => {
            setShowTaskDetail(isOpen);
            if (!isOpen) {
              setSelectedTaskId(null);
              fetchData();
            }
          }}
        />
      )}

      {/* ── Task Creation Modal ───────────── */}
      {showAddTaskModal && (
        <CreateDevTaskModal
          isOpen={showAddTaskModal}
          onClose={() => {
            setShowAddTaskModal(false);
            fetchData();
          }}
          onTaskCreated={() => {
            fetchData();
          }}
          defaultProject={filterProject}
          defaultSprint={filterSprint}
        />
      )}
    </div>
  );
}
