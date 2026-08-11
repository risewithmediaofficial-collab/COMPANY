import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Megaphone, Users, Layers,
  BarChart2, FileSpreadsheet, PlayCircle
} from 'lucide-react';

const SMM_NAV_ITEMS = [
  { name: 'Dashboard', path: '/smm', icon: LayoutDashboard, exact: true },
  { name: 'Organic Content', path: '/smm/content', icon: FileText },
  // ── Paid Ads Section ──
  { name: 'Campaigns', path: '/smm/campaigns', icon: PlayCircle },
  { name: 'Ad Sets', path: '/smm/adsets', icon: Layers },
  { name: 'Ads', path: '/smm/ads', icon: Megaphone },
  // ── Performance Section ──
  { name: 'Leads', path: '/smm/leads', icon: Users },
  { name: 'Analytics', path: '/smm/performance', icon: BarChart2 },
  { name: 'Reports', path: '/smm/reports', icon: FileSpreadsheet },
];

const SECTION_LABELS = {
  '/smm/campaigns': 'Paid Ads',
  '/smm/leads': 'Performance',
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
            : location.pathname === item.path || (item.path !== '/smm' && location.pathname.startsWith(item.path));

          const showDivider = item.path === '/smm/campaigns' || item.path === '/smm/leads';

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
