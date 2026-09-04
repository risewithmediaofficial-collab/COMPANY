import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Video, Calendar, Megaphone, Layers,
  PlayCircle, Clock, BarChart2, FileSpreadsheet, DollarSign
} from 'lucide-react';

const SMM_NAV_ITEMS = [
  { name: 'Overview', path: '/smm', icon: LayoutDashboard, exact: true },
  { name: 'Content', path: '/smm/content', icon: Video },
  { name: 'Content Calendar', path: '/smm/calendar', icon: Calendar },
  // ── Ads Manager Section ──
  { name: 'Campaigns', path: '/smm/campaigns', icon: Megaphone },
  { name: 'Ad Sets', path: '/smm/adsets', icon: Layers },
  { name: 'Ads', path: '/smm/ads', icon: PlayCircle },
  { name: 'Budget', path: '/smm/budget', icon: DollarSign },
  // ── Operations & Tracking Section ──
  { name: 'Daily Tracking', path: '/smm/daily-tracking', icon: Clock },
  { name: 'Analytics', path: '/smm/analytics', icon: BarChart2, aliases: ['/smm/performance'] },
  { name: 'Reports', path: '/smm/reports', icon: FileSpreadsheet },
];

const SECTION_LABELS = {
  '/smm/campaigns': 'Ads Manager',
  '/smm/daily-tracking': 'Tracking & Intelligence',
};

export const SMMSubNav = () => {
  const location = useLocation();

  return (
    <div className="bg-card border border-border rounded-2xl p-2 shadow-xs mb-6 overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30">
      <div className="flex items-center gap-1.5 min-w-max">
        {SMM_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? location.pathname === item.path
            : location.pathname === item.path ||
              (item.path !== '/smm' && location.pathname.startsWith(`${item.path}/`)) ||
              Boolean(item.aliases && item.aliases.some((a) => location.pathname === a || location.pathname.startsWith(`${a}/`)));

          const showDivider = Boolean(SECTION_LABELS[item.path]);

          return (
            <React.Fragment key={item.path}>
              {showDivider && (
                <div className="flex items-center gap-2 px-1.5">
                  <div className="w-px h-5 bg-border/80" />
                  <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider px-2 py-0.5 rounded-md bg-muted/60 border border-border/40 select-none">
                    {SECTION_LABELS[item.path]}
                  </span>
                </div>
              )}
              <Link
                to={item.path}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon size={15} />
                <span>{item.name}</span>
              </Link>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default SMMSubNav;
