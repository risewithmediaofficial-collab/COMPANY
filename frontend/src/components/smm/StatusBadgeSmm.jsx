import React from 'react';

const statusStyles = {
  Active: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  Draft: 'bg-slate-500/10 text-slate-600 border-slate-200',
  'Pending Approval': 'bg-amber-500/10 text-amber-600 border-amber-200',
  Pending: 'bg-amber-500/10 text-amber-600 border-amber-200',
  Scheduled: 'bg-purple-500/10 text-purple-600 border-purple-200',
  Paused: 'bg-orange-500/10 text-orange-600 border-orange-200',
  Completed: 'bg-blue-500/10 text-blue-600 border-blue-200',
  Approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  Rejected: 'bg-rose-500/10 text-rose-600 border-rose-200',
  'Changes Requested': 'bg-violet-500/10 text-violet-600 border-violet-200',
};

export const StatusBadgeSmm = ({ status }) => {
  const style = statusStyles[status] || 'bg-secondary text-muted-foreground border-border';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {status}
    </span>
  );
};
