import React, { Fragment, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Briefcase,
  Gauge,
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
} from 'lucide-react';
import { useProjects, useDeleteProject, useUpdateProject } from '../../hooks/useProjects';
import { useAutoScrollOnDrag } from '../../hooks/useAutoScrollOnDrag';
import { AddProjectModal } from '../../components/modals/AddProjectModal';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/button';
import { WorkspacePage } from '../../components/ui/WorkspacePage';
import { DatabaseView } from '../../components/ui/DatabaseView';
import { StatusBadge } from '../../components/ui/page';
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
import { DateRangePicker } from '../../components/ui/DateRangePicker';

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

const STATUS_COLUMNS = ['Planning', 'In Progress', 'On Hold', 'Completed'];

const Projects = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [deleteProjectId, setDeleteProjectId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [currentView, setCurrentView] = useState('board'); // 'table' | 'board'
  const [draggingProjectId, setDraggingProjectId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [dragOverProjectIndex, setDragOverProjectIndex] = useState(null);
  const projectsBoardRef = useRef(null);

  // Smooth side auto-scroll while dragging projects
  useAutoScrollOnDrag(projectsBoardRef, Boolean(draggingProjectId));

  const filters = {
    search: searchTerm,
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  const { data: projects = [], isLoading } = useProjects(filters);
  const { isDateInRange } = useDateFilter();

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const rawDate = project.startDate || project.createdAt;
      if (!isDateInRange(rawDate)) return false;
      if (monthFilter !== '') {
        const projectDate = rawDate ? new Date(rawDate) : new Date();
        const projectMonth = projectDate.getMonth();
        if (projectMonth !== Number(monthFilter)) return false;
      }
      return true;
    });
  }, [projects, monthFilter, isDateInRange]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setMonthFilter('');
  };

  const deleteProjectMutation = useDeleteProject();
  const updateProjectMutation = useUpdateProject();

  const inProgressCount = filteredProjects.filter((p) => p.status === 'In Progress').length;
  const completedCount = filteredProjects.filter((p) => p.status === 'Completed').length;
  const totalBudget = filteredProjects.reduce((sum, p) => sum + (p.budget || 0), 0);

  const columns = [
    {
      key: 'name',
      label: 'Project Name',
      render: (row) => (
        <div className="min-w-0">
          <div className="font-bold text-foreground text-xs hover:text-primary transition-colors">
            {row.name}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground truncate">
            {row.client?.name ? `🏢 ${row.client.name}` : row.category === 'saas_product' ? '🚀 SaaS Product' : '🏢 Internal Project'}
          </div>
        </div>
      ),
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
      label: 'Progress',
      render: (row) => (
        <div className="w-28 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
            <span>{row.progress || 0}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                (row.progress || 0) >= 100
                  ? 'bg-emerald-500'
                  : (row.progress || 0) >= 50
                  ? 'bg-primary'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${Math.min(row.progress || 0, 100)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'dates',
      label: 'Timeline',
      render: (row) => (
        <div className="text-[11px] text-muted-foreground">
          {row.endDate ? (
            <span>Due {new Date(row.endDate).toLocaleDateString()}</span>
          ) : (
            <span>Ongoing</span>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created Date',
      render: (row) => (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground whitespace-nowrap">
          <Calendar size={11} className="text-muted-foreground/70" />
          <span>
            {row.createdAt
              ? new Date(row.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
              : '—'}
          </span>
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

  return (
    <WorkspacePage
      title="Projects Workspace"
      subtitle="Connected project delivery pipeline, milestones, and client accounts."
      icon={FolderKanban}
      breadcrumbs={[{ name: 'Delivery', path: '/tasks' }, { name: 'Projects' }]}
      actions={
        canCreate && (
          <Button
            size="sm"
            onClick={() => {
              setSelectedProject(null);
              setShowAddModal(true);
            }}
            className="bg-primary text-primary-foreground font-bold shadow-sm"
          >
            <Plus size={15} className="mr-1.5 stroke-[2.5]" />
            New Project
          </Button>
        )
      }
      properties={
        <>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-card rounded-lg border border-border/80 text-foreground font-semibold">
            <FolderKanban size={13} className="text-primary" />
            <span>Total Projects: {filteredProjects.length}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-600 rounded-lg font-semibold">
            <Clock size={13} />
            <span>In Delivery: {inProgressCount}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-lg font-semibold">
            <CheckCircle2 size={13} />
            <span>Completed: {completedCount}</span>
          </div>
        </>
      }
    >
      {/* Notion-Style Multi-View Database Engine */}
      <DatabaseView
        activeView={currentView}
        onViewChange={setCurrentView}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        totalCount={filteredProjects.length}
        filters={
          <div className="flex items-center gap-2">
            <SelectDropdown
              className="w-36 text-xs"
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              options={['Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled']}
              allOptionLabel="All statuses"
            />
          </div>
        }
      >
        {/* Table View */}
        {currentView === 'table' && (
          <DataTable
            data={filteredProjects}
            columns={columns}
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
            emptyDescription="Create your first client project to start organizing tasks and milestones."
          />
        )}

        {/* Board View (Kanban by Project Status) */}
        {(currentView === 'board' || currentView === 'kanban') && (
          <div ref={projectsBoardRef} className="w-full overflow-x-auto pb-4 custom-scrollbar">
            <div className="grid w-max min-w-full auto-cols-[minmax(280px,320px)] grid-flow-col gap-4">
              {STATUS_COLUMNS.map((status) => {
                const statusProjects = filteredProjects.filter((p) => (p.status || 'Planning') === status);
                const isColActive = dragOverStatus === status;

                return (
                  <div
                    key={status}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverStatus !== status) setDragOverStatus(status);
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) {
                        if (dragOverStatus === status) setDragOverStatus(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const projectId = e.dataTransfer.getData('projectId');
                      if (projectId) {
                        updateProjectMutation.mutate({ id: projectId, data: { status } });
                      }
                      setDraggingProjectId(null);
                      setDragOverStatus(null);
                      setDragOverProjectIndex(null);
                    }}
                    className={`flex flex-col min-h-[500px] max-h-[calc(100vh-300px)] rounded-2xl border transition-all p-3 space-y-3 ${
                      isColActive
                        ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20'
                        : 'border-border/80 bg-secondary/20'
                    }`}
                  >
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground">{status}</span>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-secondary text-muted-foreground">
                        {statusProjects.length}
                      </span>
                    </div>

                    <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-360px)] custom-scrollbar pr-0.5 flex-1">
                      {statusProjects.map((project, idx) => {
                        const isBeingDragged = draggingProjectId === project._id;
                        const showDropIndicatorBefore = isColActive && dragOverProjectIndex === idx && !isBeingDragged;

                        return (
                          <React.Fragment key={project._id}>
                            {showDropIndicatorBefore && (
                              <div className="h-1.5 rounded-full bg-primary/70 animate-pulse my-1 shadow-xs" />
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
                                setDragOverStatus(null);
                                setDragOverProjectIndex(null);
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.dataTransfer.dropEffect = 'move';
                                setDragOverStatus(status);
                                const rect = e.currentTarget.getBoundingClientRect();
                                const midY = rect.top + rect.height / 2;
                                setDragOverProjectIndex(e.clientY < midY ? idx : idx + 1);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const projectId = e.dataTransfer.getData('projectId');
                                if (projectId) {
                                  updateProjectMutation.mutate({ id: projectId, data: { status } });
                                }
                                setDraggingProjectId(null);
                                setDragOverStatus(null);
                                setDragOverProjectIndex(null);
                              }}
                              onClick={() => navigate(`/projects/${project._id}`)}
                              className={`p-3.5 bg-card rounded-xl border border-border hover:border-primary/40 transition-all cursor-grab active:cursor-grabbing space-y-2.5 group shadow-sm ${
                                isBeingDragged ? 'opacity-30 scale-95 border-dashed border-primary ring-1 ring-primary/40' : 'hover:shadow-md hover:-translate-y-0.5'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                                  {project.name}
                                </h4>
                                <span className={`px-2 py-0.2 rounded-md text-[9px] font-bold uppercase ${
                                  project.priority === 'Critical' || project.priority === 'High'
                                    ? 'bg-rose-500/10 text-rose-600'
                                    : 'bg-secondary text-muted-foreground'
                                }`}>
                                  {project.priority || 'Med'}
                                </span>
                              </div>

                              <p className="text-[11px] text-muted-foreground truncate">
                                {project.client?.name ? `🏢 ${project.client.name}` : project.category === 'saas_product' ? '🚀 SaaS Product' : '🏢 Internal Project'}
                              </p>

                              {/* Progress Bar */}
                              <div className="space-y-1 pt-1">
                                <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                                  <span>Progress</span>
                                  <span className={`font-bold ${(project.progress || 0) >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                                    {project.progress || 0}%
                                  </span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      (project.progress || 0) >= 100
                                        ? 'bg-emerald-500'
                                        : (project.progress || 0) >= 50
                                        ? 'bg-primary'
                                        : (project.progress || 0) > 0
                                        ? 'bg-amber-500'
                                        : 'bg-muted-foreground/30'
                                    }`}
                                    style={{ width: `${Math.max(0, Math.min(project.progress || 0, 100))}%` }}
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
                                <div className="flex items-center gap-1.5 truncate">
                                  <span className="flex items-center gap-1">
                                    <Calendar size={10} className="text-primary/70 shrink-0" />
                                    <span>
                                      {project.createdAt
                                        ? `Created ${new Date(project.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
                                        : ''}
                                    </span>
                                  </span>
                                  {project.endDate && (
                                    <span>• Due {new Date(project.endDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                  )}
                                </div>
                                <span className="group-hover:text-primary flex items-center gap-0.5 font-semibold shrink-0">
                                  Open <ArrowRight size={10} />
                                </span>
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}

                      {/* Drop indicator at the bottom of the column */}
                      {isColActive && dragOverProjectIndex >= statusProjects.length && (
                        <div className="h-1.5 rounded-full bg-primary/70 animate-pulse my-1 shadow-xs" />
                      )}

                      {statusProjects.length === 0 && (
                        <div className={`p-8 text-center text-xs border border-dashed rounded-xl transition-all ${
                          isColActive ? 'border-primary bg-primary/10 text-primary font-semibold' : 'border-border/60 text-muted-foreground'
                        }`}>
                          {isColActive ? `Drop here to set status to ${status}` : `No ${status} projects`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DatabaseView>

      <AddProjectModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        project={selectedProject}
      />

      <AlertDialog open={!!deleteProjectId} onOpenChange={(open) => !open && setDeleteProjectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? All associated notes and milestones will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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

export default Projects;
