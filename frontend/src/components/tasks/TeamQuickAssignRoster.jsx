import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Users,
  Video,
  Code2,
  Share2,
  ShieldCheck,
  Plus,
  ChevronDown,
  Search,
} from '@/components/ui/muiIcons';
import { getAssetUrl } from '../../utils/assetUrl';

const DEPARTMENT_OPTIONS = [
  { id: 'all', label: 'All Departments', shortLabel: 'All', icon: Users },
  { id: 'media', label: 'Media & Creative', shortLabel: 'Media', icon: Video },
  { id: 'dev', label: 'Developers & Tech', shortLabel: 'Dev', icon: Code2 },
  { id: 'smm', label: 'SMM & Growth', shortLabel: 'SMM', icon: Share2 },
  { id: 'management', label: 'Management', shortLabel: 'Management', icon: ShieldCheck },
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

const getDeptShortLabel = (catId) =>
  DEPARTMENT_OPTIONS.find((d) => d.id === catId)?.shortLabel || 'Team';

export const TeamQuickAssignRoster = ({
  users = [],
  tasks = [],
  onQuickAssign,
  canCreate = true,
}) => {
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const userWorkloadMap = useMemo(() => {
    const map = {};
    if (!Array.isArray(tasks)) return map;

    tasks.forEach((task) => {
      const isDone = ['completed', 'approved', 'done', 'Completed', 'Approved', 'Done'].includes(task.status);
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

  const teamMembers = useMemo(() => {
    if (!Array.isArray(users)) return [];
    return users.filter((u) => u.role !== 'client');
  }, [users]);

  const filteredUsers = useMemo(() => {
    return teamMembers.filter((user) => {
      const category = getEmployeeDepartmentCategory(user);
      if (selectedDept !== 'all' && category !== selectedDept) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = (user.name || '').toLowerCase().includes(q);
        const deptMatch = (user.department || '').toLowerCase().includes(q);
        const roleMatch = (user.position || user.designation || user.role || '').toLowerCase().includes(q);
        if (!nameMatch && !deptMatch && !roleMatch) return false;
      }
      return true;
    });
  }, [teamMembers, selectedDept, searchQuery]);

  const selectedMember = useMemo(
    () => teamMembers.find((u) => String(u._id) === String(selectedUserId)) || null,
    [teamMembers, selectedUserId]
  );

  return (
    <div className="rounded-2xl bg-card px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      {/* Compact Title */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Users className="h-4 w-4" />
        </div>
        <span className="text-sm font-bold text-foreground">Team Quick Assign</span>
      </div>

      {/* Simple Department + Team Dropdown + Direct (+) Button */}
      <div className="flex flex-wrap items-center gap-2 flex-1 sm:justify-end min-w-0">
        {/* Department Dropdown */}
        <select
          value={selectedDept}
          onChange={(e) => {
            setSelectedDept(e.target.value);
            setSelectedUserId('');
          }}
          aria-label="Filter team by department"
          className="h-9 rounded-xl bg-background px-3 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-brand/40 cursor-pointer"
        >
          {DEPARTMENT_OPTIONS.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.label}
            </option>
          ))}
        </select>

        {/* Team Member Dropdown with inline (+) Assign beside each name */}
        <div ref={dropdownRef} className="relative min-w-[230px] flex-1 sm:flex-initial">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="h-9 w-full sm:w-64 rounded-xl bg-background px-3 text-xs font-semibold text-foreground flex items-center justify-between gap-2 hover:bg-secondary/70 transition-colors cursor-pointer"
          >
            <span className="truncate">
              {selectedMember
                ? `${selectedMember.name} · ${getDeptShortLabel(getEmployeeDepartmentCategory(selectedMember))}`
                : `Team (${filteredUsers.length})`}
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-1.5 w-full sm:w-80 rounded-2xl bg-card shadow-xl ring-1 ring-foreground/10 z-40 overflow-hidden">
              {/* Quick search inside dropdown */}
              <div className="p-2 bg-secondary/30">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search member..."
                    className="h-8 w-full rounded-lg bg-background pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-brand/40"
                  />
                </div>
              </div>

              {/* Member List */}
              <div className="max-h-64 overflow-y-auto p-1.5 space-y-1 custom-scrollbar">
                {filteredUsers.length === 0 ? (
                  <div className="py-5 text-center text-xs text-muted-foreground">
                    No members found
                  </div>
                ) : (
                  filteredUsers.map((member) => {
                    const uid = member._id?.toString();
                    const activeCount =
                      (userWorkloadMap[uid] || 0) +
                      (userWorkloadMap[`name:${(member.name || '').toLowerCase()}`] || 0);
                    const deptCat = getEmployeeDepartmentCategory(member);
                    const deptLabel = member.department || getDeptShortLabel(deptCat);
                    const initials = (member.name || 'U')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();
                    const avatarSrc = member.avatar ? getAssetUrl(member.avatar) : null;

                    return (
                      <div
                        key={member._id}
                        onClick={() => {
                          setSelectedUserId(member._id);
                          setIsOpen(false);
                        }}
                        className={`flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 transition-colors cursor-pointer ${
                          String(selectedUserId) === String(member._id)
                            ? 'bg-secondary'
                            : 'hover:bg-secondary/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {avatarSrc ? (
                            <img
                              src={avatarSrc}
                              alt={member.name}
                              className="h-7 w-7 rounded-full object-cover shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                              {initials}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-foreground">
                              {member.name}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate">
                              <span className="truncate">{deptLabel}</span>
                              <span>·</span>
                              <span className="tabular-nums">{activeCount} active</span>
                            </div>
                          </div>
                        </div>

                        {canCreate && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUserId(member._id);
                              setIsOpen(false);
                              onQuickAssign && onQuickAssign(member);
                            }}
                            title={`Add task for ${member.name}`}
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Direct (+) button right next to dropdown when a member is picked (or opens dropdown if none) */}
        {canCreate && (
          <button
            type="button"
            onClick={() => {
              if (selectedMember) {
                onQuickAssign && onQuickAssign(selectedMember);
              } else {
                setIsOpen(true);
              }
            }}
            title={selectedMember ? `Add task for ${selectedMember.name}` : 'Select member to add task'}
            className="inline-flex h-9 items-center gap-1 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shrink-0"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Add</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default TeamQuickAssignRoster;
