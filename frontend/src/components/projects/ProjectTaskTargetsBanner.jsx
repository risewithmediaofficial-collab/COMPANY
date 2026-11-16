import React, { useState, useMemo } from 'react';
import {
  Target,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Layers,
  Video,
  Film,
  Image,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Plus,
  User,
  Check,
  ListFilter,
} from '@/components/ui/muiIcons';
import { useProjectMonthlyDeliverables } from '../../hooks/useMonthlyDeliverables';
import {
  MONTH_NAMES,
  STANDARD_DELIVERABLE_TYPES,
} from './MonthlyDeliverablesSection';
import { getDeliverableDemoTitles } from './ProjectMonthlyDeliverablesCard';

export const ProjectTaskTargetsBanner = ({
  projectId,
  month,
  year,
  activeDeliverableType = '',
  selectedSlotTitle = '',
  onSelectDeliverable,
  onSelectDeliverableSlot,
  className = '',
}) => {
  const now = new Date();
  const m = month || now.getMonth() + 1;
  const y = year || now.getFullYear();

  const [activeTab, setActiveTab] = useState('all');
  const [showSlotsList, setShowSlotsList] = useState(true);

  const { data, isLoading } = useProjectMonthlyDeliverables(projectId, m, y);

  if (!projectId || projectId === '_none') return null;

  const deliverables = data?.deliverables || [];
  const totalTargets = data?.totalTargets || 0;
  const totalCurrent = data?.totalCurrent || 0;
  const monthName = MONTH_NAMES[m - 1] || '';

  // Prepare deliverable slots list
  const deliverableSlots = useMemo(() => {
    return deliverables.flatMap((item) => {
      const demoList = getDeliverableDemoTitles(item.contentType, Math.max(10, item.targetQuantity || 10));
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

  const filteredSlots = useMemo(() => {
    if (activeTab === 'all') return deliverableSlots;
    return deliverableSlots.filter(
      (s) => (s.contentType || '').toLowerCase() === activeTab.toLowerCase()
    );
  }, [deliverableSlots, activeTab]);

  if (isLoading) {
    return (
      <div className={`p-3 rounded-xl bg-secondary/30 text-xs text-muted-foreground animate-pulse ${className}`}>
        Loading monthly deliverable targets…
      </div>
    );
  }

  if (deliverables.length === 0) {
    return (
      <div className={`p-3 rounded-xl bg-secondary/20 text-xs text-muted-foreground flex items-center gap-2 ${className}`}>
        <Target size={14} className="shrink-0 text-muted-foreground" />
        <span>No monthly targets configured for this project in {monthName} {y}.</span>
      </div>
    );
  }

  const overallPercent = totalTargets > 0 ? Math.min(100, Math.round((totalCurrent / totalTargets) * 100)) : 0;

  return (
    <div className={`rounded-2xl bg-secondary/15 border border-border/50 p-3 sm:p-3.5 space-y-3 ${className}`}>
      {/* Header with overall count & toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Target size={14} />
          </span>
          <h4 className="text-xs font-bold text-foreground">
            This Month's Targets & Quotas
            <span className="ml-1.5 text-[11px] font-semibold text-muted-foreground">
              ({monthName} {y})
            </span>
          </h4>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-foreground tabular-nums">
            {totalCurrent} / {totalTargets} Tasks ({overallPercent}%)
          </span>
          <button
            type="button"
            onClick={() => setShowSlotsList(!showSlotsList)}
            className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline cursor-pointer ml-1"
          >
            <span>{showSlotsList ? 'Hide Target List' : 'View Target List'}</span>
            {showSlotsList ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Deliverable Target Chips / Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {deliverables.map((item) => {
          const itemTypeStr = (item.contentType || item.deliverableType || item.type || '').toLowerCase();
          const matchedType = STANDARD_DELIVERABLE_TYPES.find(
            (t) => (t.value || '').toLowerCase() === itemTypeStr
          );
          const Icon = matchedType?.icon || Target;
          const isOver = item.status === 'OVER_TASK';
          const isReached = item.status === 'TARGET_REACHED';
          const isSelected =
            activeDeliverableType &&
            itemTypeStr.includes(activeDeliverableType.toLowerCase());

          return (
            <div
              key={item._id || item.contentType}
              onClick={() => {
                onSelectDeliverable && onSelectDeliverable(item);
                setActiveTab(item.contentType);
              }}
              role="button"
              className={`rounded-xl p-2.5 transition-all text-left flex flex-col justify-between gap-1.5 select-none cursor-pointer hover:bg-secondary/60 active:scale-[0.98] ${
                isSelected
                  ? 'bg-primary/10 ring-2 ring-primary border-transparent'
                  : isReached || isOver
                  ? 'bg-secondary/40 border border-border/40'
                  : 'bg-card border border-border/50'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Icon size={14} className={isSelected ? 'text-primary' : 'text-muted-foreground'} />
                  <span className="text-xs font-bold text-foreground truncate">
                    {item.contentType}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md tabular-nums ${
                    isReached
                      ? 'bg-primary text-primary-foreground'
                      : isOver
                      ? 'bg-amber-500/20 text-amber-500'
                      : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {isReached
                    ? 'Target Met'
                    : isOver
                    ? `+${item.overBy} over`
                    : `${item.remaining} left`}
                </span>
              </div>

              {/* Progress and Numbers */}
              <div className="space-y-1 tabular-nums">
                <div className="flex items-baseline justify-between text-[11px]">
                  <span className="font-extrabold text-foreground">
                    {item.currentCount}
                    <span className="font-normal text-muted-foreground"> / {item.targetQuantity}</span>
                  </span>
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {item.progressPercentage || 0}%
                  </span>
                </div>

                <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isReached || isOver ? 'bg-primary' : 'bg-primary/80'
                    }`}
                    style={{ width: `${Math.min(100, item.progressPercentage || 0)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── INTERACTIVE TARGET SLOTS & TITLE SELECTION LIST ────────────── */}
      {showSlotsList && (
        <div className="mt-2 pt-2.5 border-t border-border/30 space-y-2 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <ListFilter size={12} className="text-primary" />
              <span>Select Deliverable Title to Assign Task ({deliverableSlots.length} Items):</span>
            </span>

            {/* Sub-filter tabs */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              {deliverables.map((d) => (
                <button
                  key={d._id || d.contentType}
                  type="button"
                  onClick={() => setActiveTab(d.contentType)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === d.contentType
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary/40 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {d.contentType} ({d.currentCount}/{d.targetQuantity})
                </button>
              ))}
            </div>
          </div>

          {/* Slots List Container */}
          <div className="max-h-48 overflow-y-auto custom-scrollbar rounded-xl border border-border/40 bg-card divide-y divide-border/30">
            {filteredSlots.length === 0 ? (
              <div className="p-3 text-center text-xs text-muted-foreground">
                No slots found.
              </div>
            ) : (
              filteredSlots.map((slot) => {
                const isCurrentSelected = selectedSlotTitle && (
                  selectedSlotTitle.includes(slot.suggestedTitle) ||
                  selectedSlotTitle.includes(slot.shortTitle)
                );

                return (
                  <div
                    key={slot.id}
                    onClick={() => {
                      onSelectDeliverableSlot && onSelectDeliverableSlot(slot);
                    }}
                    role="button"
                    className={`px-3 py-2 flex items-center justify-between gap-2 text-left cursor-pointer transition-colors select-none ${
                      isCurrentSelected
                        ? 'bg-primary/15 font-bold text-primary'
                        : slot.isAssigned
                        ? 'hover:bg-secondary/40 text-foreground'
                        : 'hover:bg-primary/5 text-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-secondary text-[10px] font-bold shrink-0">
                        #{slot.slotNumber}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-secondary/80 text-muted-foreground shrink-0">
                            {slot.contentType}
                          </span>
                          <span className="text-xs truncate font-medium">
                            {slot.isAssigned ? slot.task.title : slot.suggestedTitle}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isCurrentSelected && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/20 px-2 py-0.5 rounded-full">
                          <Check size={11} /> Selected
                        </span>
                      )}
                      {slot.isAssigned ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 capitalize">
                          {slot.task.status || 'Assigned'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors">
                          + Assign
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectTaskTargetsBanner;

