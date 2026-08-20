import { useState, useMemo } from 'react';
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
import { useProjects, useDeleteProject } from '../../hooks/useProjects';
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
  const [currentView, setCurrentView] = useState('table'); // 'table' | 'board'

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
            {row.client?.name ? `🏢 ${row.client.name}` : 'Internal Agency Project'}
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
          <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
            <div className="grid w-max min-w-full auto-cols-[minmax(280px,320px)] grid-flow-col gap-4">
              {STATUS_COLUMNS.map((status) => {
                const statusProjects = filteredProjects.filter((p) => (p.status || 'Planning') === status);
                return (
                  <div key={status} className="flex flex-col min-h-[500px] max-h-[calc(100vh-300px)] rounded-2xl border border-border/80 bg-secondary/20 p-3 space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground">{status}</span>
                      <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-secondary text-muted-foreground">
                        {statusProjects.length}
                      </span>
                    </div>

                    <div className="space-y-2.5 overflow-y-auto max-h-[calc(100vh-360px)] custom-scrollbar pr-0.5 flex-1">
                      {statusProjects.map((project) => (
                        <div
                          key={project._id}
                          onClick={() => navigate(`/projects/${project._id}`)}
                          className="p-3.5 bg-card rounded-xl border border-border hover:border-primary/40 transition-all cursor-pointer space-y-2.5 group shadow-sm"
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
                            {project.client?.name ? `🏢 ${project.client.name}` : 'Internal'}
                          </p>

                          {/* Progress Bar */}
                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                              <span>Progress</span>
                              <span>{project.progress || 0}%</span>
                            </div>
                            <div className="h-1 w-full rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{ width: `${Math.min(project.progress || 0, 100)}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-muted-foreground">
                            <span>
                              {project.endDate ? `Due ${new Date(project.endDate).toLocaleDateString()}` : 'Ongoing'}
                            </span>
                            <span className="group-hover:text-primary flex items-center gap-0.5">
                              Open <ArrowRight size={10} />
                            </span>
                          </div>
                        </div>
                      ))}

                      {statusProjects.length === 0 && (
                        <div className="p-4 text-center text-[11px] text-muted-foreground border border-dashed border-border/60 rounded-xl">
                          No {status} projects
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
