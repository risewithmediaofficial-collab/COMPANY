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
} from 'lucide-react';

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
    <div className="bg-card border border-border rounded-2xl p-2 shadow-xs mb-6 responsive-table-container overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30">
      <div className="flex items-center gap-1.5 min-w-max">
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
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 min-h-[38px] transition-all duration-200 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <Icon size={15} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
