import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Kanban,
  CheckSquare,
  Zap,
  GitPullRequest,
  Bug,
  Rocket,
} from '@/components/ui/muiIcons';

const DEV_NAV_ITEMS = [
  { name: 'Overview', path: '/development', icon: LayoutDashboard, exact: true },
  { name: 'Dev Board', path: '/development/board', icon: Kanban },
  { name: 'My Tasks', path: '/development/my-tasks', icon: CheckSquare },
  { name: 'Sprints', path: '/development/sprints', icon: Zap },
  { name: 'Code Reviews', path: '/development/reviews', icon: GitPullRequest },
  { name: 'QA & Testing', path: '/development/qa', icon: Bug },
  { name: 'Releases', path: '/development/releases', icon: Rocket },
];

export const DevelopmentSubNav = () => {
  const location = useLocation();

  return (
    <div className="bg-card rounded-2xl p-1.5 sm:p-2 mb-4 sm:mb-6 responsive-table-container overflow-x-auto max-w-full custom-scrollbar">
      <div className="flex items-center gap-1 sm:gap-1.5 min-w-max">
        {DEV_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? location.pathname === item.path
            : location.pathname === item.path ||
              (item.path !== '/development' && location.pathname.startsWith(`${item.path}/`));

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-semibold shrink-0 min-h-[36px] sm:min-h-[38px] transition-all duration-150 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-[0_4px_12px_-4px_hsl(var(--brand)/0.45)]'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <Icon size={14} className="shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
