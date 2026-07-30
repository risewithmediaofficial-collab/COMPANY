import React from 'react';

const platformStyles = {
  Meta: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800',
  'Meta Ads': 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800',
  Google: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800',
  'Google Ads': 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800',
  LinkedIn: 'bg-sky-500/10 text-sky-700 border-sky-200 dark:border-sky-800',
  YouTube: 'bg-red-500/10 text-red-600 border-red-200 dark:border-red-800',
  TikTok: 'bg-slate-900/10 text-slate-900 border-slate-300 dark:text-white dark:border-slate-700',
  Instagram: 'bg-pink-500/10 text-pink-600 border-pink-200 dark:border-pink-800',
};

export const PlatformBadge = ({ platform }) => {
  const style = platformStyles[platform] || 'bg-secondary text-muted-foreground border-border';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style}`}>
      {platform}
    </span>
  );
};
