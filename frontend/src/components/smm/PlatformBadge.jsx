import React from 'react';

const platformStyles = {
  Meta: 'bg-secondary text-foreground ',
  'Meta Ads': 'bg-secondary text-foreground ',
  Google: 'bg-secondary text-foreground ',
  'Google Ads': 'bg-secondary text-foreground ',
  LinkedIn: 'bg-secondary text-foreground ',
  YouTube: 'bg-secondary text-foreground ',
  TikTok: 'bg-primary text-primary-foreground ',
  Instagram: 'bg-secondary text-foreground ',
};

export const PlatformBadge = ({ platform }) => {
  const style = platformStyles[platform] || 'bg-secondary text-muted-foreground ';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${style}`}>
      {platform}
    </span>
  );
};
