import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, PlayCircle, Layers, FileText,
  Palette, Calendar, BarChart2, FileSpreadsheet, Users2
} from 'lucide-react';

const SMM_NAV_ITEMS = [
  { name: 'Dashboard', path: '/smm', icon: LayoutDashboard },
  { name: 'Campaigns', path: '/smm/campaigns', icon: PlayCircle },
  { name: 'Ad Sets', path: '/smm/adsets', icon: Layers },
  { name: 'Ads', path: '/smm/ads', icon: FileText },
  { name: 'Creative Library', path: '/smm/creatives', icon: Palette },
  { name: 'Content Calendar', path: '/smm/calendar', icon: Calendar },
  { name: 'Performance', path: '/smm/performance', icon: BarChart2 },
  { name: 'Reports', path: '/smm/reports', icon: FileSpreadsheet },
  { name: 'Team & Tasks', path: '/smm/team', icon: Users2 },
];

export const SMMSubNav = () => {
  const location = useLocation();

  return (
    <div className="bg-card border border-border rounded-2xl p-2 shadow-xs mb-6 overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30">
      <div className="flex items-center gap-1 min-w-max">
        {SMM_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <Icon size={16} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
