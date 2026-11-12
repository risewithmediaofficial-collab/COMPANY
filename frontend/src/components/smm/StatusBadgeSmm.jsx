import React from 'react';

const statusStyles = {
  Active: 'bg-primary text-primary-foreground border-primary',
  Draft: 'bg-secondary text-muted-foreground border-border',
  'Pending Approval': 'bg-card text-foreground border-foreground/40',
  Pending: 'bg-secondary text-foreground border-border',
  Scheduled: 'bg-secondary/70 text-foreground border-border',
  Paused: 'bg-card text-muted-foreground border-border',
  Completed: 'bg-primary text-primary-foreground border-primary',
  Approved: 'bg-primary text-primary-foreground border-primary',
  Rejected: 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 border-border',
  'Changes Requested': 'bg-secondary text-foreground border-border',
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
