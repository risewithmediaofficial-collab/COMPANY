import React, { useState, useMemo } from 'react';
import {
  Users,
  Video,
  Code2,
  Share2,
  ShieldCheck,
  Plus,
  Search,
} from 'lucide-react';
import { getAssetUrl } from '../../utils/assetUrl';

const CATEGORY_TABS = [
  { id: 'all', label: 'All Team', icon: Users, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  { id: 'media', label: '🎬 Media & Creative', icon: Video, color: 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/20' },
  { id: 'dev', label: '💻 Developers & Tech', icon: Code2, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
  { id: 'smm', label: '📢 SMM & Growth', icon: Share2, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { id: 'management', label: '👔 Management', icon: ShieldCheck, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
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
  onOpenCreateGeneral,
  canCreate = true,
}) => {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

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
    <div className="relative mb-6 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-xl transition-all duration-300 dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-slate-950/40">
      {/* Top Header Bar */}
      <div className="flex flex-col gap-3 pb-3 border-b border-slate-100 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Team Roster & Quick Task Assignment
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pick any team member by role to instantly assign a task directly into their Kanban queue
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter employee or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-44 rounded-lg border border-slate-200 bg-slate-50/70 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-indigo-400 sm:w-56"
            />
          </div>

          {/* General Create Button - only for managers/admins */}
          {canCreate && onOpenCreateGeneral && (
            <button
              onClick={onOpenCreateGeneral}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3 text-xs font-semibold text-white shadow-sm shadow-indigo-500/20 transition-all hover:from-indigo-500 hover:to-violet-500 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Create Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Role / Department Filter Tabs */}
      <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORY_TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = categoryCounts[tab.id] || 0;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/20 dark:bg-indigo-600 dark:text-white dark:shadow-indigo-600/30'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200/70 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
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
          <div className="col-span-full py-6 text-center text-xs text-slate-400 dark:text-slate-500">
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
                className="group relative flex flex-col justify-between rounded-xl border border-slate-200/90 bg-slate-50/60 p-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-400 hover:bg-white hover:shadow-md hover:shadow-indigo-500/10 dark:border-slate-800/80 dark:bg-slate-950/40 dark:hover:border-indigo-500/60 dark:hover:bg-slate-900/90"
              >
                {/* Employee Details */}
                <div className="flex items-start gap-2.5">
                  <div className="relative flex-shrink-0">
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt={user.name}
                        className="h-10 w-10 rounded-full object-cover ring-2 ring-white shadow-sm dark:ring-slate-800"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-800">
                        {initials}
                      </div>
                    )}
                    {/* Workload Indicator dot */}
                    <span
                      title={`${activeCount} active tasks`}
                      className={`absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-2 ring-white text-[9px] font-bold text-white dark:ring-slate-900 ${
                        activeCount > 3
                          ? 'bg-rose-500'
                          : activeCount > 0
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    >
                      {activeCount > 0 ? activeCount : '•'}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      title={user.name}
                      className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100"
                    >
                      {user.name}
                    </p>
                    <p
                      title={user.position || user.designation || user.role}
                      className="truncate text-[11px] text-slate-500 dark:text-slate-400"
                    >
                      {user.position || user.designation || user.role || 'Member'}
                    </p>

                    <span
                      className={`mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider ${
                        category === 'media'
                          ? 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300'
                          : category === 'dev'
                          ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300'
                          : category === 'smm'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {category}
                    </span>
                  </div>
                </div>

                {/* Bottom Quick-Assign Action */}
                <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {activeCount === 0 ? '✨ Idle' : `${activeCount} in progress`}
                  </span>

                  {canCreate ? (
                    <button
                      onClick={() => onQuickAssign && onQuickAssign(user)}
                      title={`Create task for ${user.name}`}
                      className="inline-flex h-6 items-center gap-1 rounded-md bg-indigo-50 px-2 text-[11px] font-semibold text-indigo-600 transition-all hover:bg-indigo-600 hover:text-white dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-600 dark:hover:text-white"
                    >
                      <Plus className="h-3 w-3 stroke-[2.5]" />
                      <span>Assign</span>
                    </button>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                      Team Member
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TeamQuickAssignRoster;
