import React from 'react';

const statusStyles = {
  Active: 'bg-primary text-primary-foreground ',
  Draft: 'bg-secondary text-muted-foreground ',
  'Pending Approval': 'bg-card text-foreground ',
  Pending: 'bg-secondary text-foreground ',
  Scheduled: 'bg-secondary/70 text-foreground ',
  Paused: 'bg-card text-muted-foreground ',
  Completed: 'bg-primary text-primary-foreground ',
  Approved: 'bg-primary text-primary-foreground ',
  Rejected: 'bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 ',
  'Changes Requested': 'bg-secondary text-foreground ',
};

export const StatusBadgeSmm = ({ status }) => {
  const style = statusStyles[status] || 'bg-secondary text-muted-foreground ';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5" />
      {status}
    </span>
  );
};
