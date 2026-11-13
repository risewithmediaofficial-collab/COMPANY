import React from 'react';
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
} from '@/components/ui/muiIcons';
import { useProjectMonthlyDeliverables } from '../../hooks/useMonthlyDeliverables';
import {
  MONTH_NAMES,
  STANDARD_DELIVERABLE_TYPES,
} from './MonthlyDeliverablesSection';

export const ProjectTaskTargetsBanner = ({
  projectId,
  month,
  year,
  activeDeliverableType = '',
  onSelectDeliverable,
  className = '',
}) => {
  const now = new Date();
  const m = month || now.getMonth() + 1;
  const y = year || now.getFullYear();

  const { data, isLoading } = useProjectMonthlyDeliverables(projectId, m, y);

  if (!projectId || projectId === '_none') return null;

  const deliverables = data?.deliverables || [];
  const totalTargets = data?.totalTargets || 0;
  const totalCurrent = data?.totalCurrent || 0;
  const monthName = MONTH_NAMES[m - 1] || '';

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
    <div className={`rounded-2xl bg-secondary/15 border border-border/50 p-3 sm:p-3.5 space-y-2.5 ${className}`}>
      {/* Header with overall count */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Target size={14} />
          </span>
          <h4 className="text-xs font-bold text-foreground">
            Project Monthly Targets
            <span className="ml-1.5 text-[11px] font-semibold text-muted-foreground">
              ({monthName} {y})
            </span>
          </h4>
        </div>

        <div className="flex items-center gap-2 tabular-nums">
          <span className="text-xs font-bold text-foreground">
            {totalCurrent} / {totalTargets} Tasks
          </span>
          <span className="text-[11px] font-semibold text-muted-foreground">
            ({overallPercent}%)
          </span>
        </div>
      </div>

      {/* Deliverable Target Chips / Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {deliverables.map((item) => {
          const matchedType = STANDARD_DELIVERABLE_TYPES.find(
            (t) => t.value.toLowerCase() === item.contentType.toLowerCase()
          );
          const Icon = matchedType?.icon || Target;
          const isOver = item.status === 'OVER_TASK';
          const isReached = item.status === 'TARGET_REACHED';
          const isSelected =
            activeDeliverableType &&
            item.contentType.toLowerCase().includes(activeDeliverableType.toLowerCase());

          return (
            <div
              key={item._id || item.contentType}
              onClick={() => onSelectDeliverable && onSelectDeliverable(item)}
              role={onSelectDeliverable ? 'button' : undefined}
              className={`rounded-xl p-2.5 transition-all text-left flex flex-col justify-between gap-1.5 select-none ${
                onSelectDeliverable ? 'cursor-pointer hover:bg-secondary/60 active:scale-[0.98]' : ''
              } ${
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
    </div>
  );
};

export default ProjectTaskTargetsBanner;

