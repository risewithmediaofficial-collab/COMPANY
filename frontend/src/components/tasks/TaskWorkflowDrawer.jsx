import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Circle,
  Plus,
  Send,
  Building2,
  FolderKanban,
  Calendar,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  ListChecks,
} from 'lucide-react';
import { useUpdateTaskStatus, useUpdateTaskChecklist, useAddTaskNote } from '../../hooks/useTasks';
import { getAssetUrl } from '../../utils/assetUrl';
import { toast } from 'sonner';

export const PIPELINE_STAGES = [
  { id: 'todo', label: 'To Do', color: 'slate', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  { id: 'in_progress', label: 'In Progress', color: 'blue', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' },
  { id: 'review', label: 'Internal Approval', color: 'purple', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' },
  { id: 'client_approval', label: 'Client Approval', color: 'amber', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' },
  { id: 'smm_team', label: 'SMM Team', color: 'indigo', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' },
  { id: 'completed', label: 'Completed', color: 'emerald', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' },
];

export const TaskWorkflowDrawer = ({ task, isOpen, onClose }) => {
  const updateStatusMutation = useUpdateTaskStatus();
  const updateChecklistMutation = useUpdateTaskChecklist();
  const addNoteMutation = useAddTaskNote();

  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');

  if (!isOpen || !task) return null;

  // Normalized status
  const currentStatus = (() => {
    const s = task.status;
    if (s === 'on_process') return 'in_progress';
    if (s === 'review_required') return 'review';
    if (s === 'waiting_for_client') return 'client_approval';
    if (['done', 'approved'].includes(s)) return 'completed';
    return s || 'todo';
  })();

  const currentStageIndex = PIPELINE_STAGES.findIndex((st) => st.id === currentStatus);
  const nextStage = PIPELINE_STAGES[currentStageIndex + 1];

  // Checklist statistics
  const checklist = Array.isArray(task.checklist) ? task.checklist : [];
  const completedChecklistCount = checklist.filter((item) => item.isCompleted).length;
  const progressPercent =
    checklist.length > 0 ? Math.round((completedChecklistCount / checklist.length) * 100) : 0;

  // Assignee info
  const assignee = Array.isArray(task.assignedTo) && task.assignedTo.length > 0 ? task.assignedTo[0] : null;
  const assigneeName =
    typeof assignee === 'object' ? assignee?.name : task.assignedPersonName || 'Unassigned';
  const assigneeAvatar = typeof assignee === 'object' && assignee?.avatar ? getAssetUrl(assignee.avatar) : null;
  const assigneeRole = typeof assignee === 'object' ? assignee?.position || assignee?.role : '';

  // Stage Switch Handler
  const handleStageChange = async (targetStageId) => {
    try {
      await updateStatusMutation.mutateAsync({ id: task._id, status: targetStageId });
      toast.success(`Moved to ${PIPELINE_STAGES.find((s) => s.id === targetStageId)?.label || targetStageId}`);
    } catch (err) {
      toast.error('Failed to change task status');
    }
  };

  // Checklist Toggle Handler
  const handleToggleChecklistItem = async (index, currentChecked) => {
    try {
      await updateChecklistMutation.mutateAsync({
        id: task._id,
        itemIndex: index,
        isCompleted: !currentChecked,
      });
    } catch (err) {
      toast.error('Failed to update checklist item');
    }
  };

  // Add Checklist Item Handler
  const handleAddChecklistItem = async () => {
    if (!newChecklistTitle.trim()) return;
    try {
      await updateChecklistMutation.mutateAsync({
        id: task._id,
        title: newChecklistTitle.trim(),
      });
      setNewChecklistTitle('');
      toast.success('Checklist item added');
    } catch (err) {
      toast.error('Failed to add checklist item');
    }
  };

  // Add Note Handler
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;
    try {
      await addNoteMutation.mutateAsync({
        id: task._id,
        content: newNoteContent.trim(),
      });
      setNewNoteContent('');
    } catch (err) {
      toast.error('Failed to post note');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span
              className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                task.taskCategory === 'content'
                  ? 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300'
                  : 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'
              }`}
            >
              {task.taskCategory === 'content' ? '🎬 Content' : '💻 Tech'}
            </span>

            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {task.taskType || 'Task'}
            </span>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* 1. Title & Meta Overview */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
              {task.title || task.taskTitle}
            </h2>

            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
              {/* Client */}
              {task.clientName && (
                <div className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 font-semibold dark:bg-slate-800">
                  <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                  <span>{task.clientName}</span>
                </div>
              )}

              {/* Project */}
              {task.project?.name && (
                <div className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 font-semibold dark:bg-slate-800">
                  <FolderKanban className="h-3.5 w-3.5 text-sky-500" />
                  <span>{task.project.name}</span>
                </div>
              )}

              {/* Due Date */}
              {task.dueDate && (
                <div className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 font-medium dark:bg-slate-800">
                  <Calendar className="h-3.5 w-3.5 text-amber-500" />
                  <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                </div>
              )}

              {/* Priority */}
              <span
                className={`rounded-md px-2.5 py-1 font-semibold capitalize ${
                  task.priority === 'urgent'
                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                    : task.priority === 'high'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                }`}
              >
                {task.priority || 'medium'} priority
              </span>
            </div>
          </div>

          {/* 2. Assignee Details */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {assigneeAvatar ? (
                  <img
                    src={assigneeAvatar}
                    alt={assigneeName}
                    className="h-11 w-11 rounded-full object-cover ring-2 ring-indigo-500/20 shadow-sm"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-sm">
                    {assigneeName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Assigned Team Member
                  </p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {assigneeName}
                  </p>
                  {assigneeRole && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {assigneeRole}
                    </p>
                  )}
                </div>
              </div>

              {/* Next Stage Action Button */}
              {nextStage && (
                <button
                  onClick={() => handleStageChange(nextStage.id)}
                  disabled={updateStatusMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-60"
                >
                  <span>Move to {nextStage.label}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 3. Interactive Kanban Pipeline Stage Stepper */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
              Kanban Workflow Stage
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PIPELINE_STAGES.map((stage, idx) => {
                const isActive = stage.id === currentStatus;
                const isPassed = currentStageIndex > idx;

                return (
                  <button
                    key={stage.id}
                    onClick={() => handleStageChange(stage.id)}
                    className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs transition-all ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-50/80 font-bold text-indigo-700 shadow-sm ring-1 ring-indigo-500 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-300'
                        : isPassed
                        ? 'border-emerald-200 bg-emerald-50/30 font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300'
                        : 'border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                    }`}
                  >
                    {isPassed ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    ) : isActive ? (
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] text-white">
                        ✓
                      </span>
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
                    )}
                    <span className="truncate">{stage.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Interactive Checklist Section */}
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-indigo-500" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Deliverable Checklist ({completedChecklistCount}/{checklist.length})
                </h3>
              </div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {progressPercent}% Done
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Checklist Items List */}
            <div className="space-y-2 mb-3">
              {checklist.length === 0 ? (
                <p className="py-2 text-center text-xs text-slate-400">
                  No checklist items yet. Add steps below to track completion.
                </p>
              ) : (
                checklist.map((item, idx) => (
                  <div
                    key={item._id || idx}
                    onClick={() => handleToggleChecklistItem(idx, item.isCompleted)}
                    className={`group flex items-center gap-3 rounded-lg border p-2.5 text-xs cursor-pointer transition-all ${
                      item.isCompleted
                        ? 'border-emerald-200 bg-emerald-50/40 text-slate-500 dark:border-emerald-950 dark:bg-emerald-950/20 dark:text-slate-400'
                        : 'border-slate-200/80 bg-white text-slate-800 hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        item.isCompleted
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-slate-300 bg-white group-hover:border-indigo-400 dark:border-slate-600 dark:bg-slate-800'
                      }`}
                    >
                      {item.isCompleted && <span className="text-[10px] font-bold">✓</span>}
                    </button>
                    <span
                      className={`flex-1 ${
                        item.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
                      }`}
                    >
                      {item.title}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Inline Add Checklist Item Input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add next step in checklist (Press Enter)..."
                value={newChecklistTitle}
                onChange={(e) => setNewChecklistTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
              <button
                type="button"
                onClick={handleAddChecklistItem}
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* 5. Content or Tech Deliverable Details */}
          {task.taskCategory === 'content' ? (
            <div className="space-y-3 rounded-xl border border-slate-200/70 p-4 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Content Details & Brief
              </h4>

              {task.postingPlatforms && task.postingPlatforms.length > 0 && (
                <div>
                  <span className="text-[11px] font-medium text-slate-400">Platforms:</span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {task.postingPlatforms.map((p, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-fuchsia-50 px-2 py-0.5 text-[11px] font-semibold text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(task.contentIdea || task.scriptText) && (
                <div>
                  <span className="text-[11px] font-medium text-slate-400">Hook / Angle / Script:</span>
                  <p className="mt-1 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 whitespace-pre-wrap">
                    {task.contentIdea || task.scriptText}
                  </p>
                </div>
              )}

              {(task.rawFootageLink || task.referenceLink) && (
                <div>
                  <span className="text-[11px] font-medium text-slate-400">Drive / Assets Link:</span>
                  <div className="mt-1">
                    <a
                      href={task.rawFootageLink || task.referenceLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Open Drive Assets</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-slate-200/70 p-4 dark:border-slate-800">
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Technical Specification
              </h4>

              {task.requirementDetails && (
                <div>
                  <span className="text-[11px] font-medium text-slate-400">Scope & Requirements:</span>
                  <p className="mt-1 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 whitespace-pre-wrap">
                    {task.requirementDetails}
                  </p>
                </div>
              )}

              {task.referenceLink && (
                <div>
                  <span className="text-[11px] font-medium text-slate-400">Repository / Spec:</span>
                  <div className="mt-1">
                    <a
                      href={task.referenceLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 hover:underline dark:text-sky-400"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span>Open Tech Link</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. Task Notes & Revision Feed */}
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="h-4 w-4 text-indigo-500" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Task Notes & Revisions ({task.taskNotes?.length || 0})
              </h3>
            </div>

            {/* List Notes */}
            <div className="space-y-2.5 mb-4 max-h-56 overflow-y-auto">
              {!task.taskNotes || task.taskNotes.length === 0 ? (
                <p className="py-2 text-center text-xs text-slate-400">
                  No notes added yet. Leave instructions, revision remarks, or feedback below.
                </p>
              ) : (
                task.taskNotes.map((note, idx) => (
                  <div
                    key={note._id || idx}
                    className="rounded-lg border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {note.authorName || 'Team Member'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {note.createdAt ? new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Add Note Form */}
            <form onSubmit={handleAddNote} className="space-y-2">
              <textarea
                rows={2}
                placeholder="Write revision note, client instruction, or manager review..."
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={addNoteMutation.isPending || !newNoteContent.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-50"
                >
                  <Send className="h-3 w-3" />
                  <span>Post Note</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskWorkflowDrawer;
