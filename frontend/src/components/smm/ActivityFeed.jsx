import React from 'react';
import { Activity, CheckCircle2, Clock, Play, AlertCircle, Plus, Edit3, DollarSign, Upload } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const actionIcons = {
  'Campaign Created': Plus,
  'Campaign Updated': Edit3,
  'Status Changed': Play,
  'Budget Changed': DollarSign,
  'Ad Published': Upload,
  'Approval Given': CheckCircle2,
  'Approval Rejected': AlertCircle,
};

export const ActivityFeed = ({ activities = [] }) => {
  if (!activities.length) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No activity recorded yet.
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {activities.map((item, idx) => {
          const Icon = actionIcons[item.action] || Activity;
          return (
            <li key={item._id || idx}>
              <div className="relative pb-8">
                {idx !== activities.length - 1 && (
                  <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-border" aria-hidden="true" />
                )}
                <div className="relative flex space-x-3">
                  <div>
                    <span className="h-8 w-8 rounded-full bg-secondary border border-border flex items-center justify-center ring-4 ring-card">
                      <Icon size={14} className="text-primary" />
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                    <div>
                      <p className="text-xs text-foreground font-medium">
                        <span className="font-semibold">{item.performedBy?.name || 'System'}</span>{' '}
                        {item.action.toLowerCase()}{' '}
                        <span className="font-semibold text-primary">{item.entityName}</span>
                      </p>
                    </div>
                    <div className="whitespace-nowrap text-right text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock size={12} />
                      {item.createdAt ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true }) : 'Just now'}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
