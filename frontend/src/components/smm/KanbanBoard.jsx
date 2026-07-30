import React from 'react';
import { Plus, MoreHorizontal, User, Clock, Paperclip, MessageSquare } from 'lucide-react';
import { StatusBadgeSmm } from './StatusBadgeSmm';

const COLUMNS = [
  { id: 'Todo', title: 'To Do', color: 'border-l-slate-400' },
  { id: 'In Progress', title: 'In Progress', color: 'border-l-blue-500' },
  { id: 'Review', title: 'Review / Approval', color: 'border-l-amber-500' },
  { id: 'Done', title: 'Done', color: 'border-l-emerald-500' },
];

export const KanbanBoard = ({ tasks = [], onAddTask, onEditTask, onStatusChange }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.id);
        return (
          <div key={col.id} className="bg-secondary/40 rounded-2xl p-4 border border-border flex flex-col h-[600px]">
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">{col.title}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-secondary text-muted-foreground">
                  {colTasks.length}
                </span>
              </div>
              <button
                onClick={() => onAddTask(col.id)}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Task list */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {colTasks.map((task) => (
                <div
                  key={task._id}
                  onClick={() => onEditTask(task)}
                  className={`app-card p-4 border-l-4 ${col.color} cursor-pointer hover:shadow-md transition-all group`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                      {task.title}
                    </h4>
                  </div>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                  )}

                  <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      {task.assignedTo?.name && (
                        <span className="inline-flex items-center gap-1 font-medium text-foreground bg-secondary px-2 py-0.5 rounded-md">
                          <User size={12} />
                          {task.assignedTo.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {task.comments?.length > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <MessageSquare size={12} />
                          {task.comments.length}
                        </span>
                      )}
                      {task.priority && (
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          task.priority === 'Urgent' ? 'bg-rose-500/10 text-rose-600' :
                          task.priority === 'High' ? 'bg-amber-500/10 text-amber-600' :
                          'bg-slate-500/10 text-slate-600'
                        }`}>
                          {task.priority}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
