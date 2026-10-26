import React from 'react';
import {
  FileText,
  Camera,
  Film,
  Share2,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

const PIPELINE_STAGES = [
  { key: 'Scriptwriting', label: 'Script Draft & Review', icon: FileText, color: 'indigo' },
  { key: 'Videography', label: 'Shoot & Raw Footage', icon: Camera, color: 'blue' },
  { key: 'Video Editing', label: 'Editing & Motion', icon: Film, color: 'purple' },
  { key: 'SMM', label: 'SMM & Scheduling', icon: Share2, color: 'pink' },
  { key: 'Published', label: 'Live / Published', icon: CheckCircle2, color: 'emerald' },
];

export const StagePipelineStepper = ({ currentStage, overallStatus, onStageClick }) => {
  const stageOrder = ['Scriptwriting', 'Videography', 'Video Editing', 'SMM', 'Published'];
  const currentIndex = stageOrder.indexOf(currentStage) !== -1 ? stageOrder.indexOf(currentStage) : 0;
  const isRevision = overallStatus === 'Revision Required';

  return (
    <div className="w-full bg-card/60 backdrop-blur-md border border-border/80 rounded-2xl p-4 sm:p-5 shadow-xs transition-all">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Production Stage Progression
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <h4 className="text-base font-bold text-foreground flex items-center gap-2">
              <span>Current Stage:</span>
              <span className="text-primary">{currentStage}</span>
            </h4>
            {isRevision && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                <AlertCircle size={12} />
                Revision in Progress
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-xl border border-border/60">
          <Clock size={13} className="text-primary" />
          <span>Overall:</span>
          <span className="font-semibold text-foreground capitalize">{overallStatus}</span>
        </div>
      </div>

      {/* Responsive Pipeline Stepper */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3">
        {PIPELINE_STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isPassed = idx < currentIndex || overallStatus === 'Published';
          const isCurrent = idx === currentIndex && overallStatus !== 'Published';
          const isUpcoming = idx > currentIndex && overallStatus !== 'Published';

          let stateClasses = 'bg-secondary/40 border-border/60 text-muted-foreground opacity-60';
          let iconClasses = 'bg-secondary text-muted-foreground';

          if (isCurrent) {
            stateClasses = isRevision
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-300 ring-2 ring-rose-500/20'
              : 'bg-primary/10 border-primary/40 text-primary ring-2 ring-primary/20 shadow-xs';
            iconClasses = isRevision
              ? 'bg-rose-500 text-white shadow-xs shadow-rose-500/30'
              : 'bg-primary text-primary-foreground shadow-xs shadow-primary/30';
          } else if (isPassed) {
            stateClasses = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400';
            iconClasses = 'bg-emerald-500 text-white';
          }

          return (
            <button
              key={stage.key}
              type="button"
              onClick={() => onStageClick && onStageClick(stage.key)}
              className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all hover:scale-[1.01] cursor-pointer ${stateClasses}`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconClasses}`}>
                {isPassed ? <CheckCircle2 size={16} /> : <Icon size={16} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                  Step 0{idx + 1}
                </div>
                <div className="text-xs font-semibold truncate leading-tight mt-0.5">
                  {stage.label}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StagePipelineStepper;
