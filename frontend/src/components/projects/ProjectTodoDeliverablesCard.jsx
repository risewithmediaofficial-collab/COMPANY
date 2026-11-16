// =============================================
// PROJECT TODO DELIVERABLES CARD
// Renders inside the Kanban "TO DO" column in a closed way:
// Shows 1 preview deliverable target item + "+ X more" banner.
// Clicking "+ X more" opens an interactive modal to view all targets and assign tasks.
// =============================================

import React, { useState, useMemo } from 'react';
import {
  Target,
  Plus,
  ChevronRight,
  User,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  X,
  ListFilter,
  Film,
  Video,
  Image,
  BookOpen,
} from '@/components/ui/muiIcons';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  STANDARD_DELIVERABLE_TYPES,
  MONTH_NAMES,
} from './MonthlyDeliverablesSection';
import {
  getDeliverableDemoTitles,
  getDeliverableColorStyle,
} from './ProjectMonthlyDeliverablesCard';

export const ProjectTodoDeliverablesCard = ({
  deliverables = [],
  project,
  canManage = false,
  onAssignTask,
  onSelectTask,
}) => {
  const [showAllModal, setShowAllModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  // Compute deliverable slots
  const deliverableSlots = useMemo(() => {
    if (!deliverables || deliverables.length === 0) return [];

    return deliverables.flatMap((item) => {
      const demoList = getDeliverableDemoTitles(
        item.contentType,
        Math.max(10, item.targetQuantity || 10)
      );
      const existingTasks = Array.isArray(item.tasks) ? item.tasks : [];

      return demoList.map((demo, idx) => {
        const assignedTask = existingTasks[idx] || null;
        return {
          id: `${item._id || item.contentType}-slot-${idx + 1}`,
          deliverable: item,
          slotNumber: idx + 1,
          contentType: item.contentType,
          suggestedTitle: demo.title,
          shortTitle: demo.shortTitle,
          theme: demo.theme,
          task: assignedTask,
          isAssigned: Boolean(assignedTask),
        };
      });
    });
  }, [deliverables]);

  if (!deliverableSlots || deliverableSlots.length === 0) {
    return null;
  }

  // Find first unassigned slot for the 1 preview item (or fallback to slot 0)
  const firstSlot = deliverableSlots.find((s) => !s.isAssigned) || deliverableSlots[0];
  const remainingCount = deliverableSlots.length - 1;

  const filteredSlots = useMemo(() => {
    if (activeFilter === 'all') return deliverableSlots;
    return deliverableSlots.filter(
      (s) => (s.contentType || '').toLowerCase() === activeFilter.toLowerCase()
    );
  }, [deliverableSlots, activeFilter]);

  const handleAssign = (slot) => {
    if (!canManage && !onAssignTask) return;
    const projectTitlePrefix = project?.name ? ` - ${project.name}` : '';
    const fullTitle = `${slot.suggestedTitle}${projectTitlePrefix}`;
    setShowAllModal(false);
    onAssignTask?.({
      deliverable: slot.deliverable,
      slotNumber: slot.slotNumber,
      title: fullTitle,
      contentType: slot.contentType,
    });
  };

  const getDeliverableIcon = (contentType = '') => {
    const norm = contentType.toLowerCase();
    const matched = STANDARD_DELIVERABLE_TYPES.find(
      (t) => (t.value || '').toLowerCase() === norm
    );
    return matched?.icon || Target;
  };

  const FirstIcon = getDeliverableIcon(firstSlot.contentType);

  return (
    <>
      {/* ── CLOSED CARD IN TO DO COLUMN ───────────────────────────────── */}
      <div className="rounded-2xl border border-primary/30 bg-card p-3.5 space-y-2.5 shadow-xs transition-all hover:border-primary/50">
        {/* Header row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/15 text-primary shrink-0">
              <Target size={12} />
            </span>
            <span className="text-xs font-bold text-foreground truncate">
              Deliverable Targets
            </span>
          </div>

          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/10 text-primary tabular-nums shrink-0">
            {deliverableSlots.length} Planned
          </span>
        </div>

        {/* 1 Preview Item */}
        {(() => {
          const firstStyle = getDeliverableColorStyle(firstSlot.contentType);
          return (
            <div className={`p-2.5 rounded-xl space-y-1.5 shadow-xs ${firstStyle.surface}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-card border border-border/60 text-[10px] font-bold shrink-0">
                    #{firstSlot.slotNumber}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${firstStyle.badge}`}>
                    <FirstIcon size={10} className="shrink-0" />
                    <span>{firstSlot.contentType}</span>
                  </span>
                </div>

                {canManage && !firstSlot.isAssigned && (
                  <button
                    type="button"
                    onClick={() => handleAssign(firstSlot)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-bold transition-all cursor-pointer shadow-xs shrink-0"
                  >
                    <Plus size={11} />
                    <span>Assign</span>
                  </button>
                )}
              </div>

              <p
                onClick={() => {
                  if (firstSlot.isAssigned) {
                    onSelectTask?.(firstSlot.task._id);
                  } else {
                    handleAssign(firstSlot);
                  }
                }}
                className="text-xs font-semibold text-foreground hover:text-primary hover:underline transition-colors truncate cursor-pointer"
                title={firstSlot.isAssigned ? firstSlot.task.title : firstSlot.suggestedTitle}
              >
                {firstSlot.isAssigned ? firstSlot.task.title : firstSlot.suggestedTitle}
              </p>
            </div>
          );
        })()}

        {/* "+ and more" Closed Way Trigger: Click and View */}
        {remainingCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAllModal(true)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-secondary/50 hover:bg-secondary/80 text-foreground transition-all cursor-pointer group text-left"
          >
            <span className="text-[11px] font-bold text-primary flex items-center gap-1">
              <span>+ {remainingCount} more targets</span>
            </span>
            <span className="text-[10px] text-muted-foreground group-hover:text-foreground inline-flex items-center gap-0.5 font-semibold">
              <span>Click to view</span>
              <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
            </span>
          </button>
        )}
      </div>

      {/* ── MODAL TO VIEW ALL DELIVERABLE TARGETS & ASSIGN ─────────────── */}
      {showAllModal && (
        <Dialog open={showAllModal} onOpenChange={setShowAllModal}>
          <DialogContent size="lg" className="max-w-2xl p-0 overflow-hidden rounded-3xl bg-card border border-border/40 shadow-2xl">
            <DialogHeader className="p-5 sm:p-6 pb-4 border-b border-border/30 bg-secondary/15">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary shrink-0">
                  <Target size={20} />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                    Deliverable Targets Queue ({deliverableSlots.length} Items Planned)
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Click any target title or the Assign button to create and assign tasks for this project.
                  </DialogDescription>
                </div>
              </div>

              {/* Filter Pills */}
              <div className="mt-4 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <button
                  type="button"
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    activeFilter === 'all'
                      ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                      : 'bg-background hover:bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All ({deliverableSlots.length})
                </button>
                {deliverables.map((d) => (
                  <button
                    key={d._id || d.contentType}
                    type="button"
                    onClick={() => setActiveFilter(d.contentType)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                      activeFilter === d.contentType
                        ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                        : 'bg-background hover:bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {d.contentType} ({d.currentCount || 0}/{d.targetQuantity || 0})
                  </button>
                ))}
              </div>
            </DialogHeader>

            {/* Target Slots List */}
            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-2 divide-y divide-border/20">
              {filteredSlots.map((slot) => {
                const ItemIcon = getDeliverableIcon(slot.contentType);
                const slotStyle = getDeliverableColorStyle(slot.contentType);

                return (
                  <div
                    key={slot.id}
                    className="pt-2.5 first:pt-0 p-3 sm:p-3.5 rounded-2xl bg-card border border-border/60 hover:border-primary/40 hover:bg-secondary/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary text-foreground text-xs font-bold shrink-0">
                        #{slot.slotNumber}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md ${slotStyle.badge}`}>
                            <ItemIcon size={11} className="shrink-0" />
                            <span>{slot.contentType}</span>
                          </span>

                          {slot.isAssigned ? (
                            <button
                              type="button"
                              onClick={() => {
                                setShowAllModal(false);
                                onSelectTask?.(slot.task._id);
                              }}
                              className="text-xs font-bold text-foreground hover:text-primary hover:underline text-left truncate cursor-pointer transition-colors"
                              title="Click to view assigned task"
                            >
                              {slot.task.title || slot.suggestedTitle}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAssign(slot)}
                              className="text-xs font-semibold text-foreground hover:text-primary hover:underline text-left truncate cursor-pointer transition-colors"
                              title="Click to assign task for this deliverable"
                            >
                              {slot.suggestedTitle}
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1 flex-wrap">
                          {slot.isAssigned ? (
                            <>
                              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                                <User size={12} className="text-primary shrink-0" />
                                <span>{slot.task.assignedPersonName || 'Team Assigned'}</span>
                              </span>
                              {slot.task.dueDate && (
                                <span className="tabular-nums">
                                  Due: {new Date(slot.task.dueDate).toLocaleDateString()}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/80">
                              Unassigned Slot • Ready to create & assign
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status & Action */}
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      {slot.isAssigned ? (
                        <>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 capitalize">
                            {slot.task.status || 'Assigned'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAllModal(false);
                              onSelectTask?.(slot.task._id);
                            }}
                            className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
                          >
                            View Task
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary text-muted-foreground">
                            Available
                          </span>
                          {canManage && (
                            <button
                              type="button"
                              onClick={() => handleAssign(slot)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-all cursor-pointer shadow-xs"
                            >
                              <Plus size={13} />
                              <span>Assign Task</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default ProjectTodoDeliverablesCard;
