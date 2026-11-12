import { useNavigate } from 'react-router-dom';
import { FolderOpen, IndianRupee, Plus, TrendingUp } from '@/components/ui/muiIcons';
import { useProjects } from '../../hooks/useProjects';
import { formatINR } from '../../utils/currency';
import { Button } from './button';
import { Badge } from './badge';

/**
 * ClientProjectsPanel - Display all projects for a client with quick actions
 */
const ClientProjectsPanel = ({ clientId, clientName, onAddProject }) => {
  const navigate = useNavigate();
  const { data: projects = [], isLoading } = useProjects({ client: clientId, limit: 50 });

  const statusColor = {
    planning: 'bg-secondary text-foreground border border-border',
    active: 'bg-primary text-primary-foreground',
    on_hold: 'bg-muted text-foreground border border-border',
    completed: 'bg-secondary/70 text-muted-foreground border border-border',
    cancelled: 'bg-muted text-muted-foreground border border-border line-through',
  };

  const priorityColor = {
    low: 'text-muted-foreground',
    medium: 'text-foreground/80',
    high: 'text-foreground',
    urgent: 'text-foreground font-bold',
  };

  const activeProjects = projects.filter((p) => p.status === 'active' || p.status === 'In Progress');
  const completedProjects = projects.filter((p) => p.status === 'completed');
  const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);

  if (isLoading) {
    return (
      <div className="bg-card rounded-3xl border border-border shadow-sm p-6">
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-3xl border border-border shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-secondary border border-border">
            <FolderOpen size={20} className="text-foreground shrink-0" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Projects</h3>
            <p className="text-sm text-muted-foreground tabular-nums">{projects.length} projects for {clientName}</p>
          </div>
        </div>
        <Button onClick={onAddProject} size="sm" className="gap-2">
          <Plus size={16} className="shrink-0" />
          New Project
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-secondary/50 border border-border">
          <div className="text-xs text-muted-foreground mb-1">Active</div>
          <div className="text-2xl font-bold text-foreground tabular-nums">{activeProjects.length}</div>
        </div>
        <div className="p-3 rounded-lg bg-secondary/50 border border-border">
          <div className="text-xs text-muted-foreground mb-1">Completed</div>
          <div className="text-2xl font-bold text-foreground tabular-nums">{completedProjects.length}</div>
        </div>
        <div className="p-3 rounded-lg bg-secondary/50 border border-border">
          <div className="text-xs text-muted-foreground mb-1">Total Budget</div>
          <div className="text-lg font-bold truncate text-foreground tabular-nums">{formatINR(totalBudget)}</div>
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
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {projects.map((project) => (
            <button
              key={project._id}
              onClick={() => navigate(`/projects/${project._id}`)}
              className="w-full p-4 rounded-lg border border-border hover:bg-secondary/50 transition-colors text-left space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate">{project.name}</h4>
                  <p className="text-xs text-muted-foreground truncate">{project.description}</p>
                </div>
                <Badge className={statusColor[project.status]}>
                  {project.status.replace('_', ' ')}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-sm pt-2 border-t border-border/50">
                <div className="flex items-center gap-3">
                  {project.budget > 0 && (
                    <div className="flex items-center gap-1 text-muted-foreground tabular-nums">
                      <IndianRupee size={14} className="shrink-0" />
                      <span>{formatINR(project.budget)}</span>
                    </div>
                  )}
                  {project.progress > 0 && (
                    <div className="flex items-center gap-1 text-muted-foreground tabular-nums">
                      <TrendingUp size={14} className="shrink-0" />
                      <span>{project.progress}%</span>
                    </div>
                  )}
                </div>
                <span className={`text-xs font-semibold capitalize ${priorityColor[project.priority]}`}>
                  {project.priority}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientProjectsPanel;
