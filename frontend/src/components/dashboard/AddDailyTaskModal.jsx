import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Search,
  Plus,
  Check,
  Calendar,
  Clock,
  Building2,
  FolderOpen,
  Filter,
  CheckCircle2,
  Sparkles,
  Scissors,
  Camera,
  Share2,
  FileText,
  User,
} from '@/components/ui/muiIcons';
import { useAssignableTasks, useAddDailyTaskFromAssigned } from '../../hooks/useDailyTasks';

export const AddDailyTaskModal = ({
  open,
  onOpenChange,
  targetUser,
  currentDateStr,
  onTaskAdded,
}) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const { data, isLoading } = useAssignableTasks(
    currentDateStr,
    targetUser?._id,
    open
  );

  const addDailyTaskMutation = useAddDailyTaskFromAssigned();
  const assignableTasks = data?.tasks || [];

  const filteredTasks = useMemo(() => {
    return assignableTasks.filter((t) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        (t.title || '').toLowerCase().includes(q) ||
        (t.clientName || '').toLowerCase().includes(q) ||
        (t.projectName || '').toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (roleFilter === 'all') return true;
      const roleStr = (t.roleLabel || '').toLowerCase();
      if (roleFilter === 'editor') return roleStr.includes('edit');
      if (roleFilter === 'videographer') return roleStr.includes('shoot') || roleStr.includes('video');
      if (roleFilter === 'smm') return roleStr.includes('smm') || roleStr.includes('post');
      return true;
    });
  }, [assignableTasks, search, roleFilter]);

  const handleAddTask = async (task) => {
    try {
      await addDailyTaskMutation.mutateAsync({
        taskId: task._id,
        userId: targetUser?._id,
        date: currentDateStr,
      });
      onTaskAdded?.();
    } catch (e) {
      // error handled by hook toast
    }
  };

  const getRoleIcon = (roleLabel = '') => {
    const norm = roleLabel.toLowerCase();
    if (norm.includes('edit')) return Scissors;
    if (norm.includes('shoot') || norm.includes('video')) return Camera;
    if (norm.includes('smm') || norm.includes('post')) return Share2;
    return FileText;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" className="max-w-2xl p-0 overflow-hidden rounded-3xl bg-card border border-border/40 shadow-2xl">
        <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-border/30 bg-secondary/15">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
              <Calendar size={20} />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                Add Daily Tasks from Assigned Tasks
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {targetUser?.name
                  ? `Select tasks assigned to ${targetUser.name} (with from–to dates) to focus on today.`
                  : 'Select from your active assigned tasks with their From–To dates.'}
              </DialogDescription>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by task title, client, project..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 w-full rounded-xl bg-background pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {[
                { id: 'all', label: 'All Tasks' },
                { id: 'editor', label: 'Editing' },
                { id: 'videographer', label: 'Shoot' },
                { id: 'smm', label: 'Posting' },
              ].map((rf) => (
                <button
                  key={rf.id}
                  type="button"
                  onClick={() => setRoleFilter(rf.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    roleFilter === rf.id
                      ? 'bg-primary text-primary-foreground font-bold'
                      : 'bg-background hover:bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {rf.label}
                </button>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Task List */}
        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-2.5 divide-y divide-border/20">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-muted-foreground animate-pulse">
              Loading active assigned tasks…
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Calendar size={28} className="mx-auto text-muted-foreground/40" />
              <p className="text-xs font-bold text-foreground">No active assigned tasks found</p>
              <p className="text-[11px] text-muted-foreground max-w-sm mx-auto">
                {search
                  ? 'No tasks matched your search query.'
                  : 'All assigned tasks have either been completed or already added to daily tasks.'}
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const RoleIcon = getRoleIcon(task.roleLabel);
              const isAlreadyAdded = task.isAlreadyDaily;

              return (
                <div
                  key={task._id}
                  className={`pt-2.5 first:pt-0 p-3 sm:p-3.5 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isAlreadyAdded
                      ? 'bg-secondary/20 opacity-80'
                      : 'bg-background hover:bg-secondary/40'
                  }`}
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-[10px] font-bold text-muted-foreground shrink-0">
                        <RoleIcon size={11} className="text-primary" />
                        <span>{task.roleLabel || 'Assignee'}</span>
                      </span>

                      {task.priority && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                            task.priority === 'urgent'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : task.priority === 'high'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                          }`}
                        >
                          {task.priority}
                        </span>
                      )}

                      <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                        {task.title}
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground tabular-nums">
                      {task.clientName && (
                        <span className="inline-flex items-center gap-1 text-foreground/80 font-medium">
                          <Building2 size={11} className="text-muted-foreground" />
                          <span className="truncate">{task.clientName}</span>
                        </span>
                      )}

                      {task.projectName && (
                        <span className="inline-flex items-center gap-1 text-foreground/80 font-medium">
                          <FolderOpen size={11} className="text-muted-foreground" />
                          <span className="truncate">{task.projectName}</span>
                        </span>
                      )}

                      {/* FROM DATE - TO DATE BADGE */}
                      {task.dateLabel && (
                        <span className="inline-flex items-center gap-1 font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md shrink-0">
                          <Calendar size={10} />
                          <span>{task.dateLabel}</span>
                        </span>
                      )}

                      {(task.allocatedHours > 0 || task.allocatedMinutes > 0) && (
                        <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded-md shrink-0">
                          <Clock size={10} />
                          <span>{task.allocatedHours || 0}h {task.allocatedMinutes || 0}m</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="self-end sm:self-auto shrink-0">
                    {isAlreadyAdded ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        <Check size={12} />
                        <span>In Today's Tasks</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddTask(task)}
                        disabled={addDailyTaskMutation.isPending}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <Plus size={13} />
                        <span>Add to Daily</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddDailyTaskModal;
