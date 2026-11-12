import React from 'react';

const platformStyles = {
  Meta: 'bg-secondary text-foreground border-border',
  'Meta Ads': 'bg-secondary text-foreground border-border',
  Google: 'bg-secondary text-foreground border-border',
  'Google Ads': 'bg-secondary text-foreground border-border',
  LinkedIn: 'bg-secondary text-foreground border-border',
  YouTube: 'bg-secondary text-foreground border-border',
  TikTok: 'bg-primary text-primary-foreground border-primary',
  Instagram: 'bg-secondary text-foreground border-border',
};

export const PlatformBadge = ({ platform }) => {
  const style = platformStyles[platform] || 'bg-secondary text-muted-foreground border-border';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style}`}>
      {platform}
    </span>
  );
};
