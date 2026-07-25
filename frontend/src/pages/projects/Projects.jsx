import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Briefcase, Gauge, Plus, Target, TrendingUp } from 'lucide-react';
import { useProjects, useDeleteProject } from '../../hooks/useProjects';
import { AddProjectModal } from '../../components/modals/AddProjectModal';
import { DataTable } from '../../components/ui/DataTable';
import { Button } from '../../components/ui/button';
import { MetricCard, MetricGrid, PageHeader, PageToolbar, SearchField, StatusBadge } from '../../components/ui/page';
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

const MONTHS = [
  { value: '0', label: 'January' },
  { value: '1', label: 'February' },
  { value: '2', label: 'March' },
  { value: '3', label: 'April' },
  { value: '4', label: 'May' },
  { value: '5', label: 'June' },
  { value: '6', label: 'July' },
  { value: '7', label: 'August' },
  { value: '8', label: 'September' },
  { value: '9', label: 'October' },
  { value: '10', label: 'November' },
  { value: '11', label: 'December' },
];

const STATUSES = [
  { value: 'Planning', label: 'Planning' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'On Hold', label: 'On Hold' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Cancelled', label: 'Cancelled' },
];

const Projects = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [deleteProjectId, setDeleteProjectId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  const filters = {
    search: searchTerm,
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  const { data: projects = [], isLoading } = useProjects(filters);

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      if (!monthFilter) return true;
      const projectDate = project.startDate ? new Date(project.startDate) : new Date(project.createdAt);
      const projectMonth = projectDate.getMonth();
      return projectMonth === Number(monthFilter);
    });
  }, [projects, monthFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setMonthFilter('');
  };
  const deleteProjectMutation = useDeleteProject();

  const inDelivery = filteredProjects.filter((project) => project.status === 'In Progress').length;
  const completed = filteredProjects.filter((project) => project.status === 'Completed').length;
  const averageProgress = filteredProjects.length
    ? Math.round(filteredProjects.reduce((sum, project) => sum + Number(project.progress || 0), 0) / filteredProjects.length)
    : 0;

  const isManager = user?.role === 'manager';
  const columns = [
    {
      key: 'name',
      label: 'Project Name',
      render: (row) => (
        <div className="min-w-0">
          <div className="font-semibold text-foreground">{row.name}</div>
          <div className="mt-1 text-xs text-muted-foreground">{row.client?.name || 'No client linked'}</div>
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
          {row.priority}
        </StatusBadge>
      ),
    },
    {
      key: isManager ? 'adsBudget' : 'budget',
      label: isManager ? 'Ads Budget' : 'Budget',
      render: (row) => formatINR(isManager ? row.budgetDetails?.adsAmount || 0 : row.budget),
    },
    {
      key: 'progress',
      label: 'Progress',
      render: (row) => (
        <div className="w-28">
          <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary" style={{ width: `${row.progress || 0}%` }} />
          </div>
          <span className="mt-1 inline-block text-xs text-muted-foreground">{row.progress || 0}% complete</span>
        </div>
      ),
    },
  ];

  const handleDeleteProject = async () => {
    if (deleteProjectId) {
      await deleteProjectMutation.mutateAsync(deleteProjectId);
      setDeleteProjectId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Delivery"
        description="Keep active delivery, budget context, and portfolio progress aligned in a single management view."
        actions={(
          <Button
            onClick={() => {
              setSelectedProject(null);
              setShowAddModal(true);
            }}
          >
            <Plus size={16} className="mr-2" />
            Create Project
          </Button>
        )}
      >
        <MetricGrid>
          <MetricCard label="Portfolio Size" value={filteredProjects.length} helper="Projects visible in the current search" icon={Briefcase} tone="info" />
          <MetricCard label="In Delivery" value={inDelivery} helper="Projects currently being executed" icon={TrendingUp} tone="warning" />
          <MetricCard label="Completed" value={completed} helper="Finished work ready for archive" icon={Target} tone="success" />
          <MetricCard label="Average Progress" value={`${averageProgress}%`} helper="Across the visible portfolio" icon={Gauge} tone="primary" />
        </MetricGrid>
      </PageHeader>

      <PageToolbar>
        <SearchField
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Search project or client name..."
          className="lg:min-w-[320px]"
        />
        <SelectDropdown
          value={statusFilter}
          onChange={setStatusFilter}
          options={STATUSES}
          placeholder="All statuses"
          className="lg:w-56"
        />
        <SelectDropdown
          value={monthFilter}
          onChange={setMonthFilter}
          options={MONTHS}
          placeholder="Filter by Month"
          className="lg:w-56"
        />
        <Button type="button" variant="outline" onClick={clearFilters}>Clear</Button>
        <div className="app-pill">{filteredProjects.length} projects</div>
      </PageToolbar>

      <DataTable
        data={filteredProjects}
        columns={columns}
        loading={isLoading}
        maxHeight="calc(100vh - 360px)"
        onRowClick={(project) => navigate(`/projects/${project._id}`)}
        onEdit={(project) => {
          setSelectedProject(project);
          setShowAddModal(true);
        }}
        onDelete={(id) => setDeleteProjectId(id)}
        emptyTitle="No projects found"
        emptyDescription="Try a broader search or create a project to start structuring delivery work."
      />

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
              Are you sure you want to delete this project? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Projects;
