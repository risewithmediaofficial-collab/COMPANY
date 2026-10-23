import { motion } from 'framer-motion';

export const Skeleton = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse rounded-md bg-muted/60 ${className}`}
      {...props}
    />
  );
};

export const CardSkeleton = () => (
  <div className="rounded-2xl p-5 border border-border bg-card flex flex-col gap-4 shadow-xs">
    <div className="flex justify-between items-center">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-8 rounded-xl" />
    </div>
    <Skeleton className="h-8 w-16" />
    <Skeleton className="h-3 w-32" />
  </div>
);

export const ChartSkeleton = () => (
  <div className="rounded-2xl p-6 border border-border bg-card flex flex-col gap-4 h-[320px] shadow-xs">
    <div className="flex justify-between items-center">
      <div>
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-3 w-12 rounded-full" />
    </div>
    <div className="flex-1 flex items-end gap-3 pt-6">
      {[...Array(12)].map((_, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <Skeleton 
            className="w-full rounded-t-lg" 
            style={{ height: `${Math.floor(Math.random() * 60) + 20}%` }} 
          />
          <Skeleton className="h-3 w-8" />
        </div>
      ))}
    </div>
  </div>
);

export const TableSkeleton = ({ columns = 5, rows = 5 }) => (
  <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
    <div className="px-6 py-4 border-b border-border bg-muted/20">
      <Skeleton className="h-4 w-32" />
    </div>
    <div className="p-6 space-y-4">
      {[...Array(rows)].map((_, r) => (
        <div key={r} className="flex items-center gap-4 justify-between border-b border-border/50 pb-4 last:border-b-0 last:pb-0">
          {[...Array(columns)].map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" style={{ maxWidth: c === 0 ? '120px' : 'none' }} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const DetailSkeleton = ({ dark }) => (
  <div className="space-y-6 animate-pulse">
    <div className="flex justify-between items-start">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-10 w-28 rounded-xl" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <div className="p-6 border border-border rounded-2xl bg-card space-y-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <div className="space-y-6">
        <div className="p-6 border border-border rounded-2xl bg-card space-y-4">
          <Skeleton className="h-5 w-24" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      </div>
    </div>
  </div>
);
