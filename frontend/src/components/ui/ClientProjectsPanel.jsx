import { useNavigate } from 'react-router-dom';
import { FolderOpen, Plus, Calendar, ListChecks, ArrowRight } from '@/components/ui/muiIcons';
import { useProjects } from '../../hooks/useProjects';
import { getProjectCategoryMeta } from '../../utils/projectCategories';
import { Button } from './button';
import { Badge } from './badge';

/**
 * ClientProjectsPanel - Display all projects & task delivery status for a client (no revenue/budget clutter)
 */
const ClientProjectsPanel = ({ clientId, clientName, onAddProject }) => {
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useProjects({ client: clientId, limit: 50 });

  const statusColor = {
    planning: 'bg-secondary text-foreground',
    Planning: 'bg-secondary text-foreground',
    active: 'bg-primary text-primary-foreground',
    'In Progress': 'bg-primary text-primary-foreground',
    on_hold: 'bg-muted text-foreground',
    'On Hold': 'bg-muted text-foreground',
    completed: 'bg-secondary/80 text-foreground',
    Completed: 'bg-secondary/80 text-foreground',
    cancelled: 'bg-muted text-muted-foreground line-through',
    Cancelled: 'bg-muted text-muted-foreground line-through',
  };

  const totalTasks = projects.reduce((sum, p) => sum + (p.totalTasks || 0), 0);
  const ongoingTasks = projects.reduce((sum, p) => sum + (p.ongoingTasks || 0), 0);
  const completedTasks = projects.reduce((sum, p) => sum + (p.completedTasks ?? p.doneTasks ?? 0), 0);
  const pendingTasks = projects.reduce(
    (sum, p) => sum + (p.pendingTasks ?? Math.max(0, (p.totalTasks || 0) - (p.ongoingTasks || 0) - (p.completedTasks ?? p.doneTasks ?? 0))),
    0
  );

  if (isLoading) {
    return (
      <div className="bg-card rounded-3xl p-6">
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-3xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-background">
            <FolderOpen size={20} className="text-foreground shrink-0" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Projects & Task Overview</h3>
            <p className="text-sm text-muted-foreground tabular-nums">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'} for {clientName}
            </p>
          </div>
        </div>
        <Button onClick={onAddProject} size="sm" className="gap-2 cursor-pointer">
          <Plus size={16} className="shrink-0" />
          New Project
        </Button>
      </div>

      {/* Task Pipeline Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
        <div className="p-3.5 rounded-2xl bg-background">
          <div className="text-xs font-medium text-muted-foreground mb-1">Tasks Available</div>
          <div className="text-2xl font-bold text-foreground">{totalTasks}</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-background">
          <div className="text-xs font-medium text-muted-foreground mb-1">Ongoing</div>
          <div className="text-2xl font-bold text-foreground">{ongoingTasks}</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-background">
          <div className="text-xs font-medium text-muted-foreground mb-1">Pending</div>
          <div className="text-2xl font-bold text-foreground">{pendingTasks}</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-background">
          <div className="text-xs font-medium text-muted-foreground mb-1">Completed</div>
          <div className="text-2xl font-bold text-foreground">{completedTasks}</div>
        </div>
      </div>

      {/* Projects List */}
      {projects.length === 0 ? (
        <div className="py-12 text-center">
          <FolderOpen size={40} className="mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-muted-foreground mb-4">No projects yet</p>
          <Button onClick={onAddProject} variant="outline" size="sm">
            Create First Project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {projects.map((project) => {
            const catMeta = getProjectCategoryMeta(project.category);
            const CatIcon = catMeta.icon;
            const pTotal = project.totalTasks || 0;
            const pOngoing = project.ongoingTasks || 0;
            const pCompleted = project.completedTasks ?? project.doneTasks ?? 0;
            const pPending = project.pendingTasks ?? Math.max(0, pTotal - pOngoing - pCompleted);
            const pProgress = project.progress || 0;
            const endDateVal = project.endDate || project.dueDate;

            return (
              <button
                key={project._id}
                type="button"
                onClick={() => navigate(`/projects/${project._id}`)}
                className="w-full p-4 rounded-2xl bg-background hover:bg-secondary/70 transition-colors text-left space-y-3 cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-secondary text-foreground">
                        <CatIcon size={11} className="shrink-0" />
                        <span>{catMeta.shortLabel || catMeta.label}</span>
                      </span>
                      <Badge className={statusColor[project.status] || 'bg-secondary text-foreground'}>
                        {String(project.status || 'Planning').replace('_', ' ')}
                      </Badge>
                    </div>
                    <h4 className="font-bold text-sm text-foreground truncate pt-0.5">{project.name}</h4>
                  </div>
                  <ArrowRight size={15} className="text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>

                {/* Dates */}
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground tabular-nums flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={11} className="shrink-0" />
                    <span>
                      Start: <strong className="text-foreground font-semibold">{project.startDate ? new Date(project.startDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</strong>
                    </span>
                  </span>
                  <span>
                    End: <strong className="text-foreground font-semibold">{endDateVal ? new Date(endDateVal).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Ongoing'}</strong>
                  </span>
                </div>

                {/* Task Completion & Breakdown */}
                <div className="space-y-1.5 pt-0.5 tabular-nums">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                      <ListChecks size={12} className="text-muted-foreground shrink-0" />
                      <span>{pTotal} {pTotal === 1 ? 'task' : 'tasks'}</span>
                    </span>
                    <span className="text-muted-foreground font-medium">
                      {pOngoing} ongoing · {pPending} pending · {pCompleted} done ({pProgress}%)
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-foreground transition-all duration-300"
                      style={{ width: `${Math.min(pProgress, 100)}%` }}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ClientProjectsPanel;
