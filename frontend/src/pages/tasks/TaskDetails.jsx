import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ChevronLeft, Edit2, X } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { StatusBadge } from '../../components/ui/page';
import { useTask } from '../../hooks/useTasks';
import { AddTaskModal } from '../../components/modals/AddTaskModal';
import { formatTaskTypeLabel, normalizeTaskStatusLabel } from '../../utils/taskFields';

const Field = ({ label, value }) => (
  <div className="rounded-2xl border border-border bg-card p-4">
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="mt-2 text-sm whitespace-pre-wrap">{value || '—'}</p>
  </div>
);

const TaskDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [editing, setEditing] = useState(false);
  const { data: task, isLoading, isError, error, refetch } = useTask(id);

  const canEdit = ['superAdmin', 'manager'].includes(user?.role);

  useEffect(() => {
    if (user?.role === 'employee' && id) {
      navigate(`/tasks?open=${id}`, { replace: true });
    }
  }, [user?.role, id, navigate]);

  if (user?.role === 'employee') {
    return null;
  }

  if (isLoading) {
    return <div className="animate-pulse h-64 rounded-3xl bg-card border border-border" />;
  }

  if (!task) {
    const message = error?.response?.status === 403
      ? 'You do not have access to this task.'
      : 'Task not found';
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">{isError ? message : 'Task not found'}</p>
        <Button className="mt-4" onClick={() => navigate('/tasks')}>Back to Tasks</Button>
      </div>
    );
  }

  const status = normalizeTaskStatusLabel(task.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/tasks" className="rounded-xl p-2 hover:bg-secondary">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{task.taskTitle || task.title}</h1>
            <p className="text-sm text-muted-foreground">{task.project?.name} • {task.client?.name || task.clientName}</p>
          </div>
          <StatusBadge tone="info">{status}</StatusBadge>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button onClick={() => setEditing(true)}>
              <Edit2 size={16} className="mr-2" />
              Edit
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => navigate('/tasks')} aria-label="Close">
            <X size={18} />
          </Button>
        </div>
      </div>

      {/* Notion-Style Multi-Role Workflow & Platform Posting Banner */}
      {(task.scriptWriterAssigned || task.videographerAssigned || task.editorAssigned || task.publisherAssigned || (task.postingPlatforms && task.postingPlatforms.length > 0) || task.shootDate) && (
        <div className="rounded-3xl border border-primary/30 bg-primary/5 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
              ⚡ Production Pipeline & Multi-Person Sub-Assignments
            </h3>
            {task.postingScheduleDate && (
              <div className="text-xs font-semibold px-3 py-1 rounded-full bg-primary text-primary-foreground">
                🗓️ Scheduled Post: {new Date(task.postingScheduleDate).toLocaleString()}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {/* Script Writer */}
            <div className="p-4 rounded-2xl bg-background border border-border/60">
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">✍️ Script By (Writer)</span>
              <span className="font-bold text-foreground text-sm block mt-1">
                {task.scriptWriterAssigned?.name || task.scriptWriterName || 'Unassigned'}
              </span>
              <span className="text-xs text-muted-foreground">{task.scriptWriterAssigned?.role || 'Team Member'}</span>
            </div>

            {/* Videographer */}
            <div className="p-4 rounded-2xl bg-background border border-border/60">
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">🎥 Shoot By (Videographer)</span>
              <span className="font-bold text-foreground text-sm block mt-1">
                {task.videographerAssigned?.name || task.videographerName || 'Unassigned'}
              </span>
              <span className="text-xs text-muted-foreground">{task.videographerAssigned?.role || 'Team Member'}</span>
            </div>

            {/* Editor */}
            <div className="p-4 rounded-2xl bg-background border border-border/60">
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">✂️ Editing By (Editor)</span>
              <span className="font-bold text-foreground text-sm block mt-1">
                {task.editorAssigned?.name || task.editorName || 'Unassigned'}
              </span>
              <span className="text-xs text-muted-foreground">{task.editorAssigned?.role || 'Team Member'}</span>
            </div>

            {/* Publisher */}
            <div className="p-4 rounded-2xl bg-background border border-border/60">
              <span className="text-[10px] font-bold uppercase text-muted-foreground block">📱 Posting By (Publisher)</span>
              <span className="font-bold text-foreground text-sm block mt-1">
                {task.publisherAssigned?.name || task.publisherName || 'Unassigned'}
              </span>
              <span className="text-xs text-muted-foreground">{task.publisherAssigned?.role || 'Team Member'}</span>
            </div>
          </div>

          {/* Shoot Details */}
          {(task.shootDate || task.shootLocation || task.rawFootageLink) && (
            <div className="grid gap-3 md:grid-cols-3 pt-2 border-t border-border/40 text-xs">
              {task.shootDate && (
                <div>
                  <span className="text-muted-foreground block text-[10px] font-bold uppercase">📅 Shoot Scheduled Date</span>
                  <span className="font-semibold text-foreground">{new Date(task.shootDate).toLocaleString()}</span>
                </div>
              )}
              {task.shootLocation && (
                <div>
                  <span className="text-muted-foreground block text-[10px] font-bold uppercase">📍 Shoot Location</span>
                  <span className="font-semibold text-foreground">{task.shootLocation}</span>
                </div>
              )}
              {task.rawFootageLink && (
                <div>
                  <span className="text-muted-foreground block text-[10px] font-bold uppercase">📁 Raw Footage Drive</span>
                  <a href={task.rawFootageLink} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline truncate block">
                    {task.rawFootageLink}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Target Platforms */}
          {task.postingPlatforms && task.postingPlatforms.length > 0 && (
            <div className="pt-2 border-t border-border/40 flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">Target Posting Platforms:</span>
              <div className="flex flex-wrap gap-1.5">
                {task.postingPlatforms.map((plat, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-xl bg-background border border-border text-xs font-semibold text-foreground">
                    {plat}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Task Type" value={task.taskCategory === 'non_content' ? 'Non-Content' : 'Content'} />
        <Field label="Category" value={formatTaskTypeLabel(task.taskType)} />
        <Field label="Content Type" value={task.contentType?.replace(/_/g, ' ')} />
        <Field label="Video Type" value={task.videoType?.replace(/_/g, ' ')} />
        <Field label="Reel / Video Title" value={task.contentTitle} />
        <Field label="Assigned To" value={Array.isArray(task.assignedTo) ? task.assignedTo.map((u) => u.name).join(', ') : task.assignedPersonName} />
        <Field label="Priority" value={task.priority} />
        <Field label="Due Date" value={task.dueDate ? new Date(task.dueDate).toLocaleString() : null} />
        <Field label="Description" value={task.description} />
        <Field label="Script" value={task.scriptText} />
        <Field label="Script Link" value={task.scriptLink} />
        <Field label="Caption" value={task.caption} />
        <Field label="Hashtags" value={task.hashtags} />
        <Field label="Keywords" value={task.keywords} />
        <Field label="Hashtags" value={task.hashtags} />
        <Field label="Reference Link" value={task.referenceLink} />
        <Field label="Content Idea" value={task.contentIdea} />
        <Field label="Editor Guide" value={task.editorGuide} />
        <Field label="Audio Reference" value={task.audioReference} />
        <Field label="Shoot Instructions" value={task.shootInstructions} />
        <Field label="Editing Instructions" value={task.editingInstructions} />
        <Field label="Requirement Details" value={task.requirementDetails} />
        <Field label="Notes" value={task.internalNotes} />
      </div>

      <AddTaskModal
        open={editing}
        onOpenChange={(open) => {
          setEditing(open);
          if (!open) refetch();
        }}
        task={task}
      />
    </div>
  );
};

export default TaskDetails;
