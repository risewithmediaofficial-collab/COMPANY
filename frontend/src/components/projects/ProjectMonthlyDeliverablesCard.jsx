import React, { useState } from 'react';
import {
  Target,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit2,
  Video,
  Film,
  Image,
  BookOpen,
  Layers,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  useProjectMonthlyDeliverables,
  useBatchSaveProjectMonthlyDeliverables,
} from '../../hooks/useMonthlyDeliverables';
import {
  MONTH_NAMES,
  STANDARD_DELIVERABLE_TYPES,
  MonthlyDeliverablesSection,
} from './MonthlyDeliverablesSection';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const ProjectMonthlyDeliverablesCard = ({
  project,
  canManage = false,
  className = '',
}) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showManageModal, setShowManageModal] = useState(false);
  const [editingDeliverables, setEditingDeliverables] = useState([]);

  const {
    data: deliverablesData,
    isLoading,
    refetch,
  } = useProjectMonthlyDeliverables(project?._id, selectedMonth, selectedYear);

  const batchSave = useBatchSaveProjectMonthlyDeliverables();

  const deliverables = deliverablesData?.deliverables || [];
  const monthName = MONTH_NAMES[selectedMonth - 1] || '';

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonth((prev) => prev + 1);
    }
  };

  const handleOpenManageModal = () => {
    setEditingDeliverables(
      deliverables.map((d) => ({
        _id: d._id,
        contentType: d.contentType,
        targetQuantity: d.targetQuantity,
      }))
    );
    setShowManageModal(true);
  };

  const handleSaveModal = async () => {
    try {
      await batchSave.mutateAsync({
        projectId: project._id,
        month: selectedMonth,
        year: selectedYear,
        deliverables: editingDeliverables,
      });
      toast.success('Monthly deliverable targets updated');
      setShowManageModal(false);
      refetch();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update targets');
    }
  };

  // If no targets configured and cannot manage, show subtle empty state
  if (!isLoading && deliverables.length === 0 && !canManage) {
    return null;
  }

  return (
    <>
      <div
        className={`rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-4 transition-all ${className}`}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
              <Target size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">Monthly Deliverables</h2>
                <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                  {monthName} {selectedYear}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Track content deliverables and over-task quotas for this project
              </p>
            </div>
          </div>

          {/* Month controls & Actions */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="flex items-center rounded-xl border border-border bg-secondary/30 p-0.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
                title="Previous Month"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 text-xs font-semibold text-foreground select-none">
                {monthName.slice(0, 3)} {selectedYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-card hover:text-foreground transition-colors"
                title="Next Month"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {canManage && (
              <Button
                type="button"
                onClick={handleOpenManageModal}
                size="sm"
                variant="outline"
                className="h-8 rounded-xl border-border text-xs font-bold hover:bg-secondary"
              >
                <Edit2 size={13} className="mr-1.5" />
                {deliverables.length === 0 ? 'Set Targets' : 'Manage Targets'}
              </Button>
            )}
          </div>
        </div>

        {/* Deliverables Grid */}
        {isLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            Loading monthly deliverables...
          </div>
        ) : deliverables.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-secondary/15 py-8 px-4 text-center">
            <Target size={28} className="text-muted-foreground/50 mb-2" />
            <p className="text-sm font-semibold text-foreground">No Deliverable Targets Set</p>
            <p className="text-xs text-muted-foreground max-w-sm mt-0.5">
              No monthly deliverables have been configured for {monthName} {selectedYear}.
            </p>
            {canManage && (
              <Button
                type="button"
                onClick={handleOpenManageModal}
                size="sm"
                className="mt-3.5 h-8 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                <Plus size={14} className="mr-1" /> Configure {monthName} Targets
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {deliverables.map((item) => {
              const matchedType = STANDARD_DELIVERABLE_TYPES.find(
                (t) => t.value.toLowerCase() === item.contentType.toLowerCase()
              );
              const IconComponent = matchedType?.icon || Target;

              const isOver = item.status === 'OVER_TASK';
              const isReached = item.status === 'TARGET_REACHED';
              const visualProgress = Math.min(100, item.progressPercentage || 0);

              let badgeBg = 'bg-primary/10 text-primary border-primary/20';
              let badgeText = `${item.remaining} Remaining`;
              let BadgeIcon = Clock;

              if (isReached) {
                badgeBg = 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400';
                badgeText = 'Target Reached';
                BadgeIcon = CheckCircle2;
              } else if (isOver) {
                badgeBg = 'bg-rose-500/15 text-rose-600 border-rose-500/30 dark:text-rose-400 font-extrabold';
                badgeText = `🔴 Over by ${item.overBy}`;
                BadgeIcon = AlertTriangle;
              }

              return (
                <div
                  key={item._id || item.contentType}
                  className={`relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200 ${
                    isOver
                      ? 'border-rose-500/40 bg-rose-500/5 shadow-xs'
                      : isReached
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-border bg-secondary/15 hover:border-border/80'
                  }`}
                >
                  {/* Top: Icon & Status Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                          isOver
                            ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400'
                            : isReached
                            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        <IconComponent size={16} />
                      </div>
                      <h4 className="text-sm font-bold text-foreground truncate">{item.contentType}</h4>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold shrink-0 ${badgeBg}`}
                    >
                      <BadgeIcon size={11} />
                      <span>{badgeText}</span>
                    </span>
                  </div>

                  {/* Middle: Numbers */}
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-1">
                        <span className={`text-2xl font-extrabold tracking-tight ${isOver ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'}`}>
                          {item.currentCount}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">
                          / {item.targetQuantity} Target
                        </span>
                      </div>
                      <span className="text-xs font-bold text-muted-foreground">
                        {item.progressPercentage}%
                      </span>
                    </div>

                    {/* Progress Bar (capped visually at 100%) */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/80">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isOver
                            ? 'bg-rose-500'
                            : isReached
                            ? 'bg-emerald-500'
                            : 'bg-primary'
                        }`}
                        style={{ width: `${visualProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manage Targets Modal */}
      {showManageModal && (
        <Dialog open={showManageModal} onOpenChange={setShowManageModal}>
          <DialogContent size="lg" className="rounded-3xl border border-border bg-card p-6 shadow-2xl">
            <DialogHeader className="border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Target size={18} />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    Manage Monthly Deliverables
                  </DialogTitle>
                  <p className="text-xs text-muted-foreground">
                    Configure targets for {project?.name} ({monthName} {selectedYear})
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="py-3">
              <MonthlyDeliverablesSection
                deliverables={editingDeliverables}
                onChange={setEditingDeliverables}
                month={selectedMonth}
                year={selectedYear}
                onMonthChange={setSelectedMonth}
                onYearChange={setSelectedYear}
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowManageModal(false)}
                className="h-9 rounded-xl text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveModal}
                disabled={batchSave.isPending}
                className="h-9 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                {batchSave.isPending ? 'Saving...' : 'Save Targets'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default ProjectMonthlyDeliverablesCard;
