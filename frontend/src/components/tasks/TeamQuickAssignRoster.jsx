import React, { useState, useMemo } from 'react';
import {
  Users,
  Video,
  Code2,
  Share2,
  ShieldCheck,
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
} from '@/components/ui/muiIcons';
import { getAssetUrl } from '../../utils/assetUrl';

const CATEGORY_TABS = [
  { id: 'all', label: 'All Team', icon: Users },
  { id: 'media', label: 'Media & Creative', icon: Video },
  { id: 'dev', label: 'Developers & Tech', icon: Code2 },
  { id: 'smm', label: 'SMM & Growth', icon: Share2 },
  { id: 'management', label: 'Management', icon: ShieldCheck },
];

export const getEmployeeDepartmentCategory = (user) => {
  if (!user) return 'media';
  const dept = (user.department || '').toLowerCase();
  const pos = (user.position || user.designation || '').toLowerCase();
  const role = (user.role || '').toLowerCase();

  if (
    dept.includes('media') || dept.includes('creative') || dept.includes('video') || dept.includes('design') ||
    pos.includes('editor') || pos.includes('video') || pos.includes('graphic') || pos.includes('design') ||
    pos.includes('script') || pos.includes('creator') || pos.includes('animat') || pos.includes('voice') ||
    pos.includes('content')
  ) {
    return 'media';
  }

  if (
    dept.includes('dev') || dept.includes('tech') || dept.includes('engineer') || dept.includes('software') || dept.includes('web') ||
    pos.includes('dev') || pos.includes('frontend') || pos.includes('backend') || pos.includes('fullstack') ||
    pos.includes('engineer') || pos.includes('programmer') || pos.includes('ui') || pos.includes('ux') ||
    pos.includes('code')
  ) {
    return 'dev';
  }

  if (
    dept.includes('smm') || dept.includes('social') || dept.includes('market') || dept.includes('ads') ||
    pos.includes('smm') || pos.includes('social') || pos.includes('ads') || pos.includes('seo') || pos.includes('growth')
  ) {
    return 'smm';
  }

  if (
    role === 'admin' || role === 'superadmin' || role === 'manager' ||
    pos.includes('manager') || pos.includes('lead') || pos.includes('director') || pos.includes('founder') ||
    dept.includes('manage')
  ) {
    return 'management';
  }

  return 'media';
};

export const TeamQuickAssignRoster = ({
  users = [],
  tasks = [],
  onQuickAssign,
  canCreate = true,
}) => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Calculate active task workload for each user
  const userWorkloadMap = useMemo(() => {
    const map = {};
    if (!Array.isArray(tasks)) return map;

    tasks.forEach((task) => {
      const isDone = ['completed', 'approved', 'done'].includes(task.status);
      if (isDone) return;

      if (Array.isArray(task.assignedTo)) {
        task.assignedTo.forEach((u) => {
          const uid = (typeof u === 'object' ? u?._id : u)?.toString();
          if (uid) map[uid] = (map[uid] || 0) + 1;
        });
      }
      if (task.assignedPersonName) {
        map[`name:${task.assignedPersonName.toLowerCase()}`] =
          (map[`name:${task.assignedPersonName.toLowerCase()}`] || 0) + 1;
      }
    });
    return map;
  }, [tasks]);

  const filteredUsers = useMemo(() => {
    if (!Array.isArray(users)) return [];

    return users.filter((user) => {
      if (user.role === 'client') return false; // Exclude client logins from employee roster

      const category = getEmployeeDepartmentCategory(user);
      if (activeTab !== 'all' && category !== activeTab) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (user.name || '').toLowerCase().includes(q);
        const posMatch = (user.position || user.designation || '').toLowerCase().includes(q);
        const deptMatch = (user.department || '').toLowerCase().includes(q);
        if (!nameMatch && !posMatch && !deptMatch) return false;
      }

      return true;
    });
  }, [users, activeTab, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts = { all: 0, media: 0, dev: 0, smm: 0, management: 0 };
    if (!Array.isArray(users)) return counts;

    users.forEach((u) => {
      if (u.role === 'client') return;
      counts.all += 1;
      const cat = getEmployeeDepartmentCategory(u);
      if (counts[cat] !== undefined) counts[cat] += 1;
    });
    return counts;
  }, [users]);

  return (
    <div className="relative mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm transition-colors duration-200">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-3 pb-3 border-b border-border sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Team Roster & Quick Task Assignment
            </h3>
            <p className="text-xs text-muted-foreground">
              Pick any team member by role to instantly assign a task directly into their Kanban queue
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter employee or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-44 rounded-lg border border-border bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:outline-none sm:w-56"
            />
          </div>

          {/* Collapse / Expand Toggle Button */}
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-secondary px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary/80 cursor-pointer"
            title={isCollapsed ? 'Expand Team Roster' : 'Collapse Team Roster'}
          >
            {isCollapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            <span>{isCollapsed ? 'Show Roster' : 'Hide'}</span>
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Role / Department Filter Tabs */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORY_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = categoryCounts[tab.id] || 0;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <TabIcon className="h-3.5 w-3.5 shrink-0" />
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                  isActive
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Employee Cards Grid / Carousel */}
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {filteredUsers.length === 0 ? (
          <div className="col-span-full py-6 text-center text-xs text-muted-foreground">
            No team members found for this filter.
          </div>
        ) : (
          filteredUsers.map((user) => {
            const uid = user._id?.toString();
            const activeCount =
              (userWorkloadMap[uid] || 0) +
              (userWorkloadMap[`name:${(user.name || '').toLowerCase()}`] || 0);

            const category = getEmployeeDepartmentCategory(user);
            const initials = (user.name || 'U')
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            const avatarSrc = user.avatar ? getAssetUrl(user.avatar) : null;

            return (
              <div
                key={user._id}
                className="group relative flex flex-col justify-between rounded-xl border border-border bg-background p-2.5 transition-colors hover:border-foreground/40 hover:bg-secondary/40 hover:shadow-sm"
              >
                {/* Employee Details */}
                <div className="flex items-start gap-2.5">
                  <div className="relative flex-shrink-0">
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt={user.name}
                        className="h-10 w-10 rounded-full object-cover ring-2 ring-background shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm ring-2 ring-background">
                        {initials}
                      </div>
                    )}
                    {/* Workload Indicator dot */}
                    <span
                      title={`${activeCount} active tasks`}
                      className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-background text-[9px] font-bold tabular-nums ${
                        activeCount > 3
                          ? 'bg-primary text-primary-foreground'
                          : activeCount > 0
                          ? 'bg-foreground/80 text-background'
                          : 'bg-secondary text-muted-foreground border border-border'
                      }`}
                    >
                      {activeCount > 0 ? activeCount : '•'}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      title={user.name}
                      className="truncate text-xs font-semibold text-foreground"
                    >
                      {user.name}
                    </p>
                    <p
                      title={user.position || user.designation || user.role}
                      className="truncate text-[11px] text-muted-foreground"
                    >
                      {user.position || user.designation || user.role || 'Member'}
                    </p>

                    <span className="mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider bg-secondary text-muted-foreground border border-border">
                      {category}
                    </span>
                  </div>
                </div>

                {/* Bottom Quick-Assign Action */}
                <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {activeCount === 0 ? 'Idle' : `${activeCount} in progress`}
                  </span>

                  {canCreate ? (
                    <button
                      onClick={() => onQuickAssign && onQuickAssign(user)}
                      title={`Create task for ${user.name}`}
                      className="inline-flex h-6 items-center gap-1 rounded-md bg-secondary border border-border px-2 text-[11px] font-semibold text-foreground transition-colors hover:bg-primary hover:text-primary-foreground hover:border-primary cursor-pointer"
                    >
                      <Plus className="h-3 w-3 stroke-[2.5]" />
                      <span>Assign</span>
                    </button>
                  ) : (
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      Team Member
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
      </>
      )}
    </div>
  );
};

export default TeamQuickAssignRoster;
