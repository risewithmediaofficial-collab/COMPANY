import { CheckCircle2, Clock, Clock8 } from '@/components/ui/muiIcons';

const formatDistanceToNow = (date) => {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(date).toLocaleDateString();
};

const format = (date, formatStr) => {
  const d = new Date(date);
  if (formatStr === 'MMM dd, yyyy HH:mm') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return d.toLocaleDateString();
};

export const ProgressTimeline = ({ task }) => {
  if (!task) return null;

  const hasProgress = task.progressUpdates && task.progressUpdates.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Work Progress</h3>
        {hasProgress && task.loggedHours > 0 && (
          <div className="text-sm font-medium text-primary">
            {task.loggedHours}h logged
            {task.estimatedHours > 0 && ` / ${task.estimatedHours}h estimated`}
          </div>
        )}
      </div>

      {!hasProgress && !task.actualStartDate && (
        <div className="rounded-[24px] border border-dashed border-border bg-secondary/20 py-10 text-center">
          <Clock8 className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No progress logged yet</p>
          <p className="text-xs text-muted-foreground">Start by logging the first update for this task.</p>
        </div>
      )}

      {(hasProgress || task.actualStartDate) && (
        <div className="relative space-y-3">
          {hasProgress && (
            <div className="absolute bottom-0 left-2.5 top-8 w-0.5 bg-border" />
          )}

          {task.actualStartDate && (
            <div className="flex gap-3 pb-4">
              <div className="relative z-10">
                <Clock className="h-5 w-5 rounded-full bg-card p-0.5 text-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Work Started</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(task.actualStartDate), 'MMM dd, yyyy HH:mm')}
                </p>
                {task.startDate && task.actualStartDate && (
                  <div className="mt-1">
                    <p className="text-xs text-muted-foreground">
                      {new Date(task.actualStartDate) > new Date(task.startDate)
                        ? `Started ${formatDistanceToNow(new Date(task.startDate))} after planned date`
                        : `Started ${formatDistanceToNow(new Date(task.startDate))} before planned date`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {hasProgress && (
            <div className="space-y-4">
              {task.progressUpdates.map((update) => (
                <div key={update._id} className="flex gap-3">
                  <div className="relative z-10">
                    <CheckCircle2 className="h-5 w-5 rounded-full bg-card p-0.5 text-foreground" />
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="rounded-2xl border border-border bg-background p-4 shadow-sm">
                      <p className="font-medium leading-tight text-foreground">
                        {update.description}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {update.updatedBy?.name || 'Unknown'} | {formatDistanceToNow(new Date(update.completedAt))}
                        </p>
                        {update.hours > 0 && (
                          <span className="inline-block rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                            {update.hours}h
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {hasProgress && (
            <div className="mt-6 space-y-2 border-t border-border pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total logged:</span>
                <span className="font-semibold text-primary">{task.loggedHours}h</span>
              </div>
              {task.estimatedHours > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estimated:</span>
                  <span className="font-semibold text-foreground">{task.estimatedHours}h</span>
                </div>
              )}
              {task.estimatedHours > 0 && (
                <div className="mt-3">
                  <div className="h-2 w-full rounded-full bg-border">
                    <div
                      className="h-2 rounded-full bg-primary transition-all"
                      style={{
                        width: `${Math.min((task.loggedHours / task.estimatedHours) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {task.loggedHours > task.estimatedHours
                      ? `Over by ${(task.loggedHours - task.estimatedHours).toFixed(1)}h`
                      : `${(task.estimatedHours - task.loggedHours).toFixed(1)}h remaining`}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
